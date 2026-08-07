/**
 * experiments contracts. Owned by the experiments phase.
 *
 * Every cross-boundary shape for this domain lives here (ADR-0002).
 *
 * A variant is never alternate *code*. It is an alternate `Section[]` document
 * for a page, or an alternate section placed over one slot of the live
 * document — which is what keeps an experiment diffable, reversible, and
 * validatable against the same block registry as everything else (ADR-0003).
 */
import { z } from 'zod'
import { isoTimestampSchema, pathSchema, uuidSchema } from './common.js'
import { pageDocumentSchema, sectionSchema } from './blocks.js'

// region Variant documents

/**
 * What a variant changes.
 *
 * `page`    — a whole alternate document for the page.
 * `section` — one section swapped in place, addressed by the id it replaces.
 *
 * Both carry real `Section`s, so both go through `normalizeDocument` before
 * they can be stored. A variant that fails block validation is rejected at the
 * boundary rather than discovered by a visitor.
 */
export const variantDocumentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('page'),
    sections: pageDocumentSchema,
  }),
  z.object({
    kind: z.literal('section'),
    /** The id of the section in the live document this one stands in for. */
    targetSectionId: z.string().min(1).max(64),
    section: sectionSchema,
  }),
])
export type VariantDocument = z.infer<typeof variantDocumentSchema>

// endregion

// region Experiment

export const EXPERIMENT_TARGET_METRICS = ['conversion', 'revenue'] as const
export const experimentTargetMetricSchema = z.enum(EXPERIMENT_TARGET_METRICS)
export type ExperimentTargetMetric = z.infer<typeof experimentTargetMetricSchema>

/** Lifecycle. Deliberately separate from what the numbers say. */
export const EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'archived'] as const
export const experimentStatusSchema = z.enum(EXPERIMENT_STATUSES)
export type ExperimentStatus = z.infer<typeof experimentStatusSchema>

/**
 * What the numbers say — and only what they actually say.
 *
 * `running`        — the minimum sample gate has not been met by every variant.
 * `not_conclusive` — enough data, but no variant beats control at the
 *                    configured confidence level.
 * `winner_found`   — a variant beats control at that level.
 *
 * There is deliberately no fourth value meaning "probably winning". A test
 * that has not cleared the gate reports `running`, never a winner.
 */
export const EXPERIMENT_ANALYSIS_STATUSES = ['running', 'not_conclusive', 'winner_found'] as const
export const experimentAnalysisStatusSchema = z.enum(EXPERIMENT_ANALYSIS_STATUSES)
export type ExperimentAnalysisStatus = z.infer<typeof experimentAnalysisStatusSchema>

/**
 * The guardrails autonomous mode runs inside (§94, ADR-0007). None of these is
 * optional at runtime: an autonomous experiment without a change limit, an
 * approval threshold and a rollback path is exactly the liability the ADR
 * refuses to ship.
 */
export const autonomousGuardrailsSchema = z.object({
  /** Hard ceiling on variants the agent may create in one experiment. */
  maxChanges: z.number().int().min(1).max(8).default(2),
  /** Confidence a winner must reach before it may be deployed at all. */
  approvalThreshold: z.number().min(0.9).max(0.999).default(0.95),
  /** Per-variant exposures required before any decision is even considered. */
  minimumSamplePerVariant: z.number().int().min(100).max(1_000_000).default(500),
  /**
   * Deploy the winner without a human, or stop at a proposal. Default is a
   * proposal — narrowing a gate is a choice a tenant makes explicitly.
   */
  autoDeploy: z.boolean().default(false),
  /** Keep a revision snapshot so a deployed winner can be undone. */
  rollbackOnRegression: z.boolean().default(true),
  /** Wall-clock ceiling. An experiment that never concludes still ends. */
  maxDurationHours: z.number().int().min(1).max(24 * 90).default(24 * 14),
})
export type AutonomousGuardrails = z.infer<typeof autonomousGuardrailsSchema>

