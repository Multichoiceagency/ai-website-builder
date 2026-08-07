<script setup lang="ts">
import { computed } from 'vue'

/**
 * The same rows credited by several attribution models, side by side.
 *
 * Grouped bars rather than a model switcher on purpose: the disagreement
 * between first-click and last-click is the most useful thing attribution has
 * to say, and showing one model at a time hides exactly that. A channel whose
 * three bars are wildly different is a channel whose value depends entirely on
 * a modelling choice — which is something the person spending the budget should
 * see, not something the dashboard should quietly pick for them.
 */

export interface ChartCompareSeries {
  key: string
  label: string
}

export interface ChartCompareRow {
  key: string
  label: string
  values: Record<string, number>
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    series: ChartCompareSeries[]
    rows: ChartCompareRow[]
    format?: (value: number) => string
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    description: '',
    format: (value: number) => String(value),
    emptyTitle: 'Nothing to attribute yet',
    emptyDescription: 'A conversion with at least one recorded session will appear here.',
  },
)

// SVG `<title>` and `<desc>` are wired to the graphic by id, so the ids have
// to be unique per instance — several of these charts share a page.
const uid = `chart-compare-${Math.random().toString(36).slice(2, 9)}`
const titleId = `${uid}-title`
const descId = `${uid}-desc`

const WIDTH = 760
const LABEL_WIDTH = 210
const BAR_HEIGHT = 12
const BAR_GAP = 3
const ROW_PADDING = 16

const rowHeight = computed(() => props.series.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP + ROW_PADDING)
const height = computed(() => Math.max(rowHeight.value, props.rows.length * rowHeight.value))
const barArea = computed(() => WIDTH - LABEL_WIDTH - 80)

const max = computed(() =>
  Math.max(1, ...props.rows.flatMap((row) => props.series.map((series) => row.values[series.key] ?? 0))),
)

/** Accent for the leading model, ink tones for the rest — one ink, one accent. */
function fillFor(index: number): string {
  if (index === 0) return 'var(--brand)'
  return index === 1 ? 'var(--ink-soft)' : 'var(--ink-faint)'
}

const drawn = computed(() =>
  props.rows.map((row, rowIndex) => ({
    ...row,
    bars: props.series.map((series, seriesIndex) => {
      const value = row.values[series.key] ?? 0
      return {
        key: series.key,
        label: series.label,
        value,
        y: rowIndex * rowHeight.value + ROW_PADDING / 2 + seriesIndex * (BAR_HEIGHT + BAR_GAP),
        width: value > 0 ? Math.max(2, (value / max.value) * barArea.value) : 0,
        fill: fillFor(seriesIndex),
      }
    }),
    labelY: rowIndex * rowHeight.value + rowHeight.value / 2 + 4,
  })),
)

const textAlternative = computed(() => {
  if (!props.rows.length) return `${props.title}: ${props.emptyDescription}`
  return `${props.title}. ${props.rows
    .map(
      (row) =>
        `${row.label} — ${props.series
          .map((series) => `${series.label} ${props.format(row.values[series.key] ?? 0)}`)
          .join(', ')}`,
    )
    .join('. ')}.`
})
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
          v-for="(entry, index) in series"
          :key="entry.key"
          class="flex items-center gap-1.5 text-[0.8125rem] text-soft"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-sm"
            :style="{ backgroundColor: fillFor(index) }"
            aria-hidden="true"
          />
          {{ entry.label }}
        </li>
      </ul>
    </figcaption>

    <p
      v-if="!rows.length"
      class="rounded-lg border border-dashed border-line-strong bg-sunken/40 px-4 py-8 text-center text-sm text-soft"
    >
      <span class="block font-medium text-ink">{{ emptyTitle }}</span>
      {{ emptyDescription }}
    </p>

    <svg
      v-else
      :viewBox="`0 0 ${WIDTH} ${height}`"
      class="block h-auto w-full"
      role="img"
      :aria-labelledby="`${titleId} ${descId}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <title :id="titleId">{{ title }}</title>
      <desc :id="descId">{{ textAlternative }}</desc>

      <g aria-hidden="true">
        <g v-for="row in drawn" :key="row.key">
          <text :x="0" :y="row.labelY" font-size="13" fill="var(--ink)">{{ row.label }}</text>
          <rect
            v-for="bar in row.bars"
            :key="bar.key"
            :x="LABEL_WIDTH"
            :y="bar.y"
            :width="bar.width"
            :height="BAR_HEIGHT"
            rx="2"
            :fill="bar.fill"
          />
          <text
            :x="WIDTH"
            :y="row.labelY"
            text-anchor="end"
            font-size="12"
            fill="var(--ink-faint)"
            class="tabular-nums"
          >
            {{ format(row.values[series[0]!.key] ?? 0) }}
          </text>
        </g>
      </g>
    </svg>

    <details v-if="rows.length" class="mt-3 text-[0.8125rem]">
      <summary class="cursor-pointer text-soft transition-colors hover:text-ink">
        Show every model’s figure as a table
      </summary>
      <div class="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
        <table class="w-full border-collapse text-left text-[0.8125rem]">
          <caption class="sr-only">{{ title }}</caption>
          <thead>
            <tr class="border-b border-line bg-sunken">
              <th scope="col" class="px-3 py-2 font-semibold text-faint">Name</th>
              <th
                v-for="entry in series"
                :key="entry.key"
                scope="col"
                class="px-3 py-2 text-right font-semibold text-faint"
              >
                {{ entry.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" class="border-b border-line last:border-0">
              <th scope="row" class="px-3 py-1.5 font-normal text-ink">{{ row.label }}</th>
              <td v-for="entry in series" :key="entry.key" class="px-3 py-1.5 text-right tabular-nums text-soft">
                {{ format(row.values[entry.key] ?? 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
