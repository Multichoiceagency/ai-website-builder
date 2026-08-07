/**
 * From counts to a verdict.
 *
 * The rule this file exists to enforce: a winner requires *both* a real
 * significance calculation and a minimum sample per arm. Missing either, the
 * answer is "not yet" — reported as such, in the status and in the prose.
 */
import {
  experimentResultsSchema,
  type ExperimentAnalysisStatus,
  type ExperimentResults,
  type ExperimentTargetMetric,
  type VariantResult,
} from '@platform/schemas'
import { twoProportionZTest, varianceFromSums, welchTTest } from './statistics.js'

/** Raw per-variant aggregates, exactly as the repository produces them. */
export interface VariantStats {
  variantId: string
  key: string
  name: string
  isControl: boolean
  /** Unique visitors exposed. */
  exposures: number
  /** Unique visitors who converted at least once. */
  conversions: number
  /** Total revenue in major units. */
  revenue: number
  /** Sum of per-visitor revenue squared, for the variance. */
  revenueSumOfSquares: number
}

export interface AnalysisInput {
  experimentId: string
  targetMetric: ExperimentTargetMetric
  confidenceLevel: number
  minimumSamplePerVariant: number
  stats: readonly VariantStats[]
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

/** Relative lift. Undefined against a zero baseline, so it stays null there. */
function relativeUplift(baseline: number, candidate: number): number | null {
  if (baseline <= 0) return null
  return (candidate - baseline) / baseline
}

function metricValue(stats: VariantStats, targetMetric: ExperimentTargetMetric): number {
  return targetMetric === 'revenue'
    ? ratio(stats.revenue, stats.exposures)
    : ratio(stats.conversions, stats.exposures)
}

function significanceAgainstControl(
  control: VariantStats,
  candidate: VariantStats,
  targetMetric: ExperimentTargetMetric,
): number | null {
  if (targetMetric === 'revenue') {
    const controlMean = ratio(control.revenue, control.exposures)
    const candidateMean = ratio(candidate.revenue, candidate.exposures)

    const test = welchTTest(
      {
        count: control.exposures,
        mean: controlMean,
        variance: varianceFromSums(control.exposures, control.revenue, control.revenueSumOfSquares),
      },
      {
        count: candidate.exposures,
        mean: candidateMean,
        variance: varianceFromSums(candidate.exposures, candidate.revenue, candidate.revenueSumOfSquares),
      },
    )
    return test?.pValue ?? null
  }

  const test = twoProportionZTest(
    { trials: control.exposures, successes: control.conversions },
    { trials: candidate.exposures, successes: candidate.conversions },
  )
  return test?.pValue ?? null
}

function describe(
  status: ExperimentAnalysisStatus,
  input: AnalysisInput,
  smallestSample: number,
  winner: VariantResult | null,
): string {
  const confidence = `${(input.confidenceLevel * 100).toFixed(1)}%`

  if (status === 'running') {
    const missing = Math.max(0, input.minimumSamplePerVariant - smallestSample)
    return `Still collecting. The thinnest variant has ${smallestSample} of the ${input.minimumSamplePerVariant} visitors required, ${missing} to go. No result is reported before that.`
  }

  if (status === 'winner_found' && winner) {
    const upliftText = winner.uplift === null ? 'a higher' : `a ${(winner.uplift * 100).toFixed(1)}% higher`
    return `${winner.name} beats the control with ${upliftText} ${input.targetMetric === 'revenue' ? 'revenue per visitor' : 'conversion rate'} (p = ${winner.pValue?.toFixed(4) ?? 'n/a'}, ${confidence} confidence).`
  }

  return `Enough data, no winner. No variant differs from the control at ${confidence} confidence — running longer may resolve it, or the change genuinely makes no difference.`
}

/**
 * Compute results. Pure, so the same input always yields the same verdict and
 * the whole thing is testable without a database.
 */
export function analyseExperiment(input: AnalysisInput): ExperimentResults {
  const alpha = 1 - input.confidenceLevel
  const control = input.stats.find((candidate) => candidate.isControl) ?? input.stats[0] ?? null

  const smallestSample = input.stats.length
    ? Math.min(...input.stats.map((candidate) => candidate.exposures))
    : 0
  const totalExposures = input.stats.reduce((sum, candidate) => sum + candidate.exposures, 0)

  // Two arms is the minimum that can be compared at all; below the per-arm
  // gate nothing is reported regardless of how tempting the numbers look.
  const sampleGateMet =
    input.stats.length >= 2 && smallestSample >= input.minimumSamplePerVariant && control !== null

  const variants: VariantResult[] = input.stats.map((candidate) => {
    const conversionRate = ratio(candidate.conversions, candidate.exposures)
    const revenuePerVisitor = ratio(candidate.revenue, candidate.exposures)

    if (!control || candidate.variantId === control.variantId) {
      return {
        variantId: candidate.variantId,
        key: candidate.key,
        name: candidate.name,
        isControl: candidate.isControl,
        exposures: candidate.exposures,
        conversions: candidate.conversions,
        conversionRate,
        revenue: candidate.revenue,
        revenuePerVisitor,
        uplift: null,
        pValue: null,
        significant: false,
      }
    }

    const pValue = significanceAgainstControl(control, candidate, input.targetMetric)
    const uplift = relativeUplift(
      metricValue(control, input.targetMetric),
      metricValue(candidate, input.targetMetric),
    )

    return {
      variantId: candidate.variantId,
      key: candidate.key,
      name: candidate.name,
      isControl: candidate.isControl,
      exposures: candidate.exposures,
      conversions: candidate.conversions,
      conversionRate,
      revenue: candidate.revenue,
      revenuePerVisitor,
      uplift,
      pValue,
      // A significant *loss* is a real finding too, so direction is not part of
      // this flag — it is part of picking the winner, below.
      significant: sampleGateMet && pValue !== null && pValue < alpha,
    }
  })

  const winner = sampleGateMet
    ? (variants
        .filter((candidate) => !candidate.isControl && candidate.significant && (candidate.uplift ?? 0) > 0)
        .sort(
          (a, b) =>
            (input.targetMetric === 'revenue' ? b.revenuePerVisitor : b.conversionRate) -
            (input.targetMetric === 'revenue' ? a.revenuePerVisitor : a.conversionRate),
        )[0] ?? null)
    : null

  const status: ExperimentAnalysisStatus = !sampleGateMet
    ? 'running'
    : winner
      ? 'winner_found'
      : 'not_conclusive'

  return experimentResultsSchema.parse({
    experimentId: input.experimentId,
    status,
    targetMetric: input.targetMetric,
    confidenceLevel: input.confidenceLevel,
    minimumSamplePerVariant: input.minimumSamplePerVariant,
    smallestSample,
    totalExposures,
    sampleGateMet,
    winner,
    variants,
    summary: describe(status, input, smallestSample, winner),
  })
}
