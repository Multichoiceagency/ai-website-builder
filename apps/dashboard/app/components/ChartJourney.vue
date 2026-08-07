<script setup lang="ts">
import { computed } from 'vue'

/**
 * One customer journey: the sessions that preceded a conversion, on a time
 * axis, with the credit each model would hand to each of them.
 *
 * The aggregate tables answer "which channel". This answers "what actually
 * happened to this person", which is what turns an attribution model from magic
 * into something arguable. Dot size encodes the selected model's weight, so
 * switching the model visibly moves the credit along the same timeline rather
 * than redrawing a different picture.
 */

export interface ChartJourneyTouch {
  sessionId: string
  channel: string
  campaign: string
  landingPath: string
  startedAt: string
  firstClick: number
  lastClick: number
  linear: number
}

const props = defineProps<{
  touches: ChartJourneyTouch[]
  convertedAt: string
  model: 'firstClick' | 'lastClick' | 'linear'
  modelLabel: string
  formatMoment: (iso: string) => string
}>()

// SVG `<title>` and `<desc>` are wired to the graphic by id, so the ids have
// to be unique per instance — several of these charts share a page.
const uid = `chart-journey-${Math.random().toString(36).slice(2, 9)}`
const titleId = `${uid}-title`
const descId = `${uid}-desc`

const WIDTH = 720
const HEIGHT = 74
const PADDING_X = 14
const TRACK_Y = 28

const times = computed(() => {
  const stamps = props.touches.map((touch) => new Date(touch.startedAt).getTime())
  const end = new Date(props.convertedAt).getTime()
  return { stamps, end, start: Math.min(end, ...stamps) }
})

/**
 * Position by real elapsed time, not by index. Two touches an hour apart and
 * two touches a month apart are different stories, and evenly spacing them
 * tells the same one twice.
 */
function positionOf(iso: string): number {
  const { start, end } = times.value
  const span = end - start
  const usable = WIDTH - PADDING_X * 2
  if (span <= 0) return PADDING_X + usable / 2
  return PADDING_X + ((new Date(iso).getTime() - start) / span) * usable
}

const drawn = computed(() =>
  props.touches.map((touch, index) => {
    const weight = touch[props.model]
    return {
      ...touch,
      index,
      x: positionOf(touch.startedAt),
      weight,
      radius: 4 + weight * 6,
      // A touch the model gives nothing to is still on the timeline — it
      // happened. It is just not what this model is willing to pay for.
      fill: weight > 0 ? 'var(--brand)' : 'var(--paper-raised)',
      stroke: weight > 0 ? 'var(--brand)' : 'var(--line-strong)',
    }
  }),
)

const conversionX = computed(() => WIDTH - PADDING_X)

const textAlternative = computed(() => {
  const parts = drawn.value.map(
    (touch) =>
      `${touch.channel}${touch.campaign ? ` (${touch.campaign})` : ''} on ${props.formatMoment(touch.startedAt)}, ${props.modelLabel} credit ${Math.round(touch.weight * 100)}%`,
  )
  return `Journey with ${props.touches.length} touch${props.touches.length === 1 ? '' : 'es'}, converting on ${props.formatMoment(props.convertedAt)}. ${parts.join('. ')}.`
})
</script>

<template>
  <figure class="m-0">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="block h-auto w-full"
      role="img"
      :aria-labelledby="`${titleId} ${descId}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <title :id="titleId">Customer journey, {{ modelLabel }} credit</title>
      <desc :id="descId">{{ textAlternative }}</desc>

      <g aria-hidden="true">
        <line
          :x1="PADDING_X"
          :x2="conversionX"
          :y1="TRACK_Y"
          :y2="TRACK_Y"
          stroke="var(--line-strong)"
          stroke-width="1.5"
        />

        <g v-for="touch in drawn" :key="touch.sessionId + touch.index">
          <circle
            :cx="touch.x"
            :cy="TRACK_Y"
            :r="touch.radius"
            :fill="touch.fill"
            :stroke="touch.stroke"
            stroke-width="1.5"
          />
          <text
            :x="touch.x"
            :y="TRACK_Y + 22"
            text-anchor="middle"
            font-size="11"
            fill="var(--ink-soft)"
          >
            {{ touch.channel }}
          </text>
          <text
            :x="touch.x"
            :y="TRACK_Y + 35"
            text-anchor="middle"
            font-size="10"
            fill="var(--ink-faint)"
            class="tabular-nums"
          >
            {{ Math.round(touch.weight * 100) }}%
          </text>
        </g>

        <!-- The conversion itself closes the line. -->
        <path
          :d="`M${conversionX - 5} ${TRACK_Y - 6} L${conversionX + 5} ${TRACK_Y} L${conversionX - 5} ${TRACK_Y + 6} Z`"
          fill="var(--positive)"
        />
        <text
          :x="conversionX"
          :y="TRACK_Y - 12"
          text-anchor="end"
          font-size="11"
          fill="var(--ink-faint)"
        >
          {{ formatMoment(convertedAt) }}
        </text>
      </g>
    </svg>
  </figure>
</template>
