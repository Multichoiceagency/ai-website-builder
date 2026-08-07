/**
 * E-mail endpoints. Registered on the CRM router, because a campaign without
 * the contacts it sends to is not a product.
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createEmailCampaignInputSchema,
  createEmailFlowInputSchema,
  createEmailSegmentInputSchema,
  createEmailTemplateInputSchema,
  crmKeySchema,
  emailSegmentDefinitionSchema,
  emailSegmentSchema,
  sendTransactionalEmailInputSchema,
  updateEmailCampaignInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { upsertFlowAutomation } from '../db/repositories/automation.js'
import { listContactsForSend } from '../db/repositories/crm.js'
import {
  findEmailCampaignById,
  findEmailTemplateByKey,
  insertEmailCampaign,
  insertEmailSegment,
  listEmailCampaigns,
  listEmailFlows,
  listEmailMessages,
  listEmailSegments,
  listEmailTemplates,
  setEmailFlowEnabled,
  updateEmailCampaign,
  upsertEmailFlow,
  upsertEmailTemplate,
} from '../db/repositories/email.js'
import { emitCrmEvent } from '../lib/crm/events.js'
import { emailProviderStatus } from '../lib/email/index.js'
import { compileFlowToGraph } from '../lib/email/flow-compiler.js'
import { DEFAULT_EMAIL_FLOWS } from '../lib/email/flow-defaults.js'
import { contactVariables, renderEmail } from '../lib/email/render.js'
import { countSegmentMembers } from '../lib/email/segments.js'
import { idempotencyKey, sendCampaign, sendEmail } from '../lib/email/send.js'
import { BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const campaignParams = z.object({ campaignId: uuidSchema })
const flowParams = z.object({ flowKey: crmKeySchema })

const crmEmailRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Whether this installation can actually send. The dashboard renders this
   * verbatim — an environment with no SMTP credentials says so instead of
   * offering a Send button that quietly logs.
   */
  app.get('/email/status', async (request, reply) => {
    requireTenant(request, 'email:read')
    return reply.send(ok(emailProviderStatus()))
  })

  // ---------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------

  app.get('/email/templates', async (request, reply) => {
    const context = requireTenant(request, 'email:read')
    const templates = await withTenant(context.tenantId, (tx) => listEmailTemplates(tx, context.tenantId))
    return reply.send(ok(templates))
  })

  /** Upsert by key: a template is addressed by name from flows and automations. */
  app.put('/email/templates', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const input = parseOrThrow(createEmailTemplateInputSchema, request.body, 'template')

    const template = await withTenant(context.tenantId, (tx) =>
      upsertEmailTemplate(tx, context.tenantId, input),
    )
    return reply.send(ok(template))
  })

  // ---------------------------------------------------------------------
  // Segments
  // ---------------------------------------------------------------------

  app.get('/email/segments', async (request, reply) => {
    const context = requireTenant(request, 'email:read')

    const segments = await withTenant(context.tenantId, async (tx) => {
      const stored = await listEmailSegments(tx, context.tenantId)
      if (!stored.length) return stored

      // Membership is computed now, never stored: a segment that reports a
      // count from last week is worse than no count at all.
      const contacts = await listContactsForSend(tx, context.tenantId, { requireConsent: false })
      return stored.map((segment) =>
        emailSegmentSchema.parse({
          ...segment,
          memberCount: countSegmentMembers(contacts, emailSegmentDefinitionSchema.parse(segment.definition)),
        }),
      )
    })

    return reply.send(ok(segments))
  })

  app.post('/email/segments', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const input = parseOrThrow(createEmailSegmentInputSchema, request.body, 'segment')

    const segment = await withTenant(context.tenantId, (tx) =>
      insertEmailSegment(tx, context.tenantId, {
        name: input.name,
        description: input.description,
        definition: emailSegmentDefinitionSchema.parse(input.definition ?? {}),
      }),
    )
    return reply.status(201).send(ok(segment))
  })

  // ---------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------

  app.get('/email/campaigns', async (request, reply) => {
    const context = requireTenant(request, 'email:read')
    const campaigns = await withTenant(context.tenantId, (tx) => listEmailCampaigns(tx, context.tenantId))
    return reply.send(ok(campaigns))
  })

  app.post('/email/campaigns', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const input = parseOrThrow(createEmailCampaignInputSchema, request.body, 'campaign')

    const campaign = await withTenant(context.tenantId, (tx) =>
      insertEmailCampaign(tx, context.tenantId, {
        ...input,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      }),
    )
    return reply.status(201).send(ok(campaign))
  })

  app.get('/email/campaigns/:campaignId', async (request, reply) => {
    const context = requireTenant(request, 'email:read')
    const { campaignId } = parseOrThrow(campaignParams, request.params, 'campaign id')

    const detail = await withTenant(context.tenantId, async (tx) => {
      const campaign = await findEmailCampaignById(tx, context.tenantId, campaignId)
      if (!campaign) return null
      return { campaign, messages: await listEmailMessages(tx, context.tenantId, { campaignId, limit: 50 }) }
    })
    if (!detail) throw new NotFoundError('Campaign')

    return reply.send(ok(detail))
  })

  app.patch('/email/campaigns/:campaignId', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const { campaignId } = parseOrThrow(campaignParams, request.params, 'campaign id')
    const patch = parseOrThrow(updateEmailCampaignInputSchema, request.body, 'campaign')

    const campaign = await withTenant(context.tenantId, (tx) =>
      updateEmailCampaign(tx, context.tenantId, campaignId, {
        ...patch,
        scheduledAt: patch.scheduledAt ? new Date(patch.scheduledAt) : null,
      }),
    )
    // A sent campaign is history. The repository refuses the update rather
    // than letting the record disagree with what people received.
    if (!campaign) throw new NotFoundError('Editable campaign')

    return reply.send(ok(campaign))
  })

  /**
   * Send. Idempotent per (campaign, contact), so re-running a campaign that
   * failed halfway resumes it instead of mailing the first half twice.
   */
  app.post('/email/campaigns/:campaignId/send', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const { campaignId } = parseOrThrow(campaignParams, request.params, 'campaign id')

    const result = await sendCampaign(context.tenantId, campaignId)
    if (!result) throw new NotFoundError('Campaign')

    await emitCrmEvent({
      name: 'email.campaign_sent',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'email_campaign', id: campaignId },
      payload: { campaignId, ...result.stats, delivered: result.delivered },
    })

    return reply.send(
      ok({
        campaign: result.campaign,
        stats: result.stats,
        // False means the console provider handled it. The UI has to say so.
        delivered: result.delivered,
        provider: emailProviderStatus(),
      }),
    )
  })

  // ---------------------------------------------------------------------
  // Transactional
  // ---------------------------------------------------------------------

  app.post('/email/transactional', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const input = parseOrThrow(sendTransactionalEmailInputSchema, request.body, 'message')

    const template = input.templateKey
      ? await withTenant(context.tenantId, (tx) =>
          findEmailTemplateByKey(tx, context.tenantId, input.templateKey!),
        )
      : null

    const rendered = renderEmail(
      {
        subject: input.subject ?? template?.subject ?? '',
        bodyHtml: input.bodyHtml ?? template?.bodyHtml ?? '',
        bodyText: input.bodyText ?? template?.bodyText ?? '',
      },
      { ...contactVariables({ email: input.to }), ...input.variables },
    )
    if (!rendered.subject) throw new BadRequestError('A message needs a subject, or a template that has one.')

    const outcome = await sendEmail(context.tenantId, {
      kind: 'transactional',
      to: input.to,
      toName: input.toName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      // Without a caller key, one send per recipient+subject+minute: enough to
      // absorb a double-clicked button, not enough to block a real resend.
      idempotencyKey:
        input.idempotencyKey ??
        idempotencyKey('transactional', input.to, rendered.subject, String(Math.floor(Date.now() / 60_000))),
      contactId: input.contactId ?? null,
    })

    return reply.send(ok({ ...outcome, provider: emailProviderStatus() }))
  })

  app.get('/email/messages', async (request, reply) => {
    const context = requireTenant(request, 'email:read')
    const query = parseOrThrow(
      z.object({ campaignId: uuidSchema.optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }),
      request.query ?? {},
      'query',
    )

    const messages = await withTenant(context.tenantId, (tx) =>
      listEmailMessages(tx, context.tenantId, { campaignId: query.campaignId, limit: query.limit }),
    )
    return reply.send(ok(messages))
  })

  // ---------------------------------------------------------------------
  // Flows
  // ---------------------------------------------------------------------

  app.get('/email/flows', async (request, reply) => {
    const context = requireTenant(request, 'email:read')
    const flows = await withTenant(context.tenantId, (tx) => listEmailFlows(tx, context.tenantId))
    return reply.send(ok(flows))
  })

  app.put('/email/flows', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const input = parseOrThrow(createEmailFlowInputSchema, request.body, 'flow')

    const flow = await withTenant(context.tenantId, (tx) => upsertEmailFlow(tx, context.tenantId, input))
    return reply.send(ok(flow))
  })

  /** Install the five flows from §30 as editable, disabled definitions. */
  app.post('/email/flows/install-defaults', async (request, reply) => {
    const context = requireTenant(request, 'email:write')

    const flows = await withTenant(context.tenantId, async (tx) => {
      const installed = []
      for (const definition of DEFAULT_EMAIL_FLOWS) {
        installed.push(await upsertEmailFlow(tx, context.tenantId, { ...definition, enabled: false }))
      }
      return installed
    })

    return reply.status(201).send(ok(flows))
  })

  /**
   * Enable or disable a flow.
   *
   * Enabling compiles the flow into an automation and activates it; disabling
   * pauses the same automation. The flow row stays the definition — this is
   * what makes the toggle mean something, instead of setting a boolean that
   * nothing reads.
   */
  app.post('/email/flows/:flowKey/enable', async (request, reply) => {
    const context = requireTenant(request, 'email:write')
    const { flowKey } = parseOrThrow(flowParams, request.params, 'flow key')
    const input = parseOrThrow(z.object({ enabled: z.boolean() }), request.body ?? {}, 'flow state')

    const result = await withTenant(context.tenantId, async (tx) => {
      const flow = await setEmailFlowEnabled(tx, context.tenantId, flowKey, input.enabled)
      if (!flow) return null

      if (!flow.steps.length) {
        throw new BadRequestError('A flow needs at least one step before it can be enabled.')
      }
      if (input.enabled && !flow.triggerEvent) {
        throw new BadRequestError('A flow needs a trigger event before it can be enabled.')
      }

      const automation = await upsertFlowAutomation(tx, context.tenantId, {
        flowId: flow.id,
        name: `Flow: ${flow.name}`,
        description: flow.description,
        status: input.enabled ? 'active' : 'paused',
        triggerEvent: flow.triggerEvent,
        graph: compileFlowToGraph(flow),
      })

      return { flow, automation }
    })
    if (!result) throw new NotFoundError('Flow')

    return reply.send(ok(result))
  })
}

export default crmEmailRoutes
