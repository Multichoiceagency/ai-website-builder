import type {
  AnalyticsAttributionCompareRow,
  AnalyticsBreakdownDimension,
  TrackingAttributionModel,
} from '@platform/schemas'
import type { JourneyTouchRow } from '../../db/repositories/analytics.js'
import { channelOf } from '../tracking/index.js'

/**
 * Attribution across more dimensions than the shared helper reports.
 *
 * `lib/tracking/attribution.ts` credits `channel × campaign`, which is the
 * canonical report and the one the model totals come from. The attribution
 * screen also asks "which landing page earned this", and a landing page is not
 * in that helper's output — so the same weighting is applied here over the
 * richer journey rows.
 *
 * The two are held together by a test: for the channel dimension, the numbers
 * produced here must equal the numbers the shared helper produces. If this file
 * ever drifts, that test fails rather than the dashboard quietly showing two
 * different truths.
 */

export const ATTRIBUTION_MODELS = ['first_click', 'last_click', 'linear'] as const

/**
 * How one conversion's credit is split across the touches that preceded it.
 *
 * Touches arrive ordered by session start, which is what makes "first" and
 * "last" mean anything here.
 */
export function touchWeights(model: TrackingAttributionModel, touchCount: number): number[] {
  if (touchCount === 0) return []
  if (model === 'linear') return Array.from({ length: touchCount }, () => 1 / touchCount)

  const weights = Array.from({ length: touchCount }, () => 0)
  weights[model === 'first_click' ? 0 : touchCount - 1] = 1
  return weights
}

/** Journey rows regrouped into one entry per conversion, touches in order. */
export function groupJourneys(rows: JourneyTouchRow[]): JourneyTouchRow[][] {
  const byConversion = new Map<string, JourneyTouchRow[]>()

  for (const row of rows) {
    const existing = byConversion.get(row.conversionId)
    if (existing) existing.push(row)
    else byConversion.set(row.conversionId, [row])
  }

  return [...byConversion.values()]
}

/**
 * The value a group of touches is crediting.
 *
 * Every row of a conversion carries the same conversion value; reading it from
 * the first touch rather than summing is what stops a three-session journey
 * from reporting triple revenue.
 */
function conversionValueOf(touches: JourneyTouchRow[]): number {
  return touches[0]?.conversionValue ?? 0
}

function keyOf(touch: JourneyTouchRow, dimension: AnalyticsBreakdownDimension): { key: string; label: string } {
  switch (dimension) {
    case 'source':
      return { key: touch.source || '(direct)', label: touch.source || '(direct)' }
    case 'medium':
      return { key: touch.medium || '(none)', label: touch.medium || '(none)' }
    case 'campaign':
      // A conversion from an untagged visit is not "no conversion"; it is a
      // conversion no campaign can claim, and it says so.
      return { key: touch.campaign || '(no campaign)', label: touch.campaign || '(no campaign)' }
    case 'landing_page':
      return { key: touch.landingPath || '/', label: touch.landingPath || '/' }
    case 'channel':
    default:
      return { key: channelOf(touch), label: channelOf(touch) }
  }
}

interface Accumulator {
  key: string
  label: string
  first_click: { conversions: number; value: number }
  last_click: { conversions: number; value: number }
  linear: { conversions: number; value: number }
}

/** Fractional credit is real; seventeen decimal places of it is noise. */
function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Credit one dimension under all three models in a single pass.
 *
 * One pass rather than three because the models must read exactly the same
 * journeys — running them over separately fetched data is how first-click and
 * last-click end up disagreeing about the total, which is a bug that looks
 * like an insight.
 */
export function attributeByDimension(
  journeys: JourneyTouchRow[][],
  dimension: AnalyticsBreakdownDimension,
): AnalyticsAttributionCompareRow[] {
  const buckets = new Map<string, Accumulator>()

  for (const touches of journeys) {
    const value = conversionValueOf(touches)
    const weightsByModel = {
      first_click: touchWeights('first_click', touches.length),
      last_click: touchWeights('last_click', touches.length),
      linear: touchWeights('linear', touches.length),
    }

    touches.forEach((touch, index) => {
      const { key, label } = keyOf(touch, dimension)
      const bucket = buckets.get(key) ?? {
        key,
        label,
        first_click: { conversions: 0, value: 0 },
        last_click: { conversions: 0, value: 0 },
        linear: { conversions: 0, value: 0 },
      }

      for (const model of ATTRIBUTION_MODELS) {
        const weight = weightsByModel[model][index] ?? 0
        if (weight === 0) continue
        bucket[model] = {
          conversions: bucket[model].conversions + weight,
          value: bucket[model].value + value * weight,
        }
      }

      buckets.set(key, bucket)
    })
  }

  return [...buckets.values()]
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      firstClick: { conversions: round(bucket.first_click.conversions, 3), value: round(bucket.first_click.value, 2) },
      lastClick: { conversions: round(bucket.last_click.conversions, 3), value: round(bucket.last_click.value, 2) },
      linear: { conversions: round(bucket.linear.conversions, 3), value: round(bucket.linear.value, 2) },
    }))
    .sort((a, b) => b.lastClick.conversions - a.lastClick.conversions || b.lastClick.value - a.lastClick.value)
}
