import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  assignmentQuerySchema,
  autonomousExperimentInputSchema,
  autonomousGuardrailsSchema,
  createExperimentInputSchema,
  experimentAssignmentSchema,
  experimentStatusSchema,
  recordConversionInputSchema,
  recordExposureInputSchema,
  updateExperimentInputSchema,
  uuidSchema,
  type Actor,
  type AutonomousGuardrails,
  type CreateVariantInput,
  type Experiment,
  type ExperimentAssignment,
  type ExperimentOutcome,
  type ExperimentResults,
} from '@platform/schemas'
import { withTenant, withoutTenant, type Tx } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import {
  deleteExperiment,
  findExperimentById,
  insertExperiment,
  insertLearning,
  insertVariant,
  listExperiments,
  listLearnings,
  listRunningExperimentsForPath,
  loadVariantStats,
  recordConversion,
  recordExposure,
  setExperimentStatus,
  setWinningVariant,
  updateExperiment,
} from '../db/repositories/experiments.js'
import { findPageById } from '../db/repositories/pages.js'
import { findSiteById, resolveSiteByHost } from '../db/repositories/sites.js'
import { isAdmitted, selectVariant } from '../lib/experiments/allocation.js'
import { analyseExperiment } from '../lib/experiments/analysis.js'
import {
  assertAutonomousAllowed,
  assertWithinChangeLimit,
  planAutonomousDecision,
} from '../lib/experiments/autonomous.js'
import { deployVariant, rollbackDeployment } from '../lib/experiments/deploy.js'
import {
  assertVariantTargetsLiveSection,
  normalizeVariantDocument,
} from '../lib/experiments/variants.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

const experimentParamsSchema = z.object({ experimentId: uuidSchema })
const listQuerySchema = z.object({
  siteId: uuidSchema.optional(),
  pageId: uuidSchema.optional(),
  status: experimentStatusSchema.optional(),
})

/**
 * The identity every autonomous action is attributed to. Recording both the
 * agent and the user behind it is what lets the audit log answer "did a human
 * ask for this?" (ADR-0007).
 */
function autonomousActor(userId: string): Actor {
  return {
    type: 'agent',
    id: 'experiment-optimizer',
    label: 'Autonomous experimentation',
    onBehalfOfUserId: userId,
  }
}

function outcomeFor(results: ExperimentResults): ExperimentOutcome {
  if (results.status === 'winner_found') return 'winner'
  if (results.status === 'not_conclusive') return 'no_difference'
  return 'inconclusive'
}

/** Exactly one control, and at least one thing to compare it against. */
function assertVariantShape(variants: readonly CreateVariantInput[]): void {
  const controls = variants.filter((variant) => variant.isControl)
  if (controls.length !== 1) {
    throw new BadRequestError('An experiment needs exactly one control variant.')
  }
  if (variants.length - controls.length < 1) {
    throw new BadRequestError('An experiment needs at least one variant to compare against the control.')
  }

  const keys = new Set(variants.map((variant) => variant.key))
  if (keys.size !== variants.length) {
    throw new BadRequestError('Variant keys must be unique within an experiment.')
  }
}

