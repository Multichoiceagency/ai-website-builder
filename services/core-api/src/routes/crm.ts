import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createCrmCompanyInputSchema,
  createCrmContactInputSchema,
  createCrmDealInputSchema,
  createCrmLeadInputSchema,
  createCrmNoteInputSchema,
  createCrmTaskInputSchema,
  crmContactExportSchema,
  crmLeadStatusSchema,
  crmOverviewSchema,
  crmTaskStatusSchema,
  leadFromFormInputSchema,
  moveCrmDealInputSchema,
  updateCrmContactInputSchema,
  updateCrmDealInputSchema,
  updateCrmLeadInputSchema,
  updateCrmTaskInputSchema,
  uuidSchema,
  type Actor,
} from '@platform/schemas'
import { withTenant, withoutTenant } from '../db/client.js'
import { resolveSiteByHost } from '../db/repositories/sites.js'
import {
  crmAggregates,
  eraseContact,
  findCompanyById,
  findContactById,
  findLeadById,
  insertCompany,
  insertContact,
  listCompanies,
  listContacts,
  listLeads,
  updateContact,
  updateLead,
} from '../db/repositories/crm.js'
import {
  averageTimeInStage,
  ensureDefaultPipeline,
  findDealById,
  findStageByKey,
  insertDeal,
  listDeals,
  listPipelines,
  moveDealToStage,
  updateDeal,
} from '../db/repositories/crm-deals.js'
import {
  insertActivity,
  insertNote,
  insertTask,
  listActivities,
  listNotes,
  listTasks,
  updateTask,
} from '../db/repositories/crm-activity.js'
import { listEmailMessages } from '../db/repositories/email.js'
import { buildPipelineBoard } from '../lib/crm/board.js'
import { emitCrmEvent } from '../lib/crm/events.js'
import { createLeadFromSubmission } from '../lib/crm/leads.js'
import { consumeToken } from '../lib/crm/throttle.js'
import { subscribeAutomationsToEvents } from '../lib/automation/dispatch.js'
import { AppError, BadRequestError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'
import crmEmailRoutes from './crm-email.js'
import crmAutomationRoutes from './crm-automations.js'

const contactParams = z.object({ contactId: uuidSchema })
const leadParams = z.object({ leadId: uuidSchema })
const dealParams = z.object({ dealId: uuidSchema })
const taskParams = z.object({ taskId: uuidSchema })

const listQuery = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const leadListQuery = listQuery.extend({ status: crmLeadStatusSchema.optional() })
const taskListQuery = listQuery.extend({ status: crmTaskStatusSchema.optional() })

const crmRoutes: FastifyPluginAsync = async (app) => {
  // Automations listen on the shared event stream (§8). Registering here keeps
  // `app.ts` free of module wiring; the call is idempotent.
  subscribeAutomationsToEvents()

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------

  app.get('/overview', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const aggregates = await withTenant(context.tenantId, (tx) => crmAggregates(tx, context.tenantId))
    return reply.send(ok(crmOverviewSchema.parse({ ...aggregates, currency: 'EUR' })))
  })

  // ---------------------------------------------------------------------
  // Companies
  // ---------------------------------------------------------------------

  app.get('/companies', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const companies = await withTenant(context.tenantId, (tx) => listCompanies(tx, context.tenantId))
    return reply.send(ok(companies))
  })

  app.post('/companies', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createCrmCompanyInputSchema, request.body, 'company')

    const company = await withTenant(context.tenantId, (tx) => insertCompany(tx, context.tenantId, input))
    return reply.status(201).send(ok(company))
  })

  // ---------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------

  app.get('/contacts', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(listQuery, request.query ?? {}, 'query')

    const contacts = await withTenant(context.tenantId, (tx) =>
      listContacts(tx, context.tenantId, { search: query.search, limit: query.limit, offset: query.offset }),
    )
    return reply.send(ok(contacts))
  })

  app.post('/contacts', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createCrmContactInputSchema, request.body, 'contact')

    const contact = await withTenant(context.tenantId, (tx) =>
      insertContact(tx, context.tenantId, { ...input, consent: input.consent }),
    )
    return reply.status(201).send(ok(contact))
  })

  /** The contact timeline: the record plus everything that has happened to it. */
  app.get('/contacts/:contactId', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { contactId } = parseOrThrow(contactParams, request.params, 'contact id')

    const detail = await withTenant(context.tenantId, async (tx) => {
      const contact = await findContactById(tx, context.tenantId, contactId)
      if (!contact) return null

      const [activities, notes, tasks, deals, messages] = await Promise.all([
        listActivities(tx, context.tenantId, { contactId }),
        listNotes(tx, context.tenantId, { contactId }),
        listTasks(tx, context.tenantId, { contactId }),
        listDeals(tx, context.tenantId, {}),
        listEmailMessages(tx, context.tenantId, { contactId, limit: 25 }),
      ])

      return {
        contact,
        activities,
        notes,
        tasks,
        deals: deals.filter((deal) => deal.contactId === contactId),
        emails: messages,
      }
    })
    if (!detail) throw new NotFoundError('Contact')

    return reply.send(ok(detail))
  })

  app.patch('/contacts/:contactId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { contactId } = parseOrThrow(contactParams, request.params, 'contact id')
    const patch = parseOrThrow(updateCrmContactInputSchema, request.body, 'contact')

    const contact = await withTenant(context.tenantId, (tx) =>
      updateContact(tx, context.tenantId, contactId, { ...patch, consent: patch.consent }),
    )
    if (!contact) throw new NotFoundError('Contact')

    return reply.send(ok(contact))
  })

  /**
   * Erasure (§97). Irreversible: the record and everything that is *about* the
   * person goes.
   *
   * The trace it leaves is a detached CRM activity — `contact_id` is null, so
   * it survives the cascade that removes the contact's own timeline. There is
   * no domain event for erasure, and inventing one out of an unrelated name
   * would put a lie in the audit log; the whole point of this record is that
   * it stays true after the data is gone. It holds the id and the operator,
   * never the erased data.
   */
  app.delete('/contacts/:contactId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { contactId } = parseOrThrow(contactParams, request.params, 'contact id')

    const deleted = await withTenant(context.tenantId, async (tx) => {
      const removed = await eraseContact(tx, context.tenantId, contactId)
      if (!removed) return false

      await insertActivity(tx, context.tenantId, {
        type: 'system',
        subject: 'Contact erased',
        body: 'Erased on request under the right to erasure.',
        metadata: { contactId, reason: 'gdpr_erasure' },
        createdBy: context.user.email,
      })
      return true
    })
    if (!deleted) throw new NotFoundError('Contact')

    return reply.send(ok({ deleted: true }))
  })

  /** Subject access (§97): everything held about one person, in one document. */
  app.get('/contacts/:contactId/export', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { contactId } = parseOrThrow(contactParams, request.params, 'contact id')

    const payload = await withTenant(context.tenantId, async (tx) => {
      const contact = await findContactById(tx, context.tenantId, contactId)
      if (!contact) return null

      const [activities, notes, tasks, deals, leads, emails] = await Promise.all([
        listActivities(tx, context.tenantId, { contactId }),
        listNotes(tx, context.tenantId, { contactId }),
        listTasks(tx, context.tenantId, { contactId }),
        listDeals(tx, context.tenantId, {}),
        listLeads(tx, context.tenantId, { limit: 200 }),
        listEmailMessages(tx, context.tenantId, { contactId, limit: 500 }),
      ])

      return crmContactExportSchema.parse({
        exportedAt: new Date().toISOString(),
        contact,
        leads: leads.filter((lead) => lead.contactId === contactId),
        deals: deals.filter((deal) => deal.contactId === contactId),
        activities,
        notes,
        tasks,
        emails,
      })
    })
    if (!payload) throw new NotFoundError('Contact')

    reply.header('cache-control', 'no-store')
    return reply.send(ok(payload))
  })

  app.post('/contacts/:contactId/notes', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { contactId } = parseOrThrow(contactParams, request.params, 'contact id')
    const input = parseOrThrow(createCrmNoteInputSchema, request.body, 'note')

    const note = await withTenant(context.tenantId, async (tx) => {
      const contact = await findContactById(tx, context.tenantId, contactId)
      if (!contact) throw new NotFoundError('Contact')

      return insertNote(tx, context.tenantId, {
        body: input.body,
        contactId,
        dealId: input.dealId ?? null,
        createdBy: context.user.email,
      })
    })

    return reply.status(201).send(ok(note))
  })

  // ---------------------------------------------------------------------
  // Leads
  // ---------------------------------------------------------------------

  app.get('/leads', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(leadListQuery, request.query ?? {}, 'query')

    const leads = await withTenant(context.tenantId, (tx) =>
      listLeads(tx, context.tenantId, {
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      }),
    )
    return reply.send(ok(leads))
  })

  /**
   * The storefront form endpoint.
   *
   * Unauthenticated when it carries a `host`: the tenant comes from
   * `resolve_site_by_host`, the same verified-domain lookup the public page
   * read uses. A tenant id in the body is never trusted, because that would be
   * an anonymous write into any workspace.
   */
  app.post('/leads/from-form', async (request, reply) => {
    const input = parseOrThrow(leadFromFormInputSchema, request.body, 'form submission')

    // Honeypot. Accepted and dropped: telling a bot it was detected only
    // teaches it which field to leave alone next time.
    if (input.botField?.trim()) return reply.status(202).send(ok({ received: true }))

    const anonymous = Boolean(input.host)
    let tenantId: string
    let siteId: string | null = null
    let actor: Actor

    if (anonymous) {
      const throttle = consumeToken(`form:${request.ip}`, 20, 60)
      if (!throttle.allowed) {
        reply.header('retry-after', String(throttle.retryAfterSeconds))
        throw new AppError(429, 'rate_limited', 'Too many submissions. Try again shortly.')
      }

      const hostname = input.host!.split(':')[0]!.toLowerCase()
      const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
      if (!resolved) throw new NotFoundError('Site for this hostname')

      tenantId = resolved.tenantId
      siteId = resolved.siteId
      actor = { type: 'system', id: null, label: `form:${hostname}` }
    } else {
      const context = requireTenant(request, 'crm:write')
      tenantId = context.tenantId
      actor = context.actor
    }

    if (!input.email && !input.phone) {
      throw new BadRequestError('A form submission needs an e-mail address or a phone number.')
    }

    const result = await withTenant(tenantId, (tx) =>
      createLeadFromSubmission(tx, tenantId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        companyName: input.companyName,
        source: 'form',
        sourceDetail: input.formKey,
        siteId,
        consent: input.consent,
        consentSource: input.formKey,
        attribution: input.attribution,
        fields: input.fields,
      }),
    )

    await emitCrmEvent({
      name: 'lead.created',
      tenantId,
      actor,
      resource: { type: 'crm_lead', id: result.lead.id },
      payload: {
        leadId: result.lead.id,
        contactId: result.contact?.id ?? null,
        source: 'form',
        formKey: input.formKey,
        score: result.score,
        siteId,
      },
    })

    // An anonymous caller gets an acknowledgement, not the CRM record.
    if (anonymous) return reply.status(201).send(ok({ received: true }))
    return reply.status(201).send(ok(result.lead))
  })

  app.post('/leads', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createCrmLeadInputSchema, request.body, 'lead')

    const result = await withTenant(context.tenantId, (tx) =>
      createLeadFromSubmission(tx, context.tenantId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        message: input.message,
        companyName: input.companyName,
        source: input.source ?? 'manual',
        sourceDetail: input.sourceDetail,
        siteId: input.siteId ?? null,
        attribution: input.attribution,
        fields: input.fields,
      }),
    )

    await emitCrmEvent({
      name: 'lead.created',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'crm_lead', id: result.lead.id },
      payload: {
        leadId: result.lead.id,
        contactId: result.contact?.id ?? null,
        source: input.source ?? 'manual',
        score: result.score,
      },
    })

    return reply.status(201).send(ok(result.lead))
  })

  app.get('/leads/:leadId', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { leadId } = parseOrThrow(leadParams, request.params, 'lead id')

    const lead = await withTenant(context.tenantId, (tx) => findLeadById(tx, context.tenantId, leadId))
    if (!lead) throw new NotFoundError('Lead')

    return reply.send(ok(lead))
  })

  app.patch('/leads/:leadId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { leadId } = parseOrThrow(leadParams, request.params, 'lead id')
    const patch = parseOrThrow(updateCrmLeadInputSchema, request.body, 'lead')

    const lead = await withTenant(context.tenantId, (tx) => updateLead(tx, context.tenantId, leadId, patch))
    if (!lead) throw new NotFoundError('Lead')

    if (patch.status === 'qualified') {
      await emitCrmEvent({
        name: 'lead.qualified',
        tenantId: context.tenantId,
        actor: context.actor,
        resource: { type: 'crm_lead', id: lead.id },
        payload: { leadId: lead.id, contactId: lead.contactId, score: lead.score },
      })
    }

    return reply.send(ok(lead))
  })

  /**
   * Qualify a lead and open a deal for it, in one transaction — the two halves
   * of "this is real work now" should never come apart.
   */
  app.post('/leads/:leadId/convert', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { leadId } = parseOrThrow(leadParams, request.params, 'lead id')
    const input = parseOrThrow(
      z.object({ title: z.string().max(200).optional(), valueCents: z.number().int().min(0).default(0) }),
      request.body ?? {},
      'conversion',
    )

    const result = await withTenant(context.tenantId, async (tx) => {
      const lead = await findLeadById(tx, context.tenantId, leadId)
      if (!lead) return null

      const pipeline = await ensureDefaultPipeline(tx, context.tenantId)
      const stage = pipeline.stages.find((candidate) => candidate.key === 'new') ?? pipeline.stages[0]
      if (!stage) return null

      const deal = await insertDeal(tx, context.tenantId, {
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: input.title?.trim() || lead.name || lead.email || 'New deal',
        valueCents: input.valueCents,
        contactId: lead.contactId,
        companyId: lead.companyId,
        leadId: lead.id,
      })

      const updated = await updateLead(tx, context.tenantId, leadId, { status: 'converted' })
      return { deal, lead: updated ?? lead }
    })
    if (!result) throw new NotFoundError('Lead')

    await emitCrmEvent({
      name: 'lead.qualified',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'crm_lead', id: leadId },
      payload: { leadId, dealId: result.deal.id, contactId: result.lead.contactId },
    })

    return reply.status(201).send(ok(result))
  })

  // ---------------------------------------------------------------------
  // Pipeline and deals
  // ---------------------------------------------------------------------

  app.get('/pipelines', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const pipelines = await withTenant(context.tenantId, async (tx) => {
      await ensureDefaultPipeline(tx, context.tenantId)
      return listPipelines(tx, context.tenantId)
    })
    return reply.send(ok(pipelines))
  })

  /** The board: stages, their deals, and the weighted forecast over all of it. */
  app.get('/pipeline', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(
      z.object({ pipelineId: uuidSchema.optional() }),
      request.query ?? {},
      'query',
    )

    const board = await withTenant(context.tenantId, async (tx) => {
      const pipeline = query.pipelineId
        ? (await listPipelines(tx, context.tenantId)).find((candidate) => candidate.id === query.pipelineId)
        : await ensureDefaultPipeline(tx, context.tenantId)
      if (!pipeline) return null

      const [deals, averages] = await Promise.all([
        listDeals(tx, context.tenantId, { pipelineId: pipeline.id }),
        averageTimeInStage(tx, context.tenantId),
      ])

      return buildPipelineBoard(pipeline, deals, averages)
    })
    if (!board) throw new NotFoundError('Pipeline')

    return reply.send(ok(board))
  })

  app.post('/deals', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createCrmDealInputSchema, request.body, 'deal')

    const deal = await withTenant(context.tenantId, async (tx) => {
      const pipeline = input.pipelineId
        ? (await listPipelines(tx, context.tenantId)).find((candidate) => candidate.id === input.pipelineId)
        : await ensureDefaultPipeline(tx, context.tenantId)
      if (!pipeline) throw new NotFoundError('Pipeline')

      const stage =
        pipeline.stages.find((candidate) => candidate.key === (input.stageKey ?? 'new')) ?? pipeline.stages[0]
      if (!stage) throw new NotFoundError('Stage')

      if (input.contactId) {
        const contact = await findContactById(tx, context.tenantId, input.contactId)
        if (!contact) throw new NotFoundError('Contact')
      }
      if (input.companyId) {
        const company = await findCompanyById(tx, context.tenantId, input.companyId)
        if (!company) throw new NotFoundError('Company')
      }

      return insertDeal(tx, context.tenantId, {
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: input.title,
        valueCents: input.valueCents,
        currency: input.currency,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        leadId: input.leadId ?? null,
        expectedCloseOn: input.expectedCloseOn ?? null,
      })
    })

    return reply.status(201).send(ok(deal))
  })

  app.get('/deals/:dealId', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const { dealId } = parseOrThrow(dealParams, request.params, 'deal id')

    const detail = await withTenant(context.tenantId, async (tx) => {
      const deal = await findDealById(tx, context.tenantId, dealId)
      if (!deal) return null

      const [activities, notes] = await Promise.all([
        listActivities(tx, context.tenantId, { dealId }),
        listNotes(tx, context.tenantId, { dealId }),
      ])
      return { deal, activities, notes }
    })
    if (!detail) throw new NotFoundError('Deal')

    return reply.send(ok(detail))
  })

  app.patch('/deals/:dealId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { dealId } = parseOrThrow(dealParams, request.params, 'deal id')
    const patch = parseOrThrow(updateCrmDealInputSchema, request.body, 'deal')

    const deal = await withTenant(context.tenantId, (tx) =>
      updateDeal(tx, context.tenantId, dealId, {
        title: patch.title,
        valueCents: patch.valueCents,
        expectedCloseOn: patch.expectedCloseOn ?? undefined,
        contactId: patch.contactId ?? undefined,
      }),
    )
    if (!deal) throw new NotFoundError('Deal')

    return reply.send(ok(deal))
  })

  /**
   * Move a deal between stages — what the board's drag-and-drop calls.
   *
   * The stage transition, the derived status, the stage clock and the history
   * entry all happen in one transaction; `deal.won` is published only after it
   * committed.
   */
  app.post('/deals/:dealId/move', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { dealId } = parseOrThrow(dealParams, request.params, 'deal id')
    const input = parseOrThrow(moveCrmDealInputSchema, request.body, 'stage move')

    const moved = await withTenant(context.tenantId, async (tx) => {
      const deal = await findDealById(tx, context.tenantId, dealId)
      if (!deal) return null

      const stage = await findStageByKey(tx, context.tenantId, deal.pipelineId, input.stageKey)
      if (!stage) throw new NotFoundError('Stage')

      const result = await moveDealToStage(tx, context.tenantId, dealId, stage, {
        reason: input.reason,
        createdBy: context.user.email,
      })
      if (!result) return null

      await tx`
        INSERT INTO crm_activities (tenant_id, type, contact_id, deal_id, subject, body, created_by)
        VALUES (
          ${context.tenantId}, 'stage_change', ${result.deal.contactId}, ${dealId},
          ${`Moved to ${stage.name}`}, ${input.reason ?? ''}, ${context.user.email}
        )
      `

      return result
    })
    if (!moved) throw new NotFoundError('Deal')

    if (moved.deal.status === 'won') {
      await emitCrmEvent({
        name: 'deal.won',
        tenantId: context.tenantId,
        actor: context.actor,
        resource: { type: 'crm_deal', id: moved.deal.id },
        payload: {
          dealId: moved.deal.id,
          contactId: moved.deal.contactId,
          valueCents: moved.deal.valueCents,
          currency: moved.deal.currency,
        },
      })
    }

    return reply.send(ok(moved.deal))
  })

  // ---------------------------------------------------------------------
  // Tasks and activity
  // ---------------------------------------------------------------------

  app.get('/tasks', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(taskListQuery, request.query ?? {}, 'query')

    const tasks = await withTenant(context.tenantId, (tx) =>
      listTasks(tx, context.tenantId, { status: query.status, limit: query.limit }),
    )
    return reply.send(ok(tasks))
  })

  app.post('/tasks', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const input = parseOrThrow(createCrmTaskInputSchema, request.body, 'task')

    const task = await withTenant(context.tenantId, (tx) =>
      insertTask(tx, context.tenantId, {
        title: input.title,
        description: input.description,
        priority: input.priority,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      }),
    )
    return reply.status(201).send(ok(task))
  })

  app.patch('/tasks/:taskId', async (request, reply) => {
    const context = requireTenant(request, 'crm:write')
    const { taskId } = parseOrThrow(taskParams, request.params, 'task id')
    const patch = parseOrThrow(updateCrmTaskInputSchema, request.body, 'task')

    const task = await withTenant(context.tenantId, (tx) =>
      updateTask(tx, context.tenantId, taskId, {
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        dueAt: patch.dueAt ? new Date(patch.dueAt) : undefined,
      }),
    )
    if (!task) throw new NotFoundError('Task')

    return reply.send(ok(task))
  })

  app.get('/activities', async (request, reply) => {
    const context = requireTenant(request, 'crm:read')
    const query = parseOrThrow(listQuery, request.query ?? {}, 'query')

    const activities = await withTenant(context.tenantId, (tx) =>
      listActivities(tx, context.tenantId, { limit: query.limit }),
    )
    return reply.send(ok(activities))
  })

  // Email and automations are separate modules on the same router: they are
  // the same product surface, and splitting the prefix would only make the
  // dashboard call two base URLs for one screen.
  await app.register(crmEmailRoutes)
  await app.register(crmAutomationRoutes)
}

export default crmRoutes
