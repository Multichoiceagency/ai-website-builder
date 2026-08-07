/**
 * Pipelines, stages and deals.
 *
 * Split out of `crm.ts` so each repository stays readable: this is the
 * revenue side of the CRM — the stage a deal sits in, how long it has sat
 * there, and the append-only history that makes both answerable.
 */
import {
  DEFAULT_PIPELINE_STAGES,
  crmDealSchema,
  crmPipelineSchema,
  crmStageSchema,
  type CrmDeal,
  type CrmPipeline,
  type CrmStage,
} from '@platform/schemas'
import type { Tx } from '../client.js'

// region Row shapes and mappers

interface StageRow {
  id: string
  pipeline_id: string
  key: string
  name: string
  position: number
  probability: string | number
  is_won: boolean
  is_lost: boolean
}

function toStage(row: StageRow): CrmStage {
  return crmStageSchema.parse({
    id: row.id,
    pipelineId: row.pipeline_id,
    key: row.key,
    name: row.name,
    position: Number(row.position),
    probability: Number(row.probability),
    isWon: row.is_won,
    isLost: row.is_lost,
  })
}

interface DealRow {
  id: string
  pipeline_id: string
  stage_id: string
  stage_key: string
  stage_name: string
  probability: string | number
  contact_id: string | null
  contact_name: string | null
  company_id: string | null
  lead_id: string | null
  title: string
  value_cents: string | number
  currency: string
  status: 'open' | 'won' | 'lost'
  expected_close_on: Date | string | null
  stage_entered_at: Date
  closed_at: Date | null
  created_at: Date
  updated_at: Date
}

