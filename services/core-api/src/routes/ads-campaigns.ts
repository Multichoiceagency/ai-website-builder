import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  adsProviderIdSchema,
  campaignBriefSchema,
  campaignDraftSchema,
  campaignStatusSchema,
  changeBudgetInputSchema,
  publishCampaignInputSchema,
  updateCampaignInputSchema,
  uuidSchema,
  type AdsProviderStatus,
  type Campaign,
  type GuardrailViolation,
} from '@platform/schemas'
import { getAdsProvider, listAdsProviders } from '../adapters/ads/index.js'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import {
  deleteCampaign,
  findCampaignById,
  getGuardrails,
  insertCampaignDraft,
  listCampaigns,
  markCampaignPublished,
  recordAdsAudit,
  sumActiveDailyBudgetMinor,
  updateCampaign,
  updateCampaignBudget,
} from '../db/repositories/ads.js'
import { draftCampaign } from '../lib/ads/draft.js'
import { evaluateBudgetChange, evaluatePublishBudget } from '../lib/ads/guardrails.js'
import { providerContext, rethrowProviderFailure, statusFor } from '../lib/ads/provider-context.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant, type TenantContext } from '../plugins/auth.js'

/**
 * Campaigns: drafting, editing, publishing, budgets.
 *
 * The shape of this module is the safety model. Creating a campaign and
 * publishing one are different endpoints with different gates, because they are
 * different decisions: the first costs nothing, the second starts spending
 * (ADR-0007). No handler here can be talked into doing both.
 */

const campaignParamsSchema = z.object({ campaignId: uuidSchema })

/**
 * A write that touches spend either succeeded or was refused by a guardrail.
 *
 * A refusal is *returned*, never thrown from inside the transaction: throwing
 * would roll back the very row that records the refusal. The tag makes the two
 * outcomes impossible to confuse at the call site.
 */
type SpendOutcome = { ok: true; campaign: Campaign } | { ok: false; violation: GuardrailViolation }

