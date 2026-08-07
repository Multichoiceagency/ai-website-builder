import type { TrackingAttributionModel, TrackingAttributionRow } from '@platform/schemas'
import type { ConversionTouchRow } from '../../db/repositories/tracking.js'
import { channelOf } from './normalize.js'

/**
 * Attribution models (§28).
 *
 * All three read the same session → conversion join, so the only thing that
 * differs between them is how one conversion's credit is split across the
 * touches that preceded it. That is the point: when first-click and last-click
 * disagree, the disagreement is the model, not two different datasets.
 */

interface Bucket {
  source: string
  medium: string
  campaign: string
  conversions: number
  value: number
}

/**
 * Split one conversion across its touches.
 *
 * `first_click` gives everything to the session that started the journey,
 * `last_click` to the one that closed it, `linear` divides equally. Touches
 * arrive ordered by session start, which is what makes "first" and "last"
 * meaningful here.
 */
function weightsFor(model: TrackingAttributionModel, touchCount: number): number[] {
  if (touchCount === 0) return []

  if (model === 'linear') return Array.from({ length: touchCount }, () => 1 / touchCount)

  const weights = Array.from({ length: touchCount }, () => 0)
  weights[model === 'first_click' ? 0 : touchCount - 1] = 1
  return weights
}

export interface AttributionResult {
  rows: TrackingAttributionRow[]
  /** Conversions that had at least one session to credit. */
  attributedConversions: number
  attributedValue: number
}

export function attribute(model: TrackingAttributionModel, touches: ConversionTouchRow[]): AttributionResult {
  const byConversion = new Map<string, ConversionTouchRow[]>()

  for (const touch of touches) {
    const existing = byConversion.get(touch.conversionId)
    if (existing) existing.push(touch)
    else byConversion.set(touch.conversionId, [touch])
  }

  const buckets = new Map<string, Bucket>()
  let attributedConversions = 0
  let attributedValue = 0

  for (const conversionTouches of byConversion.values()) {
    const weights = weightsFor(model, conversionTouches.length)
    const value = conversionTouches[0]?.conversionValue ?? 0

    attributedConversions += 1
    attributedValue += value

    conversionTouches.forEach((touch, index) => {
      const weight = weights[index] ?? 0
      if (weight === 0) return

      const key = `${channelOf(touch)}|${touch.campaign}`
      const bucket = buckets.get(key) ?? {
        source: touch.source,
        medium: touch.medium,
        campaign: touch.campaign,
        conversions: 0,
        value: 0,
      }

      buckets.set(key, {
        ...bucket,
        conversions: bucket.conversions + weight,
        value: bucket.value + value * weight,
      })
    })
  }

  const rows = [...buckets.values()]
    .map((bucket) => ({
      channel: channelOf(bucket),
      source: bucket.source,
      medium: bucket.medium,
      campaign: bucket.campaign,
      // Fractional credit is real but 17 decimal places is noise.
      conversions: Math.round(bucket.conversions * 1000) / 1000,
      value: Math.round(bucket.value * 100) / 100,
    }))
    .sort((a, b) => b.conversions - a.conversions || b.value - a.value)

  return { rows, attributedConversions, attributedValue }
}