const experimentsRoutes: FastifyPluginAsync = async (app) => {
  // -------------------------------------------------------------------------
  // Visitor-facing. Unauthenticated by design: the storefront serves anonymous
  // traffic. Tenant context comes from the verified hostname through the same
  // narrow `resolve_site_by_host` the public page API already uses (0001), so
  // this adds no new cross-tenant surface.
  // -------------------------------------------------------------------------

  /**
   * Which variant this visitor sees, for every running experiment on the page.
   *
   * Assignment is a pure function of (experiment id, anonymous id): the same
   * visitor gets the same answer on every call, without a session, a cookie or
   * a database round trip to decide it.
   */
  app.post('/assign', async (request, reply) => {
    const input = parseOrThrow(assignmentQuerySchema, request.body ?? {}, 'assignment request')
    const hostname = input.host.split(':')[0]!.toLowerCase()

    const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
    if (!resolved) throw new NotFoundError('Site for this hostname')

    const experiments = await withTenant(resolved.tenantId, (tx) =>
      listRunningExperimentsForPath(tx, resolved.tenantId, resolved.siteId, input.path),
    )

    const assignments: ExperimentAssignment[] = []
    for (const experiment of experiments) {
      if (!isAdmitted(experiment.id, input.anonymousId, experiment.trafficAllocation)) continue

      const variant = selectVariant(experiment.id, input.anonymousId, experiment.variants)
      if (!variant) continue

      assignments.push(
        experimentAssignmentSchema.parse({
          experimentId: experiment.id,
          variantId: variant.id,
          variantKey: variant.key,
          isControl: variant.isControl,
          document: variant.document,
        }),
      )
    }

    // Assignments are per-visitor, so they must never be shared by a cache.
    reply.header('cache-control', 'private, no-store')
    return reply.send(ok(assignments))
  })

  app.post('/exposure', async (request, reply) => {
    const input = parseOrThrow(recordExposureInputSchema, request.body ?? {}, 'exposure')
    const hostname = input.host.split(':')[0]!.toLowerCase()

    const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
    if (!resolved) throw new NotFoundError('Site for this hostname')

    const recorded = await withTenant(resolved.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, resolved.tenantId, input.experimentId)
      if (!experiment || experiment.status !== 'running') return false
      if (experiment.siteId !== resolved.siteId) return false
      if (!isAdmitted(experiment.id, input.anonymousId, experiment.trafficAllocation)) return false

      // Recomputed rather than trusted from the request: a client that could
      // name its own variant could stuff the ballot for either arm.
      const variant = selectVariant(experiment.id, input.anonymousId, experiment.variants)
      if (!variant) return false

      await recordExposure(tx, {
        tenantId: resolved.tenantId,
        experimentId: experiment.id,
        variantId: variant.id,
        anonymousId: input.anonymousId,
      })
      return true
    })

    reply.header('cache-control', 'private, no-store')
    return reply.send(ok({ recorded }))
  })

  /**
   * A conversion, with revenue as a first-class value rather than a flag.
   *
   * Refuses a conversion from a visitor who was never exposed: counting one
   * would push a conversion rate above 100% and quietly poison the test.
   */
  app.post('/conversion', async (request, reply) => {
    const input = parseOrThrow(recordConversionInputSchema, request.body ?? {}, 'conversion')
    const hostname = input.host.split(':')[0]!.toLowerCase()

    const resolved = await withoutTenant((tx) => resolveSiteByHost(tx, hostname))
    if (!resolved) throw new NotFoundError('Site for this hostname')

    const result = await withTenant(resolved.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, resolved.tenantId, input.experimentId)
      if (!experiment || experiment.status !== 'running') return null
      if (experiment.siteId !== resolved.siteId) return null

      return recordConversion(tx, {
        tenantId: resolved.tenantId,
        experimentId: experiment.id,
        anonymousId: input.anonymousId,
        // Rounded to cents at the boundary; the column is integer cents so
        // float drift never accumulates into the revenue total.
        revenueCents: Math.round(input.value * 100),
      })
    })

    if (!result) {
      throw new BadRequestError('No exposure recorded for this visitor in this experiment.')
    }

    reply.header('cache-control', 'private, no-store')
    return reply.send(ok({ recorded: true, variantId: result.variantId }))
  })

  // -------------------------------------------------------------------------
  // Management
  // -------------------------------------------------------------------------

  app.get('/', async (request, reply) => {
    const context = requireTenant(request, 'experiment:read')
    const query = parseOrThrow(listQuerySchema, request.query ?? {}, 'query')

    const experiments = await withTenant(context.tenantId, (tx) =>
      listExperiments(tx, context.tenantId, query),
    )
    return reply.send(ok(experiments))
  })

  app.get('/learnings', async (request, reply) => {
    const context = requireTenant(request, 'experiment:read')
    const learnings = await withTenant(context.tenantId, (tx) => listLearnings(tx, context.tenantId))
    return reply.send(ok(learnings))
  })

  app.post('/', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const input = parseOrThrow(createExperimentInputSchema, request.body, 'experiment')
    assertVariantShape(input.variants)

    const experiment = await createExperiment(context.tenantId, input, {
      autonomous: false,
      guardrails: null,
      createdBy: context.user.email,
    })

    return reply.status(201).send(ok(experiment))
  })

  app.get('/:experimentId', async (request, reply) => {
    const context = requireTenant(request, 'experiment:read')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const experiment = await withTenant(context.tenantId, (tx) =>
      findExperimentById(tx, context.tenantId, experimentId),
    )
    if (!experiment) throw new NotFoundError('Experiment')

    return reply.send(ok(experiment))
  })

  app.patch('/:experimentId', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')
    const patch = parseOrThrow(updateExperimentInputSchema, request.body, 'experiment')

    const experiment = await withTenant(context.tenantId, (tx) =>
      updateExperiment(tx, context.tenantId, experimentId, patch),
    )
    if (!experiment) throw new NotFoundError('Experiment')

    return reply.send(ok(experiment))
  })

  app.post('/:experimentId/start', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const experiment = await withTenant(context.tenantId, async (tx) => {
      const existing = await findExperimentById(tx, context.tenantId, experimentId)
      if (!existing) throw new NotFoundError('Experiment')
      if (existing.status === 'completed' || existing.status === 'archived') {
        throw new BadRequestError('A finished experiment cannot be restarted. Duplicate it instead.')
      }
      return setExperimentStatus(tx, context.tenantId, experimentId, 'running')
    })
    if (!experiment) throw new NotFoundError('Experiment')

    const event = buildEvent({
      name: 'experiment.started',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'experiment', id: experiment.id },
      payload: {
        pageId: experiment.pageId,
        variants: experiment.variants.length,
        targetMetric: experiment.targetMetric,
        autonomous: experiment.autonomous,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(experiment))
  })

  app.post('/:experimentId/pause', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const experiment = await withTenant(context.tenantId, (tx) =>
      setExperimentStatus(tx, context.tenantId, experimentId, 'paused'),
    )
    if (!experiment) throw new NotFoundError('Experiment')

    return reply.send(ok(experiment))
  })

  /** The numbers, computed the same way for humans and for the agent. */
  app.get('/:experimentId/results', async (request, reply) => {
    const context = requireTenant(request, 'experiment:read')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const results = await withTenant(context.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, context.tenantId, experimentId)
      if (!experiment) throw new NotFoundError('Experiment')
      return analyse(tx, context.tenantId, experiment)
    })

    return reply.send(ok(results))
  })

  /**
   * Finish an experiment: record the winner if the statistics support one, and
   * write down the learning either way. A test that "did not work" is still a
   * result worth keeping.
   */
  app.post('/:experimentId/complete', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const outcome = await withTenant(context.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, context.tenantId, experimentId)
      if (!experiment) throw new NotFoundError('Experiment')

      const results = await analyse(tx, context.tenantId, experiment)
      await setWinningVariant(tx, context.tenantId, experiment.id, results.winner?.variantId ?? null)
      const completed = await setExperimentStatus(tx, context.tenantId, experiment.id, 'completed')

      const learning = await insertLearning(tx, {
        tenantId: context.tenantId,
        experimentId: experiment.id,
        hypothesis: experiment.hypothesis,
        outcome: outcomeFor(results),
        summary: results.summary,
        metrics: {
          targetMetric: results.targetMetric,
          totalExposures: results.totalExposures,
          smallestSample: results.smallestSample,
          variants: results.variants,
        },
      })

      return { experiment: completed ?? experiment, results, learning }
    })

    const event = buildEvent({
      name: 'experiment.completed',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'experiment', id: experimentId },
      payload: {
        status: outcome.results.status,
        winningVariantId: outcome.results.winner?.variantId ?? null,
        totalExposures: outcome.results.totalExposures,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(outcome))
  })

  /**
   * Put the winner live.
   *
   * Requires `page:publish` on top of `experiment:write`, because that is
   * exactly what this does — deploying a winner is a publish, and it is gated
   * like one (ADR-0007). Refuses outright when the statistics did not name a
   * winner.
   */
  app.post('/:experimentId/deploy-winner', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    if (!context.permissions.includes('page:publish')) {
      throw new ForbiddenError('Deploying a winner publishes the page, which your role cannot do.')
    }
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const deployment = await withTenant(context.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, context.tenantId, experimentId)
      if (!experiment) throw new NotFoundError('Experiment')

      const results = await analyse(tx, context.tenantId, experiment)
      if (results.status !== 'winner_found' || !results.winner) {
        throw new BadRequestError(`No winner to deploy. ${results.summary}`, {
          status: results.status,
          smallestSample: results.smallestSample,
          minimumSamplePerVariant: results.minimumSamplePerVariant,
        })
      }

      const variant = experiment.variants.find((candidate) => candidate.id === results.winner!.variantId)
      if (!variant) throw new NotFoundError('Winning variant')

      await setWinningVariant(tx, context.tenantId, experiment.id, variant.id)
      const result = await deployVariant(tx, {
        tenantId: context.tenantId,
        experiment,
        variant,
        deployedBy: context.user.email,
      })
      return { result, results, variantId: variant.id }
    })

    const event = buildEvent({
      name: 'page.published',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: deployment.result.pageId },
      payload: {
        reason: 'experiment_winner_deployed',
        experimentId,
        variantId: deployment.variantId,
        path: deployment.result.path,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(deployment))
  })

  app.post('/:experimentId/rollback', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    if (!context.permissions.includes('page:publish')) {
      throw new ForbiddenError('Rolling back republishes the page, which your role cannot do.')
    }
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const result = await withTenant(context.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, context.tenantId, experimentId)
      if (!experiment) throw new NotFoundError('Experiment')

      return rollbackDeployment(tx, {
        tenantId: context.tenantId,
        experiment,
        rolledBackBy: context.user.email,
      })
    })

    const event = buildEvent({
      name: 'page.published',
      tenantId: context.tenantId,
      actor: context.actor,
      resource: { type: 'page', id: result.pageId },
      payload: { reason: 'experiment_rolled_back', experimentId, path: result.path },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(result))
  })

  app.delete('/:experimentId', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const deleted = await withTenant(context.tenantId, (tx) =>
      deleteExperiment(tx, context.tenantId, experimentId),
    )
    if (!deleted) throw new NotFoundError('Experiment')

    return reply.send(ok({ deleted: true }))
  })

  // -------------------------------------------------------------------------
  // Autonomous mode — gated, guardrailed, audited (§94, ADR-0007)
  // -------------------------------------------------------------------------

  /**
   * Step 1–3 of the loop: hypothesis → variants → allocation.
   *
   * The gate runs before anything is validated, let alone written, so a tenant
   * without the permission or the plan never reaches the variant machinery.
   */
  app.post('/autonomous', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    assertAutonomousAllowed(context)

    const input = parseOrThrow(autonomousExperimentInputSchema, request.body, 'autonomous experiment')
    const guardrails = autonomousGuardrailsSchema.parse(input.guardrails ?? {})
    assertWithinChangeLimit(guardrails, input.variants.length)

    if (input.variants.some((variant) => variant.isControl)) {
      throw new BadRequestError('Autonomous experiments derive their control from the live page.')
    }

    const experiment = await createExperiment(
      context.tenantId,
      {
        siteId: input.siteId,
        pageId: input.pageId,
        name: input.name,
        hypothesis: input.hypothesis,
        targetMetric: input.targetMetric,
        confidenceLevel: guardrails.approvalThreshold,
        minimumSamplePerVariant: guardrails.minimumSamplePerVariant,
        trafficAllocation: input.trafficAllocation,
        currency: input.currency,
        variants: [
          { key: 'control', name: 'Control (live page)', isControl: true, weight: 50, document: null },
          ...input.variants.map((variant) => ({ ...variant, isControl: false })),
        ],
      },
      { autonomous: true, guardrails, createdBy: context.user.email },
    )

    const started = await withTenant(context.tenantId, (tx) =>
      setExperimentStatus(tx, context.tenantId, experiment.id, 'running'),
    )

    const actor = autonomousActor(context.user.id)
    const event = buildEvent({
      name: 'experiment.started',
      tenantId: context.tenantId,
      actor,
      resource: { type: 'experiment', id: experiment.id },
      payload: {
        autonomous: true,
        hypothesis: input.hypothesis,
        guardrails,
        variants: experiment.variants.length,
        requestedBy: context.user.email,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.status(201).send(ok(started ?? experiment))
  })

  /**
   * Steps 4–7: monitor → declare → deploy → record the learning.
   *
   * Every branch is decided by `planAutonomousDecision` against real results.
   * There is no path from here to a deploy that skips the sample gate, the
   * significance test or the approval threshold.
   */
  app.post('/:experimentId/autonomous/evaluate', async (request, reply) => {
    const context = requireTenant(request, 'experiment:write')
    assertAutonomousAllowed(context)
    const { experimentId } = parseOrThrow(experimentParamsSchema, request.params, 'experiment id')

    const actor = autonomousActor(context.user.id)

    const decision = await withTenant(context.tenantId, async (tx) => {
      const experiment = await findExperimentById(tx, context.tenantId, experimentId)
      if (!experiment) throw new NotFoundError('Experiment')
      if (!experiment.autonomous || !experiment.guardrails) {
        throw new BadRequestError('This experiment is not running in autonomous mode.')
      }

      const results = await analyse(tx, context.tenantId, experiment)
      const plan = planAutonomousDecision(experiment, experiment.guardrails, results)

      if (plan.winningVariantId) {
        await setWinningVariant(tx, context.tenantId, experiment.id, plan.winningVariantId)
      }

      let deployedVariantId: string | null = null

      if (plan.action === 'deployed' && plan.deployVariantId) {
        const variant = experiment.variants.find((candidate) => candidate.id === plan.deployVariantId)
        if (!variant) throw new NotFoundError('Winning variant')

        // Rollback is not optional when an agent publishes: without a snapshot
        // there is nothing to undo, which is the guardrail this branch exists
        // to honour.
        if (!experiment.guardrails.rollbackOnRegression) {
          throw new BadRequestError(
            'Auto-deploy requires rollback to be enabled. An agent may not publish a change it cannot undo.',
          )
        }

        await deployVariant(tx, {
          tenantId: context.tenantId,
          experiment,
          variant,
          deployedBy: 'agent:experiment-optimizer',
        })
        deployedVariantId = variant.id
      }

      if (plan.action === 'deployed' || plan.action === 'stopped') {
        await setExperimentStatus(tx, context.tenantId, experiment.id, 'completed')
        await insertLearning(tx, {
          tenantId: context.tenantId,
          experimentId: experiment.id,
          hypothesis: experiment.hypothesis,
          outcome: outcomeFor(results),
          summary: plan.reason,
          metrics: {
            action: plan.action,
            targetMetric: results.targetMetric,
            totalExposures: results.totalExposures,
            variants: results.variants,
          },
        })
      }

      return {
        experimentId: experiment.id,
        action: plan.action,
        reason: plan.reason,
        results,
        deployedVariantId,
      }
    })

    // Every step of the loop is auditable, including the ones that decided to
    // do nothing — "the agent did not act" is the answer most worth being able
    // to prove later.
    const event = buildEvent({
      name: decision.action === 'continue' ? 'experiment.started' : 'experiment.completed',
      tenantId: context.tenantId,
      actor,
      resource: { type: 'experiment', id: decision.experimentId },
      payload: {
        autonomous: true,
        action: decision.action,
        reason: decision.reason,
        status: decision.results.status,
        deployedVariantId: decision.deployedVariantId,
        totalExposures: decision.results.totalExposures,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))
    await eventBus.publish(event)

    return reply.send(ok(decision))
  })
}

export default experimentsRoutes

// ---------------------------------------------------------------------------
// Shared internals
// ---------------------------------------------------------------------------

async function analyse(tx: Tx, tenantId: string, experiment: Experiment): Promise<ExperimentResults> {
  const stats = await loadVariantStats(tx, tenantId, experiment.id)
  return analyseExperiment({
    experimentId: experiment.id,
    targetMetric: experiment.targetMetric,
    confidenceLevel: experiment.confidenceLevel,
    minimumSamplePerVariant: experiment.minimumSamplePerVariant,
    stats,
  })
}

/**
 * Create an experiment and its variants in one transaction.
 *
 * Every variant document is validated against the block registry *before* the
 * insert, and a section-level variant must address a section that is actually
 * on the page — so a variant can neither store an undrawable document nor
 * silently change nothing (ADR-0003).
 */
async function createExperiment(
  tenantId: string,
  input: {
    siteId: string
    pageId: string
    name: string
    hypothesis: string
    targetMetric: 'conversion' | 'revenue'
    confidenceLevel: number
    minimumSamplePerVariant: number
    trafficAllocation: number
    currency: string
    variants: readonly CreateVariantInput[]
  },
  options: {
    autonomous: boolean
    guardrails: AutonomousGuardrails | null
    createdBy: string
  },
): Promise<Experiment> {
  return withTenant(tenantId, async (tx) => {
    const site = await findSiteById(tx, tenantId, input.siteId)
    if (!site) throw new NotFoundError('Site')

    const page = await findPageById(tx, tenantId, input.pageId)
    if (!page) throw new NotFoundError('Page')
    if (page.siteId !== input.siteId) {
      throw new BadRequestError('That page belongs to a different website.')
    }

    const documents = input.variants.map((variant) => {
      const document = normalizeVariantDocument(variant.document)
      assertVariantTargetsLiveSection(document, page.sections)
      return document
    })

    const row = await insertExperiment(tx, {
      tenantId,
      siteId: input.siteId,
      pageId: input.pageId,
      name: input.name,
      hypothesis: input.hypothesis,
      targetMetric: input.targetMetric,
      confidenceLevel: input.confidenceLevel,
      minimumSamplePerVariant: input.minimumSamplePerVariant,
      trafficAllocation: input.trafficAllocation,
      currency: input.currency,
      autonomous: options.autonomous,
      guardrails: options.guardrails,
      createdBy: options.createdBy,
    })

    for (const [index, variant] of input.variants.entries()) {
      await insertVariant(tx, {
        tenantId,
        experimentId: row.id,
        key: variant.key,
        name: variant.name,
        isControl: variant.isControl,
        weight: variant.weight,
        document: documents[index] ?? null,
      })
    }

    const created = await findExperimentById(tx, tenantId, row.id)
    if (!created) throw new NotFoundError('Experiment')
    return created
  })
}