const adsCampaignRoutes: FastifyPluginAsync = async (app) => {
  app.get('/campaigns', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const query = parseOrThrow(
      z.object({ provider: adsProviderIdSchema.optional(), status: campaignStatusSchema.optional() }),
      request.query ?? {},
      'query',
    )

    const result = await withTenant(context.tenantId, async (tx) => {
      const campaigns = await listCampaigns(tx, context.tenantId, query)

      // The statuses ride along with the data: an empty list means "there is
      // nothing" or "we cannot see anything", and the UI must be able to tell
      // those apart.
      const statuses: AdsProviderStatus[] = []
      for (const provider of listAdsProviders()) {
        if (query.provider && provider.id !== query.provider) continue
        statuses.push(provider.status(await providerContext(tx, context.tenantId, provider.id)))
      }

      return { providerStatuses: statuses, items: campaigns }
    })

    return reply.send(ok(result))
  })

  app.get('/campaigns/:campaignId', async (request, reply) => {
    const context = requireTenant(request, 'ads:read')
    const { campaignId } = parseOrThrow(campaignParamsSchema, request.params, 'campaign id')

    const campaign = await withTenant(context.tenantId, (tx) => findCampaignById(tx, context.tenantId, campaignId))
    // Another tenant's campaign is "not found", not "forbidden": the API does
    // not confirm that someone else's campaign exists.
    if (!campaign) throw new NotFoundError('Campaign')

    return reply.send(ok(campaign))
  })

  /**
   * Create a campaign by hand. It is a draft; there is no flag that makes it
   * anything else, and the table's constraints agree.
   */
  app.post('/campaigns', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const draft = parseOrThrow(campaignDraftSchema, request.body, 'campaign')

    const campaign = await withTenant(context.tenantId, async (tx) => {
      const created = await insertCampaignDraft(tx, {
        tenantId: context.tenantId,
        draft: { ...draft, source: draft.source === 'ai' ? 'ai' : 'manual' },
        createdBy: context.user.email,
      })
      await recordAuditEvent(tx, campaignEvent('campaign.created', context, created))
      return created
    })

    await eventBus.publish(campaignEvent('campaign.created', context, campaign))

    return reply.status(201).send(ok(campaign))
  })

  /**
   * AI campaign drafting (§20).
   *
   *   "Create a Google Ads campaign for emergency plumbers in Rotterdam"
   *
   * Returns a proposal — campaign, ad groups, keywords, negatives, ad variants,
   * extensions, targeting, suggested budget, landing page — plus the
   * assumptions it made. `requiresConfirmation` is a literal `true` in the
   * contract, so no client can be written that treats this as a publish.
   */
  app.post('/campaigns/draft-with-ai', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    // Drafting spends AI credits, so it needs the AI permission too — a role
    // that may manage ads is not automatically a role that may run models.
    requireTenant(request, 'ai:use')
    const brief = parseOrThrow(campaignBriefSchema, request.body, 'brief')

    const { draft, model } = await draftCampaign(brief)

    const result = await withTenant(context.tenantId, async (tx) => {
      const providerStatus = await statusFor(tx, context.tenantId, brief.provider)
      const envelope = { draft, model, riskClass: 'medium' as const, requiresConfirmation: true as const, providerStatus }

      if (!brief.save) return { ...envelope, campaignId: null }

      const created = await insertCampaignDraft(tx, {
        tenantId: context.tenantId,
        draft,
        createdBy: context.user.email,
      })

      // Attributed to the agent, on behalf of the user. That pairing is what
      // makes the audit log able to answer "did a human ask for this?".
      await recordAuditEvent(
        tx,
        campaignEvent('campaign.created', context, created, {
          type: 'agent',
          id: 'ads.campaign_drafter',
          label: model,
          onBehalfOfUserId: context.user.id,
        }),
      )

      return { ...envelope, campaignId: created.id }
    })

    return reply.status(201).send(ok(result))
  })

  /**
   * Edit a campaign.
   *
   * §84: a campaign that already exists on a network is not edited without
   * explicit permission, so `confirm` is mandatory once it has been published —
   * and the change goes to the network first, so our copy can never claim a
   * change the network refused.
   */
  app.patch('/campaigns/:campaignId', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { campaignId } = parseOrThrow(campaignParamsSchema, request.params, 'campaign id')
    const { confirm, ...patch } = parseOrThrow(updateCampaignInputSchema, request.body, 'campaign')

    const updated = await withTenant(context.tenantId, async (tx) => {
      const existing = await findCampaignById(tx, context.tenantId, campaignId)
      if (!existing) throw new NotFoundError('Campaign')

      if (existing.externalId && !confirm) {
        throw new ForbiddenError(
          'This campaign is live on the ad network. Confirm the change explicitly before it is applied.',
        )
      }

      if (existing.externalId) {
        const adapter = getAdsProvider(existing.provider)
        const providerCtx = await providerContext(tx, context.tenantId, existing.provider, { withSecrets: true })
        try {
          await adapter.updateCampaign(providerCtx, existing.externalId, {
            name: patch.name,
            status: patch.status,
            bidding: patch.bidding,
            geoTargets: patch.geoTargets,
            landingPageUrl: patch.landingPageUrl,
          })
        } catch (error) {
          rethrowProviderFailure(error)
        }
      }

      const result = await updateCampaign(tx, context.tenantId, campaignId, patch)
      if (!result) throw new NotFoundError('Campaign')

      await recordAdsAudit(tx, {
        tenantId: context.tenantId,
        name: 'ads.campaign_updated',
        actor: context.actor,
        resourceId: campaignId,
        payload: { fields: Object.keys(patch), live: Boolean(existing.externalId) },
      })

      return result
    })

    return reply.send(ok(updated))
  })

  /**
   * Publish a draft to the ad network. The gate everything else exists for.
   *
   * Four independent checks, all of which must pass: the caller holds
   * `ads:write`, the request carries an explicit confirmation, the budget it
   * confirms still matches the draft, and that budget clears the workspace
   * guardrails. Only then does the adapter get called.
   */
  app.post('/campaigns/:campaignId/publish', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { campaignId } = parseOrThrow(campaignParamsSchema, request.params, 'campaign id')
    const input = parseOrThrow(publishCampaignInputSchema, request.body, 'publish request')

    const outcome = await withTenant(context.tenantId, async (tx): Promise<SpendOutcome> => {
      const campaign = await findCampaignById(tx, context.tenantId, campaignId)
      if (!campaign) throw new NotFoundError('Campaign')

      if (campaign.status !== 'draft' || campaign.externalId) {
        throw new ConflictError('This campaign has already been published.')
      }

      // The confirmation is for a specific amount. If the draft moved since the
      // user last looked at it, this is no longer the thing they approved.
      if (input.acknowledgedBudgetMinor !== campaign.budget.amountMinor) {
        throw new ConflictError(
          'The budget changed since this draft was reviewed. Look at it again before publishing.',
          { confirmedMinor: input.acknowledgedBudgetMinor, currentMinor: campaign.budget.amountMinor },
        )
      }

      const guardrails = await getGuardrails(tx, context.tenantId)
      const otherActiveDailyMinor = await sumActiveDailyBudgetMinor(tx, context.tenantId, campaignId)
      const violation = evaluatePublishBudget({ guardrails, budget: campaign.budget, otherActiveDailyMinor })
      // Returned rather than thrown: throwing here would roll back this
      // transaction, taking the record of the refusal with it. The refusal is
      // audited outside, then reported.
      if (violation) return { ok: false, violation }

      const adapter = getAdsProvider(campaign.provider)
      const providerCtx = await providerContext(tx, context.tenantId, campaign.provider, { withSecrets: true })

      let remoteId = ''
      // Adapters create paused. We record what the network says it is, not what
      // we hoped it would be.
      let remoteStatus: Campaign['status'] = 'paused'
      try {
        const remote = await adapter.createCampaign(providerCtx, toDraftInput(campaign))
        remoteId = remote.externalId ?? ''
        remoteStatus = remote.status
      } catch (error) {
        rethrowProviderFailure(error)
      }

      if (!remoteId) {
        throw new ConflictError('The ad network accepted the campaign but returned no id, so it cannot be tracked.')
      }

      const result = await markCampaignPublished(tx, context.tenantId, campaignId, {
        externalId: remoteId,
        accountId: providerCtx.connection?.externalAccountId ?? campaign.accountId,
        status: remoteStatus,
        publishedBy: context.user.email,
      })
      if (!result) throw new ConflictError('This campaign has already been published.')

      await recordAuditEvent(tx, campaignEvent('campaign.published', context, result))
      return { ok: true, campaign: result }
    })

    if (!outcome.ok) {
      await recordRefusal(context, campaignId, { ...outcome.violation, at: 'publish' })
      throw new ConflictError(outcome.violation.message, outcome.violation)
    }

    await eventBus.publish(campaignEvent('campaign.published', context, outcome.campaign))

    return reply.send(ok(outcome.campaign))
  })

  /**
   * Change a budget. High risk (ADR-0007).
   *
   * Explicit confirmation, a mandatory reason, a guardrail ceiling that refuses
   * rather than warns, and an audit row either way — a refused increase is
   * recorded too, because "who kept trying to raise this" is exactly the
   * question an audit log should be able to answer.
   */
  app.post('/campaigns/:campaignId/budget', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { campaignId } = parseOrThrow(campaignParamsSchema, request.params, 'campaign id')
    const input = parseOrThrow(changeBudgetInputSchema, request.body, 'budget change')

    const outcome = await withTenant(context.tenantId, async (tx): Promise<SpendOutcome> => {
      const campaign = await findCampaignById(tx, context.tenantId, campaignId)
      if (!campaign) throw new NotFoundError('Campaign')

      const requested = {
        amountMinor: input.amountMinor,
        currency: campaign.budget.currency,
        period: input.period,
      }

      const guardrails = await getGuardrails(tx, context.tenantId)
      const otherActiveDailyMinor = await sumActiveDailyBudgetMinor(tx, context.tenantId, campaignId)
      const violation = evaluateBudgetChange({
        guardrails,
        current: campaign.budget,
        requested,
        otherActiveDailyMinor,
      })

      // Same reason as at publish: the refusal has to outlive the rollback.
      if (violation) return { ok: false, violation }

      if (campaign.externalId) {
        const adapter = getAdsProvider(campaign.provider)
        const providerCtx = await providerContext(tx, context.tenantId, campaign.provider, { withSecrets: true })
        try {
          await adapter.updateCampaign(providerCtx, campaign.externalId, { budget: requested })
        } catch (error) {
          rethrowProviderFailure(error)
        }
      }

      const result = await updateCampaignBudget(tx, context.tenantId, campaignId, requested)
      if (!result) throw new NotFoundError('Campaign')

      await recordAdsAudit(tx, {
        tenantId: context.tenantId,
        name: 'ads.budget_changed',
        actor: context.actor,
        resourceId: campaignId,
        payload: {
          fromMinor: campaign.budget.amountMinor,
          toMinor: requested.amountMinor,
          currency: requested.currency,
          period: requested.period,
          reason: input.reason,
          live: Boolean(campaign.externalId),
        },
      })

      return { ok: true, campaign: result }
    })

    if (!outcome.ok) {
      await recordRefusal(context, campaignId, { ...outcome.violation, reason: input.reason })
      throw new ConflictError(outcome.violation.message, outcome.violation)
    }

    return reply.send(ok(outcome.campaign))
  })

  /** Delete. Drafts only — a live campaign is paused on the network, not deleted here. */
  app.delete('/campaigns/:campaignId', async (request, reply) => {
    const context = requireTenant(request, 'ads:write')
    const { campaignId } = parseOrThrow(campaignParamsSchema, request.params, 'campaign id')

    await withTenant(context.tenantId, async (tx) => {
      const campaign = await findCampaignById(tx, context.tenantId, campaignId)
      if (!campaign) throw new NotFoundError('Campaign')

      if (campaign.externalId) {
        throw new ConflictError(
          'This campaign is live on the ad network. Pause it there first — deleting our copy would leave it spending unmonitored.',
        )
      }

      await deleteCampaign(tx, context.tenantId, campaignId)
    })

    return reply.send(ok({ deleted: true }))
  })
}