export const experimentVariantSchema = z.object({
  id: uuidSchema,
  experimentId: uuidSchema,
  key: z.string().regex(/^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$/, 'variant keys are short lowercase slugs'),
  name: z.string().min(1).max(120),
  isControl: z.boolean(),
  /** Relative allocation weight. Shares are computed against the sum. */
  weight: z.number().int().min(1).max(1000),
  /** Null on the control: the control *is* the live document. */
  document: variantDocumentSchema.nullable(),
  createdAt: isoTimestampSchema,
})
export type ExperimentVariant = z.infer<typeof experimentVariantSchema>

export const experimentSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  siteId: uuidSchema,
  pageId: uuidSchema,
  name: z.string().min(1).max(120),
  hypothesis: z.string().max(1000),
  status: experimentStatusSchema,
  targetMetric: experimentTargetMetricSchema,
  confidenceLevel: z.number().min(0.8).max(0.999),
  minimumSamplePerVariant: z.number().int().min(1),
  /** Percentage of visitors admitted to the test at all. */
  trafficAllocation: z.number().int().min(1).max(100),
  currency: z.string().length(3),
  autonomous: z.boolean(),
  guardrails: autonomousGuardrailsSchema.nullable(),
  winningVariantId: uuidSchema.nullable(),
  deployedVariantId: uuidSchema.nullable(),
  /** The page revision captured before a winner was deployed, for rollback. */
  rollbackRevisionId: uuidSchema.nullable(),
  startedAt: isoTimestampSchema.nullable(),
  endedAt: isoTimestampSchema.nullable(),
  deployedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  variants: z.array(experimentVariantSchema),
})
export type Experiment = z.infer<typeof experimentSchema>

// endregion

// region Inputs

export const createVariantInputSchema = z.object({
  key: z.string().regex(/^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$/),
  name: z.string().min(1).max(120),
  isControl: z.boolean().default(false),
  weight: z.number().int().min(1).max(1000).default(50),
  document: variantDocumentSchema.nullable().default(null),
})
export type CreateVariantInput = z.infer<typeof createVariantInputSchema>

export const createExperimentInputSchema = z.object({
  siteId: uuidSchema,
  pageId: uuidSchema,
  name: z.string().min(1).max(120),
  hypothesis: z.string().max(1000).default(''),
  targetMetric: experimentTargetMetricSchema.default('conversion'),
  confidenceLevel: z.number().min(0.8).max(0.999).default(0.95),
  minimumSamplePerVariant: z.number().int().min(1).max(1_000_000).default(200),
  trafficAllocation: z.number().int().min(1).max(100).default(100),
  currency: z.string().length(3).default('EUR'),
  /** Control plus at least one challenger. */
  variants: z.array(createVariantInputSchema).min(2).max(9),
})
export type CreateExperimentInput = z.infer<typeof createExperimentInputSchema>

export const updateExperimentInputSchema = z
  .object({
    name: z.string().min(1).max(120),
    hypothesis: z.string().max(1000),
    confidenceLevel: z.number().min(0.8).max(0.999),
    minimumSamplePerVariant: z.number().int().min(1).max(1_000_000),
    trafficAllocation: z.number().int().min(1).max(100),
  })
  .partial()
export type UpdateExperimentInput = z.infer<typeof updateExperimentInputSchema>

/**
 * The agent's proposal. It arrives as data and is validated like any other
 * request body — an agent gets no shortcut past the boundary (ADR-0007).
 */
export const autonomousExperimentInputSchema = z.object({
  siteId: uuidSchema,
  pageId: uuidSchema,
  name: z.string().min(1).max(120),
  hypothesis: z.string().min(10).max(1000),
  targetMetric: experimentTargetMetricSchema.default('conversion'),
  currency: z.string().length(3).default('EUR'),
  trafficAllocation: z.number().int().min(1).max(100).default(50),
  guardrails: autonomousGuardrailsSchema.partial().optional(),
  /** Challengers only. The control is created from the live page. */
  variants: z.array(createVariantInputSchema).min(1).max(8),
})
export type AutonomousExperimentInput = z.infer<typeof autonomousExperimentInputSchema>