function toDeal(row: DealRow): CrmDeal {
  const valueCents = Number(row.value_cents)
  const probability = Number(row.probability)
  const stageEnteredAt = new Date(row.stage_entered_at)

  return crmDealSchema.parse({
    id: row.id,
    pipelineId: row.pipeline_id,
    stageId: row.stage_id,
    stageKey: row.stage_key,
    stageName: row.stage_name,
    contactId: row.contact_id,
    contactName: row.contact_name ?? '',
    companyId: row.company_id,
    leadId: row.lead_id,
    title: row.title,
    valueCents,
    currency: row.currency,
    status: row.status,
    probability,
    // Rounded here so the API, the board header and the forecast can never
    // disagree by a cent about the same deal.
    weightedValueCents: Math.round(valueCents * probability),
    expectedCloseOn:
      row.expected_close_on instanceof Date
        ? row.expected_close_on.toISOString().slice(0, 10)
        : (row.expected_close_on ?? null),
    timeInStageSeconds: Math.max(0, Math.floor((Date.now() - stageEnteredAt.getTime()) / 1000)),
    stageEnteredAt,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

const DEAL_SELECT = (tx: Tx) => tx`
  d.id, d.pipeline_id, d.stage_id, s.key AS stage_key, s.name AS stage_name, s.probability,
  d.contact_id, trim(concat_ws(' ', c.first_name, c.last_name)) AS contact_name,
  d.company_id, d.lead_id, d.title, d.value_cents, d.currency, d.status,
  d.expected_close_on, d.stage_entered_at, d.closed_at, d.created_at, d.updated_at
`

// endregion

// region Pipelines

export async function listPipelines(tx: Tx, tenantId: string): Promise<CrmPipeline[]> {
  const pipelines = await tx<{ id: string; name: string; is_default: boolean; created_at: Date }[]>`
    SELECT id, name, is_default, created_at FROM crm_pipelines
    WHERE tenant_id = ${tenantId} ORDER BY is_default DESC, name ASC
  `
  const stages = await tx<StageRow[]>`
    SELECT id, pipeline_id, key, name, position, probability, is_won, is_lost
    FROM crm_pipeline_stages WHERE tenant_id = ${tenantId} ORDER BY position ASC
  `

  return pipelines.map((pipeline) =>
    crmPipelineSchema.parse({
      id: pipeline.id,
      name: pipeline.name,
      isDefault: pipeline.is_default,
      stages: stages.filter((stage) => stage.pipeline_id === pipeline.id).map(toStage),
      createdAt: pipeline.created_at,
    }),
  )
}

export async function findPipelineById(tx: Tx, tenantId: string, id: string): Promise<CrmPipeline | null> {
  const pipelines = await listPipelines(tx, tenantId)
  return pipelines.find((pipeline) => pipeline.id === id) ?? null
}

/**
 * The default pipeline, created on first use.
 *
 * Seeding lazily rather than at tenant creation keeps CRM out of the signup
 * path — a workspace that never opens the CRM never grows CRM rows.
 */
export async function ensureDefaultPipeline(tx: Tx, tenantId: string): Promise<CrmPipeline> {
  const [existing] = await tx<{ id: string }[]>`
    SELECT id FROM crm_pipelines WHERE tenant_id = ${tenantId} AND is_default LIMIT 1
  `
  if (existing) {
    const pipeline = await findPipelineById(tx, tenantId, existing.id)
    if (pipeline) return pipeline
  }

  const [created] = await tx<{ id: string }[]>`
    INSERT INTO crm_pipelines (tenant_id, name, is_default) VALUES (${tenantId}, 'Sales', true)
    RETURNING id
  `
  const pipelineId = created!.id

  for (const [index, stage] of DEFAULT_PIPELINE_STAGES.entries()) {
    await tx`
      INSERT INTO crm_pipeline_stages (tenant_id, pipeline_id, key, name, position, probability, is_won, is_lost)
      VALUES (
        ${tenantId}, ${pipelineId}, ${stage.key}, ${stage.name}, ${index},
        ${stage.probability}, ${stage.isWon}, ${stage.isLost}
      )
    `
  }

  const pipeline = await findPipelineById(tx, tenantId, pipelineId)
  return pipeline!
}

export async function findStageByKey(
  tx: Tx,
  tenantId: string,
  pipelineId: string,
  key: string,
): Promise<CrmStage | null> {
  const [row] = await tx<StageRow[]>`
    SELECT id, pipeline_id, key, name, position, probability, is_won, is_lost
    FROM crm_pipeline_stages
    WHERE tenant_id = ${tenantId} AND pipeline_id = ${pipelineId} AND key = ${key}
    LIMIT 1
  `
  return row ? toStage(row) : null
}

// endregion

// region Deals

export async function listDeals(
  tx: Tx,
  tenantId: string,
  options: { pipelineId?: string; status?: 'open' | 'won' | 'lost'; limit?: number } = {},
): Promise<CrmDeal[]> {
  const rows = await tx<DealRow[]>`
    SELECT ${DEAL_SELECT(tx)}
    FROM crm_deals d
    JOIN crm_pipeline_stages s ON s.id = d.stage_id
    LEFT JOIN crm_contacts c ON c.id = d.contact_id
    WHERE d.tenant_id = ${tenantId}
      AND (${options.pipelineId ?? null}::uuid IS NULL OR d.pipeline_id = ${options.pipelineId ?? null})
      AND (${options.status ?? null}::text IS NULL OR d.status = ${options.status ?? null})
    ORDER BY s.position ASC, d.updated_at DESC
    LIMIT ${options.limit ?? 500}
  `
  return rows.map(toDeal)
}

export async function findDealById(tx: Tx, tenantId: string, id: string): Promise<CrmDeal | null> {
  const [row] = await tx<DealRow[]>`
    SELECT ${DEAL_SELECT(tx)}
    FROM crm_deals d
    JOIN crm_pipeline_stages s ON s.id = d.stage_id
    LEFT JOIN crm_contacts c ON c.id = d.contact_id
    WHERE d.tenant_id = ${tenantId} AND d.id = ${id}
    LIMIT 1
  `
  return row ? toDeal(row) : null
}

export async function insertDeal(
  tx: Tx,
  tenantId: string,
  input: {
    pipelineId: string
    stageId: string
    title: string
    valueCents?: number
    currency?: string
    contactId?: string | null
    companyId?: string | null
    leadId?: string | null
    expectedCloseOn?: string | null
  },
): Promise<CrmDeal> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO crm_deals (
      tenant_id, pipeline_id, stage_id, title, value_cents, currency,
      contact_id, company_id, lead_id, expected_close_on
    )
    VALUES (
      ${tenantId}, ${input.pipelineId}, ${input.stageId}, ${input.title},
      ${input.valueCents ?? 0}, ${input.currency ?? 'EUR'},
      ${input.contactId ?? null}, ${input.companyId ?? null}, ${input.leadId ?? null},
      ${input.expectedCloseOn ?? null}
    )
    RETURNING id
  `
  await tx`
    INSERT INTO crm_deal_stage_events (tenant_id, deal_id, from_stage_id, to_stage_id, created_by)
    VALUES (${tenantId}, ${row!.id}, NULL, ${input.stageId}, 'system')
  `
  const deal = await findDealById(tx, tenantId, row!.id)
  return deal!
}

export async function updateDeal(
  tx: Tx,
  tenantId: string,
  id: string,
  patch: { title?: string; valueCents?: number; expectedCloseOn?: string | null; contactId?: string | null },
): Promise<CrmDeal | null> {
  const rows = await tx<{ id: string }[]>`
    UPDATE crm_deals SET
      title             = COALESCE(${patch.title ?? null}::text, title),
      value_cents       = COALESCE(${patch.valueCents ?? null}::bigint, value_cents),
      expected_close_on = COALESCE(${patch.expectedCloseOn ?? null}::date, expected_close_on),
      contact_id        = COALESCE(${patch.contactId ?? null}::uuid, contact_id)
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING id
  `
  return rows.length ? findDealById(tx, tenantId, id) : null
}

/**
 * Move a deal to another stage.
 *
 * One statement sets the new stage, the derived status and the stage clock;
 * a second appends the history row carrying how long the previous stage took.
 * Both are inside the caller's transaction, so a move is never half-recorded.
 */
export async function moveDealToStage(
  tx: Tx,
  tenantId: string,
  id: string,
  stage: CrmStage,
  options: { reason?: string; createdBy?: string } = {},
): Promise<{ deal: CrmDeal; fromStageId: string | null; durationSeconds: number } | null> {
  const [previous] = await tx<{ stage_id: string; stage_entered_at: Date }[]>`
    SELECT stage_id, stage_entered_at FROM crm_deals
    WHERE tenant_id = ${tenantId} AND id = ${id}
    LIMIT 1
  `
  if (!previous) return null

  const durationSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(previous.stage_entered_at).getTime()) / 1000),
  )
  const status = stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open'

  await tx`
    UPDATE crm_deals SET
      stage_id         = ${stage.id},
      status           = ${status},
      stage_entered_at = now(),
      closed_at        = ${status === 'open' ? null : new Date()}
    WHERE tenant_id = ${tenantId} AND id = ${id}
  `

  await tx`
    INSERT INTO crm_deal_stage_events (
      tenant_id, deal_id, from_stage_id, to_stage_id, duration_seconds, reason, created_by
    )
    VALUES (
      ${tenantId}, ${id}, ${previous.stage_id}, ${stage.id}, ${durationSeconds},
      ${options.reason ?? ''}, ${options.createdBy ?? 'system'}
    )
  `

  const deal = await findDealById(tx, tenantId, id)
  return deal ? { deal, fromStageId: previous.stage_id, durationSeconds } : null
}

/** Average seconds spent in each stage, from the append-only history. */
export async function averageTimeInStage(tx: Tx, tenantId: string): Promise<Map<string, number>> {
  const rows = await tx<{ from_stage_id: string | null; average: string | null }[]>`
    SELECT from_stage_id, avg(duration_seconds) AS average
    FROM crm_deal_stage_events
    WHERE tenant_id = ${tenantId} AND from_stage_id IS NOT NULL AND duration_seconds IS NOT NULL
    GROUP BY from_stage_id
  `
  const result = new Map<string, number>()
  for (const row of rows) {
    if (row.from_stage_id) result.set(row.from_stage_id, Math.round(Number(row.average ?? 0)))
  }
  return result
}

// endregion
