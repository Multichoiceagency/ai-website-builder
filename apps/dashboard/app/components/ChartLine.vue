<script setup lang="ts">
import { computed } from 'vue'

/**
 * A time series, drawn as inline SVG.
 *
 * No charting library: these are polylines, and a dependency that draws
 * polylines costs more in bundle size than the whole analytics module. It also
 * means the chart obeys the design tokens directly instead of being themed
 * through someone else's abstraction.
 *
 * Accessibility is not an afterthought here. The SVG carries a `<title>` and a
 * `<desc>` holding the actual figures, and the same numbers are available as a
 * real table underneath. A chart a screen reader cannot read is a chart that
 * only works for some of the people who need it.
 */

export interface ChartLineSeries {
  key: string
  label: string
  /** The filled, accent-coloured series. At most one. */
  emphasis?: boolean
  /** Dashed stroke (previous-period compare). */
  dashed?: boolean
}

export interface ChartLinePoint {
  /** The axis label, already formatted for humans. */
  label: string
  values: Record<string, number>
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    series: ChartLineSeries[]
    points: ChartLinePoint[]
    /** Formats a value for the axis, the description and the table. */
    format?: (value: number) => string
    height?: number
    /** Text shown in place of the plot when nothing was recorded. */
    emptyMessage?: string
  }>(),
  {
    description: '',
    format: (value: number) => String(value),
    height: 210,
    emptyMessage: 'No events were recorded in this range.',
  },
)

// SVG `<title>` and `<desc>` are wired to the graphic by id, so the ids have
// to be unique per instance — several of these charts share a page.
const uid = `chart-line-${Math.random().toString(36).slice(2, 9)}`
const titleId = `${uid}-title`
const descId = `${uid}-desc`

const WIDTH = 760
const PADDING = { top: 14, right: 14, bottom: 28, left: 56 }

const plot = computed(() => ({
  width: WIDTH - PADDING.left - PADDING.right,
  height: props.height - PADDING.top - PADDING.bottom,
}))

const allValues = computed(() =>
  props.points.flatMap((point) => props.series.map((series) => point.values[series.key] ?? 0)),
)

const hasData = computed(() => allValues.value.some((value) => value > 0))

/**
 * A rounded ceiling for the axis. Scaling exactly to the maximum puts the peak
 * on the frame and makes every chart look like it is about to overflow.
 */
const scaleMax = computed(() => {
  const max = Math.max(0, ...allValues.value)
  if (max <= 0) return 1

  const magnitude = 10 ** Math.floor(Math.log10(max))
  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]
  const step = steps.find((candidate) => max <= candidate * magnitude) ?? 10
  return step * magnitude
})

function x(index: number): number {
  const count = props.points.length
  if (count <= 1) return PADDING.left + plot.value.width / 2
  return PADDING.left + (index / (count - 1)) * plot.value.width
}

function y(value: number): number {
  return PADDING.top + (1 - value / scaleMax.value) * plot.value.height
}

const baseline = computed(() => PADDING.top + plot.value.height)

const gridLines = computed(() =>
  [1, 0.5, 0].map((fraction) => ({
    fraction,
    y: y(scaleMax.value * fraction),
    label: props.format(scaleMax.value * fraction),
  })),
)

interface DrawnSeries extends ChartLineSeries {
  line: string
  area: string
  dots: { cx: number; cy: number }[]
  total: number
  peak: { value: number; label: string } | null
}