/**
 * Record a refused budget increase, in its own transaction.
 *
 * The attempt itself is rolled back — nothing was changed — but the *attempt*
 * is exactly what an audit log needs to keep. "Who kept trying to raise this
 * budget, and how far" is unanswerable if the only trace of a refusal dies with
 * the transaction that refused it.
 */
async function recordRefusal(
  context: TenantContext,
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await withTenant(context.tenantId, (tx) =>
    recordAdsAudit(tx, {
      tenantId: context.tenantId,
      name: 'ads.budget_change_refused',
      actor: context.actor,
      resourceId: campaignId,
      payload,
    }),
  )
}

/** A stored campaign as the create-campaign input the adapter expects. */
function toDraftInput(campaign: Campaign) {
  return campaignDraftSchema.parse({
    provider: campaign.provider,
    accountId: campaign.accountId,
    name: campaign.name,
    objective: campaign.objective,
    channel: campaign.channel,
    budget: campaign.budget,
    bidding: campaign.bidding,
    geoTargets: campaign.geoTargets,
    languages: campaign.languages,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    landingPageUrl: campaign.landingPageUrl,
    adGroups: campaign.adGroups,
    extensions: campaign.extensions,
    conversionEvents: campaign.conversionEvents,
    source: campaign.source,
    assumptions: campaign.assumptions,
    warnings: campaign.warnings,
  })
}

function campaignEvent(
  name: 'campaign.created' | 'campaign.published',
  context: TenantContext,
  campaign: Campaign,
  actor = context.actor,
) {
  return buildEvent({
    name,
    tenantId: context.tenantId,
    actor,
    resource: { type: 'ad_campaign', id: campaign.id },
    payload: {
      provider: campaign.provider,
      objective: campaign.objective,
      status: campaign.status,
      budgetMinor: campaign.budget.amountMinor,
      currency: campaign.budget.currency,
      source: campaign.source,
    },
  })
}

export default adsCampaignRoutes
