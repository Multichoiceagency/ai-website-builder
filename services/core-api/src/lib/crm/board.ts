/**
 * The pipeline board and the forecast that sits on top of it.
 *
 * Pure functions over already-fetched rows: the numbers on the board, in the
 * overview and in an export are then the same numbers, because there is only
 * one place that computes them.
 */
import {
  crmPipelineBoardSchema,
  type CrmDeal,
  type CrmPipeline,
  type CrmPipelineBoard,
} from '@platform/schemas'

/**
 * Weighted forecast: Σ (open deal value × its stage's probability).
 *
 * Only open deals. A won deal is revenue, not a forecast, and adding it here
 * is how a pipeline number quietly starts double-counting the quarter.
 */
export function weightedForecastCents(deals: CrmDeal[]): number {
  return deals.reduce((total, deal) => (deal.status === 'open' ? total + deal.weightedValueCents : total), 0)
}

export function buildPipelineBoard(
  pipeline: CrmPipeline,
  deals: CrmDeal[],
  averageTimeInStage: Map<string, number> = new Map(),
  currency = 'EUR',
): CrmPipelineBoard {
  const columns = pipeline.stages.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stageId === stage.id)

    return {
      stage,
      deals: stageDeals,
      totalValueCents: stageDeals.reduce((total, deal) => total + deal.valueCents, 0),
      weightedValueCents: stageDeals.reduce((total, deal) => total + deal.weightedValueCents, 0),
      averageTimeInStageSeconds: averageTimeInStage.get(stage.id) ?? 0,
    }
  })

  const open = deals.filter((deal) => deal.status === 'open')

  return crmPipelineBoardSchema.parse({
    pipeline,
    columns,
    currency,
    openValueCents: open.reduce((total, deal) => total + deal.valueCents, 0),
    forecastCents: weightedForecastCents(deals),
    wonValueCents: deals
      .filter((deal) => deal.status === 'won')
      .reduce((total, deal) => total + deal.valueCents, 0),
  })
}
