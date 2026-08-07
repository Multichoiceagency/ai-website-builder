import {
  autonomousGuardrailsSchema,
  experimentLearningSchema,
  experimentSchema,
  experimentVariantSchema,
  variantDocumentSchema,
  type AutonomousGuardrails,
  type Experiment,
  type ExperimentLearning,
  type ExperimentOutcome,
  type ExperimentStatus,
  type ExperimentTargetMetric,
  type ExperimentVariant,
  type VariantDocument,
} from '@platform/schemas'
import type { Tx } from '../client.js'
import { jsonParam, readJson } from '../json.js'
import type { VariantStats } from '../../lib/experiments/analysis.js'

interface ExperimentRow {
  id: string
  tenant_id: string
  site_id: string
  page_id: string
  name: string
  hypothesis: string
  status: ExperimentStatus
  target_metric: ExperimentTargetMetric
  confidence_level: string
  minimum_sample_per_variant: number
  traffic_allocation: number
  currency: string
  autonomous: boolean
  guardrails: unknown
  winning_variant_id: string | null
  deployed_variant_id: string | null
  rollback_revision_id: string | null
  started_at: Date | null
  ended_at: Date | null
  deployed_at: Date | null
  created_at: Date
  updated_at: Date
}

interface VariantRow {
  id: string
  experiment_id: string
  key: string
  name: string
  is_control: boolean
  weight: number
  document: unknown
  created_at: Date
}

const EXPERIMENT_COLUMNS = [
  'id',
  'tenant_id',
  'site_id',
  'page_id',
  'name',
  'hypothesis',
  'status',
  'target_metric',
  'confidence_level',
  'minimum_sample_per_variant',
  'traffic_allocation',
  'currency',
  'autonomous',
  'guardrails',
  'winning_variant_id',
  'deployed_variant_id',
  'rollback_revision_id',
  'started_at',
  'ended_at',
  'deployed_at',
  'created_at',
  'updated_at',
]

/**
 * Variant documents are validated against the block registry on write. On read
 * only the *shape* is re-checked: a document that no longer parses is a data
 * problem, and returning null for it degrades the variant to "serve the live
 * page" rather than serving something a renderer cannot draw.
 */
