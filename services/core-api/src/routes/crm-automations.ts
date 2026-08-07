/**
 * Automation endpoints (§31).
 *
 * The graph is validated against `automationGraphSchema` before it can be
 * stored, so a dangling edge or an action node without an action is a 400 at
 * authoring time rather than a run that stops halfway through next Tuesday.
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createAutomationInputSchema,
  triggerAutomationInputSchema,
  updateAutomationInputSchema,
  uuidSchema,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import {
  deleteAutomation,
  findAutomationById,
  findAutomationRunById,
  insertAutomation,
  listAutomationRuns,
  listAutomations,
  listResumableRuns,
  updateAutomation,
} from '../db/repositories/automation.js'
import { AUTOMATION_TRIGGER_EVENTS, triggerAutomation } from '../lib/automation/dispatch.js'
import { executeAutomationRun } from '../lib/automation/runner.js'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const automationParams = z.object({ automationId: uuidSchema })
const runParams = z.object({ runId: uuidSchema })

const crmAutomationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/automations', async (request, reply) => {
    const context = requireTenant(request, 'automation:read')
    const automations = await withTenant(context.tenantId, (tx) => listAutomations(tx, context.tenantId))

    return reply.send(ok({ automations, triggerEvents: AUTOMATION_TRIGGER_EVENTS }))
  })

  app.post('/automations', async (request, reply) => {
    const context = requireTenant(request, 'automation:write')
    const input = parseOrThrow(createAutomationInputSchema, request.body, 'automation')

    const automation = await withTenant(context.tenantId, (tx) =>
      insertAutomation(tx, context.tenantId, input),
    )
    return reply.status(201).send(ok(automation))
  })

  app.get('/automations/:automationId', async (request, reply) => {
    const context = requireTenant(request, 'automation:read')
    const { automationId } = parseOrThrow(automationParams, request.params, 'automation id')

    const detail = await withTenant(context.tenantId, async (tx) => {
      const automation = await findAutomationById(tx, context.tenantId, automationId)
      if (!automation) return null
      return { automation, runs: await listAutomationRuns(tx, context.tenantId, { automationId, limit: 25 }) }
    })
    if (!detail) throw new NotFoundError('Automation')

    return reply.send(ok(detail))
  })

  app.patch('/automations/:automationId', async (request, reply) => {
    const context = requireTenant(request, 'automation:write')
    const { automationId } = parseOrThrow(automationParams, request.params, 'automation id')
    const patch = parseOrThrow(updateAutomationInputSchema, request.body, 'automation')

    const automation = await withTenant(context.tenantId, (tx) =>
      updateAutomation(tx, context.tenantId, automationId, patch),
    )
    if (!automation) throw new NotFoundError('Automation')

    return reply.send(ok(automation))
  })

  app.delete('/automations/:automationId', async (request, reply) => {
    const context = requireTenant(request, 'automation:write')
    const { automationId } = parseOrThrow(automationParams, request.params, 'automation id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteAutomation(tx, context.tenantId, automationId),
    )
    if (!deleted) throw new NotFoundError('Automation')

    return reply.send(ok({ deleted: true }))
  })

  /**
   * Fire an automation by hand — the same path an event takes, including the
   * de-duplication. Posting the same `triggerKey` twice executes once; the
   * second call reports the existing run untouched.
   */
  app.post('/automations/:automationId/trigger', async (request, reply) => {
    const context = requireTenant(request, 'automation:write')
    const { automationId } = parseOrThrow(automationParams, request.params, 'automation id')
    const input = parseOrThrow(triggerAutomationInputSchema, request.body, 'trigger')

    const outcome = await triggerAutomation(
      context.tenantId,
      automationId,
      {
        triggerKey: input.triggerKey,
        context: {
          ...input.context,
          contactId: input.contactId ?? null,
          dealId: input.dealId ?? null,
          leadId: input.leadId ?? null,
        },
      },
      context.actor,
    )
    if (!outcome) throw new NotFoundError('Automation')

    return reply.send(ok(outcome))
  })

  app.get('/automations/runs/:runId', async (request, reply) => {
    const context = requireTenant(request, 'automation:read')
    const { runId } = parseOrThrow(runParams, request.params, 'run id')

    const run = await withTenant(context.tenantId, (tx) => findAutomationRunById(tx, context.tenantId, runId))
    if (!run) throw new NotFoundError('Run')

    return reply.send(ok(run))
  })

  /**
   * Resume runs parked by a delay node whose wake-up time has passed.
   *
   * A scheduler endpoint rather than an in-process timer: a timer dies with
   * the process and takes every pending follow-up with it. Resuming is safe to
   * call as often as anyone likes — each node still runs at most once.
   */
  app.post('/automations/resume-due', async (request, reply) => {
    const context = requireTenant(request, 'automation:write')

    const due = await withTenant(context.tenantId, (tx) => listResumableRuns(tx, context.tenantId))
    const outcomes = []

    for (const run of due) {
      const automation = await withTenant(context.tenantId, (tx) =>
        findAutomationById(tx, context.tenantId, run.automationId),
      )
      if (!automation) continue
      outcomes.push(await executeAutomationRun(context.tenantId, automation, run, context.actor))
    }

    return reply.send(ok({ resumed: outcomes.length, outcomes }))
  })
}

export default crmAutomationRoutes