// endregion

// region Visitor-facing

export const assignmentQuerySchema = z.object({
  host: z.string().min(1).max(253),
  path: pathSchema.default('/'),
  /** Stable per-browser id. The same one the tracking SDK already mints. */
  anonymousId: z.string().min(8).max(64),
})
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>

export const experimentAssignmentSchema = z.object({
  experimentId: uuidSchema,
  variantId: uuidSchema,
  variantKey: z.string(),
  isControl: z.boolean(),
  document: variantDocumentSchema.nullable(),
})
export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>

export const recordExposureInputSchema = z.object({
  host: z.string().min(1).max(253),
  experimentId: uuidSchema,
  anonymousId: z.string().min(8).max(64),
})
export type RecordExposureInput = z.infer<typeof recordExposureInputSchema>

export const recordConversionInputSchema = recordExposureInputSchema.extend({
  /** Revenue in major units. First-class, not an afterthought on a count. */
  value: z.number().min(0).max(1_000_000).default(0),
  currency: z.string().length(3).optional(),
})
export type RecordConversionInput = z.infer<typeof recordConversionInputSchema>

// endregion

// region Results

export const variantResultSchema = z.object({
  variantId: uuidSchema,
  key: z.string(),
  name: z.string(),
  isControl: z.boolean(),
  exposures: z.number().int().min(0),
  conversions: z.number().int().min(0),
  conversionRate: z.number().min(0).max(1),
  /** Major units. */
  revenue: z.number().min(0),
  revenuePerVisitor: z.number().min(0),
  /** Relative lift on the target metric against control. Null for control. */
  uplift: z.number().nullable(),
  /** Two-tailed p-value against control. Null for control or when untestable. */
  pValue: z.number().min(0).max(1).nullable(),
  /** True only when `pValue` clears `1 - confidenceLevel` AND the gate is met. */
  significant: z.boolean(),
})
export type VariantResult = z.infer<typeof variantResultSchema>

export const experimentResultsSchema = z.object({
  experimentId: uuidSchema,
  status: experimentAnalysisStatusSchema,
  targetMetric: experimentTargetMetricSchema,
  confidenceLevel: z.number(),
  minimumSamplePerVariant: z.number().int(),
  /** Exposures on the thinnest variant — what the gate actually compares. */
  smallestSample: z.number().int().min(0),
  totalExposures: z.number().int().min(0),
  sampleGateMet: z.boolean(),
  winner: variantResultSchema.nullable(),
  variants: z.array(variantResultSchema),
  /** Plain language, matching the numbers. Never optimistic about a null. */
  summary: z.string(),
})
export type ExperimentResults = z.infer<typeof experimentResultsSchema>

// endregion

// region Learnings

export const EXPERIMENT_OUTCOMES = ['winner', 'no_difference', 'inconclusive'] as const
export const experimentOutcomeSchema = z.enum(EXPERIMENT_OUTCOMES)
export type ExperimentOutcome = z.infer<typeof experimentOutcomeSchema>

/**
 * What the experiment taught, kept after the experiment itself is archived.
 * A test whose result is forgotten was an expensive way to change nothing.
 */
export const experimentLearningSchema = z.object({
  id: uuidSchema,
  experimentId: uuidSchema,
  hypothesis: z.string(),
  outcome: experimentOutcomeSchema,
  summary: z.string(),
  metrics: z.record(z.unknown()),
  createdAt: isoTimestampSchema,
})
export type ExperimentLearning = z.infer<typeof experimentLearningSchema>

/** The outcome of one autonomous evaluation pass. */
export const autonomousDecisionSchema = z.object({
  experimentId: uuidSchema,
  action: z.enum(['continue', 'awaiting_approval', 'deployed', 'stopped', 'rolled_back']),
  reason: z.string(),
  results: experimentResultsSchema,
  deployedVariantId: uuidSchema.nullable(),
})
export type AutonomousDecision = z.infer<typeof autonomousDecisionSchema>

// endregion