function readVariantDocument(value: unknown): VariantDocument | null {
  const raw = readJson<unknown>(value, null)
  if (raw === null || raw === undefined) return null

  const parsed = variantDocumentSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function toVariant(row: VariantRow): ExperimentVariant {
  return experimentVariantSchema.parse({
    id: row.id,
    experimentId: row.experiment_id,
    key: row.key,
    name: row.name,
    isControl: row.is_control,
    weight: row.weight,
    document: readVariantDocument(row.document),
    createdAt: row.created_at,
  })
}

function toExperiment(row: ExperimentRow, variants: ExperimentVariant[]): Experiment {
  const guardrails = readJson<Record<string, unknown> | null>(row.guardrails, null)

  return experimentSchema.parse({
    id: row.id,
    tenantId: row.tenant_id,
    siteId: row.site_id,
    pageId: row.page_id,
    name: row.name,
    hypothesis: row.hypothesis,
    status: row.status,
    targetMetric: row.target_metric,
    confidenceLevel: Number(row.confidence_level),
    minimumSamplePerVariant: row.minimum_sample_per_variant,
    trafficAllocation: row.traffic_allocation,
    currency: row.currency,
    autonomous: row.autonomous,
    guardrails: guardrails ? autonomousGuardrailsSchema.parse(guardrails) : null,
    winningVariantId: row.winning_variant_id,
    deployedVariantId: row.deployed_variant_id,
    rollbackRevisionId: row.rollback_revision_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants,
  })
}

/** Variants for a set of experiments, in one round trip. */
async function loadVariants(tx: Tx, tenantId: string, experimentIds: string[]): Promise<Map<string, ExperimentVariant[]>> {
  const grouped = new Map<string, ExperimentVariant[]>()
  if (experimentIds.length === 0) return grouped

  const rows = await tx<VariantRow[]>`
    SELECT id, experiment_id, key, name, is_control, weight, document, created_at
    FROM experiment_variants
    WHERE tenant_id = ${tenantId} AND experiment_id = ANY(${experimentIds}::uuid[])
    ORDER BY is_control DESC, key ASC
  `

  for (const row of rows) {
    const existing = grouped.get(row.experiment_id)
    if (existing) existing.push(toVariant(row))
    else grouped.set(row.experiment_id, [toVariant(row)])
  }
  return grouped
}

export async function insertExperiment(
  tx: Tx,
  input: {
    tenantId: string
    siteId: string
    pageId: string
    name: string
    hypothesis: string
    targetMetric: ExperimentTargetMetric
    confidenceLevel: number
    minimumSamplePerVariant: number
    trafficAllocation: number
    currency: string
    autonomous: boolean
    guardrails: AutonomousGuardrails | null
    createdBy: string
  },
): Promise<ExperimentRow> {
  const [row] = await tx<ExperimentRow[]>`
    INSERT INTO experiments (
      tenant_id, site_id, page_id, name, hypothesis, target_metric,
      confidence_level, minimum_sample_per_variant, traffic_allocation, currency,
      autonomous, guardrails, created_by
    )
    VALUES (
      ${input.tenantId}, ${input.siteId}, ${input.pageId}, ${input.name}, ${input.hypothesis},
      ${input.targetMetric}, ${input.confidenceLevel}, ${input.minimumSamplePerVariant},
      ${input.trafficAllocation}, ${input.currency.toUpperCase()},
      ${input.autonomous}, ${input.guardrails ? jsonParam(tx, input.guardrails) : null}, ${input.createdBy}
    )
    RETURNING ${tx(EXPERIMENT_COLUMNS)}
  `
  return row!
}

export async function insertVariant(
  tx: Tx,
  input: {
    tenantId: string
    experimentId: string
    key: string
    name: string
    isControl: boolean
    weight: number
    document: VariantDocument | null
  },
): Promise<ExperimentVariant> {
  const [row] = await tx<VariantRow[]>`
    INSERT INTO experiment_variants (tenant_id, experiment_id, key, name, is_control, weight, document)
    VALUES (
      ${input.tenantId}, ${input.experimentId}, ${input.key}, ${input.name},
      ${input.isControl}, ${input.weight},
      ${input.document ? jsonParam(tx, input.document) : null}
    )
    RETURNING id, experiment_id, key, name, is_control, weight, document, created_at
  `
  return toVariant(row!)
}

export async function findExperimentById(
  tx: Tx,
  tenantId: string,
  experimentId: string,
): Promise<Experiment | null> {
  const [row] = await tx<ExperimentRow[]>`
    SELECT ${tx(EXPERIMENT_COLUMNS)} FROM experiments
    WHERE tenant_id = ${tenantId} AND id = ${experimentId}
    LIMIT 1
  `
  if (!row) return null

  const variants = await loadVariants(tx, tenantId, [row.id])
  return toExperiment(row, variants.get(row.id) ?? [])
}

export async function listExperiments(
  tx: Tx,
  tenantId: string,
  filters: { siteId?: string; pageId?: string; status?: ExperimentStatus } = {},
): Promise<Experiment[]> {
  const rows = await tx<ExperimentRow[]>`
    SELECT ${tx(EXPERIMENT_COLUMNS)} FROM experiments
    WHERE tenant_id = ${tenantId}
      AND (${filters.siteId ?? null}::uuid IS NULL OR site_id = ${filters.siteId ?? null}::uuid)
      AND (${filters.pageId ?? null}::uuid IS NULL OR page_id = ${filters.pageId ?? null}::uuid)
      AND (${filters.status ?? null}::text IS NULL OR status = ${filters.status ?? null}::text)
    ORDER BY created_at DESC
    LIMIT 200
  `

  const variants = await loadVariants(tx, tenantId, rows.map((row) => row.id))
  return rows.map((row) => toExperiment(row, variants.get(row.id) ?? []))
}

/**
 * The visitor path: every running experiment on the page served at `path`.
 * Joined through `pages` so the caller never has to resolve a page id first.
 */
export async function listRunningExperimentsForPath(
  tx: Tx,
  tenantId: string,
  siteId: string,
  path: string,
): Promise<Experiment[]> {
  const rows = await tx<ExperimentRow[]>`
    SELECT e.*
    FROM experiments e
    JOIN pages p ON p.id = e.page_id AND p.tenant_id = e.tenant_id
    WHERE e.tenant_id = ${tenantId}
      AND e.site_id = ${siteId}
      AND e.status = 'running'
      AND p.path = ${path}
      AND p.status = 'published'
    ORDER BY e.created_at ASC
    LIMIT 20
  `

  const variants = await loadVariants(tx, tenantId, rows.map((row) => row.id))
  return rows.map((row) => toExperiment(row, variants.get(row.id) ?? []))
}

export async function updateExperiment(
  tx: Tx,
  tenantId: string,
  experimentId: string,
  patch: {
    name?: string
    hypothesis?: string
    confidenceLevel?: number
    minimumSamplePerVariant?: number
    trafficAllocation?: number
  },
): Promise<Experiment | null> {
  const [row] = await tx<ExperimentRow[]>`
    UPDATE experiments SET
      name                       = COALESCE(${patch.name ?? null}::text, name),
      hypothesis                 = COALESCE(${patch.hypothesis ?? null}::text, hypothesis),
      confidence_level           = COALESCE(${patch.confidenceLevel ?? null}::numeric, confidence_level),
      minimum_sample_per_variant = COALESCE(${patch.minimumSamplePerVariant ?? null}::integer, minimum_sample_per_variant),
      traffic_allocation         = COALESCE(${patch.trafficAllocation ?? null}::integer, traffic_allocation)
    WHERE tenant_id = ${tenantId} AND id = ${experimentId}
    RETURNING ${tx(EXPERIMENT_COLUMNS)}
  `
  if (!row) return null

  const variants = await loadVariants(tx, tenantId, [row.id])
  return toExperiment(row, variants.get(row.id) ?? [])
}

export async function setExperimentStatus(
  tx: Tx,
  tenantId: string,
  experimentId: string,
  status: ExperimentStatus,
): Promise<Experiment | null> {
  const [row] = await tx<ExperimentRow[]>`
    UPDATE experiments SET
      status     = ${status},
      started_at = CASE WHEN ${status}::text = 'running' AND started_at IS NULL THEN now() ELSE started_at END,
      ended_at   = CASE WHEN ${status}::text IN ('completed', 'archived') THEN now() ELSE ended_at END
    WHERE tenant_id = ${tenantId} AND id = ${experimentId}
    RETURNING ${tx(EXPERIMENT_COLUMNS)}
  `
  if (!row) return null

  const variants = await loadVariants(tx, tenantId, [row.id])
  return toExperiment(row, variants.get(row.id) ?? [])
}

/** Record which variant won. Separate from deploying it, on purpose. */
export async function setWinningVariant(
  tx: Tx,
  tenantId: string,
  experimentId: string,
  variantId: string | null,
): Promise<void> {
  await tx`
    UPDATE experiments SET winning_variant_id = ${variantId}
    WHERE tenant_id = ${tenantId} AND id = ${experimentId}
  `
}

export async function setDeployment(
  tx: Tx,
  tenantId: string,
  experimentId: string,
  input: { variantId: string | null; rollbackRevisionId: string | null },
): Promise<void> {
  await tx`
    UPDATE experiments SET
      deployed_variant_id  = ${input.variantId},
      rollback_revision_id = ${input.rollbackRevisionId},
      deployed_at          = ${input.variantId ? new Date() : null}
    WHERE tenant_id = ${tenantId} AND id = ${experimentId}
  `
}

/**
 * Record an exposure.
 *
 * `DO NOTHING` on conflict is what makes the first assignment permanent: a
 * visitor keeps the variant they were first shown even if weights are edited
 * mid-flight, and re-firing the same exposure cannot inflate the denominator.
 */
export async function recordExposure(
  tx: Tx,
  input: { tenantId: string; experimentId: string; variantId: string; anonymousId: string },
): Promise<void> {
  await tx`
    INSERT INTO experiment_assignments (tenant_id, experiment_id, variant_id, anonymous_id)
    VALUES (${input.tenantId}, ${input.experimentId}, ${input.variantId}, ${input.anonymousId})
    ON CONFLICT (experiment_id, anonymous_id) DO NOTHING
  `
}

/**
 * Record a conversion against an existing exposure.
 *
 * Returns null when the visitor was never exposed. The caller reports that as
 * an error rather than inserting a row: a conversion with no exposure behind it
 * would push a conversion rate above 100% and quietly corrupt the test.
 */
export async function recordConversion(
  tx: Tx,
  input: { tenantId: string; experimentId: string; anonymousId: string; revenueCents: number },
): Promise<{ variantId: string } | null> {
  const [row] = await tx<{ variant_id: string }[]>`
    UPDATE experiment_assignments SET
      conversions   = conversions + 1,
      revenue_cents = revenue_cents + ${input.revenueCents},
      converted_at  = COALESCE(converted_at, now())
    WHERE tenant_id = ${input.tenantId}
      AND experiment_id = ${input.experimentId}
      AND anonymous_id = ${input.anonymousId}
    RETURNING variant_id
  `
  return row ? { variantId: row.variant_id } : null
}

/**
 * Per-variant aggregates for the analysis.
 *
 * The LEFT JOIN keeps a variant with zero traffic in the result — which is the
 * whole point, because a variant nobody has seen is exactly what the minimum
 * sample gate needs to notice.
 */
export async function loadVariantStats(
  tx: Tx,
  tenantId: string,
  experimentId: string,
): Promise<VariantStats[]> {
  const rows = await tx<
    {
      id: string
      key: string
      name: string
      is_control: boolean
      exposures: string
      conversions: string
      revenue_cents: string
      revenue_sum_of_squares: number
    }[]
  >`
    SELECT
      v.id,
      v.key,
      v.name,
      v.is_control,
      count(a.anonymous_id)::text AS exposures,
      (count(a.anonymous_id) FILTER (WHERE a.conversions > 0))::text AS conversions,
      COALESCE(sum(a.revenue_cents), 0)::text AS revenue_cents,
      COALESCE(sum((a.revenue_cents / 100.0) * (a.revenue_cents / 100.0)), 0)::float8 AS revenue_sum_of_squares
    FROM experiment_variants v
    LEFT JOIN experiment_assignments a
      ON a.variant_id = v.id AND a.tenant_id = v.tenant_id
    WHERE v.tenant_id = ${tenantId} AND v.experiment_id = ${experimentId}
    GROUP BY v.id, v.key, v.name, v.is_control
    ORDER BY v.is_control DESC, v.key ASC
  `

  return rows.map((row) => ({
    variantId: row.id,
    key: row.key,
    name: row.name,
    isControl: row.is_control,
    exposures: Number(row.exposures),
    conversions: Number(row.conversions),
    revenue: Number(row.revenue_cents) / 100,
    revenueSumOfSquares: Number(row.revenue_sum_of_squares),
  }))
}

export async function insertLearning(
  tx: Tx,
  input: {
    tenantId: string
    experimentId: string
    hypothesis: string
    outcome: ExperimentOutcome
    summary: string
    metrics: Record<string, unknown>
  },
): Promise<ExperimentLearning> {
  const [row] = await tx<
    {
      id: string
      experiment_id: string
      hypothesis: string
      outcome: ExperimentOutcome
      summary: string
      metrics: unknown
      created_at: Date
    }[]
  >`
    INSERT INTO experiment_learnings (tenant_id, experiment_id, hypothesis, outcome, summary, metrics)
    VALUES (
      ${input.tenantId}, ${input.experimentId}, ${input.hypothesis},
      ${input.outcome}, ${input.summary}, ${jsonParam(tx, input.metrics)}
    )
    RETURNING id, experiment_id, hypothesis, outcome, summary, metrics, created_at
  `

  return experimentLearningSchema.parse({
    id: row!.id,
    experimentId: row!.experiment_id,
    hypothesis: row!.hypothesis,
    outcome: row!.outcome,
    summary: row!.summary,
    metrics: readJson<Record<string, unknown>>(row!.metrics, {}),
    createdAt: row!.created_at,
  })
}

export async function listLearnings(tx: Tx, tenantId: string, limit = 50): Promise<ExperimentLearning[]> {
  const rows = await tx<
    {
      id: string
      experiment_id: string
      hypothesis: string
      outcome: ExperimentOutcome
      summary: string
      metrics: unknown
      created_at: Date
    }[]
  >`
    SELECT id, experiment_id, hypothesis, outcome, summary, metrics, created_at
    FROM experiment_learnings
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return rows.map((row) =>
    experimentLearningSchema.parse({
      id: row.id,
      experimentId: row.experiment_id,
      hypothesis: row.hypothesis,
      outcome: row.outcome,
      summary: row.summary,
      metrics: readJson<Record<string, unknown>>(row.metrics, {}),
      createdAt: row.created_at,
    }),
  )
}

/**
 * The revision a `publish`-style snapshot just wrote.
 *
 * `insertRevision` in the pages repository returns void, and deploying an
 * experiment winner needs the id it produced so rollback has something to
 * point at. Kept here rather than changed there because that file belongs to
 * another slice.
 */
export async function findLatestRevisionId(
  tx: Tx,
  tenantId: string,
  pageId: string,
): Promise<string | null> {
  const [row] = await tx<{ id: string }[]>`
    SELECT id FROM page_revisions
    WHERE tenant_id = ${tenantId} AND page_id = ${pageId}
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `
  return row?.id ?? null
}

export async function deleteExperiment(tx: Tx, tenantId: string, experimentId: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM experiments WHERE tenant_id = ${tenantId} AND id = ${experimentId} RETURNING id
  `
  return rows.length > 0
}