const drawn = computed<DrawnSeries[]>(() =>
  props.series.map((series) => {
    const values = props.points.map((point) => point.values[series.key] ?? 0)
    const coordinates = values.map((value, index) => ({ cx: x(index), cy: y(value) }))

    const line = coordinates
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.cx.toFixed(2)} ${point.cy.toFixed(2)}`)
      .join(' ')

    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    const area =
      first && last
        ? `${line} L${last.cx.toFixed(2)} ${baseline.value} L${first.cx.toFixed(2)} ${baseline.value} Z`
        : ''

    let peakIndex = -1
    values.forEach((value, index) => {
      if (peakIndex === -1 || value > (values[peakIndex] ?? 0)) peakIndex = index
    })

    return {
      ...series,
      line,
      area,
      // Individual points become noise past a few dozen; the line already
      // carries the shape by then.
      dots: coordinates.length <= 32 ? coordinates : [],
      total: values.reduce((sum, value) => sum + value, 0),
      peak:
        peakIndex >= 0 && (values[peakIndex] ?? 0) > 0
          ? { value: values[peakIndex]!, label: props.points[peakIndex]!.label }
          : null,
    }
  }),
)

/** Only the ends and the middle: a label per day is unreadable at any width. */
const axisLabels = computed(() => {
  const count = props.points.length
  if (count === 0) return []
  const indices = count <= 2 ? [0, count - 1] : [0, Math.floor((count - 1) / 2), count - 1]
  return [...new Set(indices)].map((index) => ({
    index,
    x: x(index),
    label: props.points[index]!.label,
    anchor: index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle',
  }))
})

/** The sentence a screen reader hears in place of the picture. */
const textAlternative = computed(() => {
  if (!props.points.length) return `${props.title}: no data.`
  if (!hasData.value) return `${props.title}: ${props.emptyMessage}`

  const range = `${props.points[0]!.label} to ${props.points[props.points.length - 1]!.label}`
  const parts = drawn.value.map((series) => {
    const peak = series.peak ? `, highest ${props.format(series.peak.value)} on ${series.peak.label}` : ''
    return `${series.label}: ${props.format(series.total)} in total${peak}`
  })
  return `${props.title}, ${range}. ${parts.join('. ')}.`
})

function strokeFor(series: DrawnSeries, index: number): string {
  if (series.emphasis || index === 0) return 'var(--brand)'
  return index === 1 ? 'var(--ink-soft)' : 'var(--ink-faint)'
}

function dashFor(series: DrawnSeries, index: number): string | undefined {
  if (series.dashed) return '5 4'
  return index >= 2 ? '5 4' : undefined
}
</script>

<template>
  <figure class="m-0">
    <figcaption class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h3 class="text-[0.9375rem] font-semibold text-ink">{{ title }}</h3>
        <p v-if="description" class="mt-0.5 text-[0.8125rem] text-soft">{{ description }}</p>
      </div>

      <ul class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li
          v-for="(entry, index) in drawn"
          :key="entry.key"
          class="flex items-center gap-1.5 text-[0.8125rem] text-soft"
        >
          <span
            class="h-0.5 w-4 shrink-0 rounded-full"
            :style="{
              backgroundColor: strokeFor(entry, index),
              opacity: index >= 2 ? 0.8 : 1,
            }"
            aria-hidden="true"
          />
          {{ entry.label }}
          <span class="tabular-nums text-faint">{{ format(entry.total) }}</span>
        </li>
      </ul>
    </figcaption>

    <svg
      :viewBox="`0 0 ${WIDTH} ${height}`"
      class="block h-auto w-full"
      role="img"
      :aria-labelledby="`${titleId} ${descId}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <title :id="titleId">{{ title }}</title>
      <desc :id="descId">{{ textAlternative }}</desc>

      <g aria-hidden="true">
        <g v-for="line in gridLines" :key="line.fraction">
          <line
            :x1="PADDING.left"
            :x2="WIDTH - PADDING.right"
            :y1="line.y"
            :y2="line.y"
            stroke="var(--line)"
            stroke-width="1"
          />
          <text
            :x="PADDING.left - 10"
            :y="line.y + 4"
            text-anchor="end"
            font-size="11"
            fill="var(--ink-faint)"
            class="tabular-nums"
          >
            {{ line.label }}
          </text>
        </g>

        <template v-if="hasData">
          <g v-for="(entry, index) in drawn" :key="entry.key">
            <path
              v-if="(entry.emphasis || index === 0) && !entry.dashed && entry.area"
              :d="entry.area"
              :fill="strokeFor(entry, index)"
              opacity="0.08"
            />
            <path
              :d="entry.line"
              fill="none"
              :stroke="strokeFor(entry, index)"
              :stroke-dasharray="dashFor(entry, index)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              v-for="(dot, dotIndex) in entry.dots"
              v-show="!entry.dashed"
              :key="dotIndex"
              :cx="dot.cx"
              :cy="dot.cy"
              r="2.5"
              :fill="strokeFor(entry, index)"
            />
          </g>
        </template>

        <text
          v-else
          :x="PADDING.left + plot.width / 2"
          :y="PADDING.top + plot.height / 2"
          text-anchor="middle"
          font-size="13"
          fill="var(--ink-faint)"
        >
          {{ emptyMessage }}
        </text>

        <text
          v-for="label in axisLabels"
          :key="label.index"
          :x="label.x"
          :y="height - 8"
          :text-anchor="label.anchor"
          font-size="11"
          fill="var(--ink-faint)"
        >
          {{ label.label }}
        </text>
      </g>
    </svg>

    <details class="mt-3 text-[0.8125rem]">
      <summary class="cursor-pointer text-soft transition-colors hover:text-ink">
        Show these numbers as a table
      </summary>
      <div class="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
        <table class="w-full border-collapse text-left text-[0.8125rem]">
          <caption class="sr-only">{{ title }}</caption>
          <thead>
            <tr class="border-b border-line bg-sunken">
              <th scope="col" class="px-3 py-2 font-semibold text-faint">Period</th>
              <th v-for="entry in series" :key="entry.key" scope="col" class="px-3 py-2 font-semibold text-faint">
                {{ entry.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(point, index) in points" :key="index" class="border-b border-line last:border-0">
              <th scope="row" class="px-3 py-1.5 font-normal text-soft">{{ point.label }}</th>
              <td v-for="entry in series" :key="entry.key" class="px-3 py-1.5 tabular-nums text-ink">
                {{ format(point.values[entry.key] ?? 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
