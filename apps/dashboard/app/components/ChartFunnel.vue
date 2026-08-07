<script setup lang="ts">
import { computed } from 'vue'

/**
 * The funnel, drawn as inline SVG.
 *
 * Stages are membership, not path order — a visitor counts towards a stage if
 * they fired one of its events, whether or not they passed the stage above.
 * The caption says so, and the bars are drawn as independent widths rather than
 * a tapering silhouette, because a taper is a visual claim about sequence that
 * this data does not support.
 */

export interface ChartFunnelStep {
  key: string
  label: string
  events: string[]
  visitors: number
  rateFromStart: number | null
  rateFromPrevious: number | null
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    steps: ChartFunnelStep[]
    format?: (value: number) => string
    formatRate?: (value: number | null) => string
  }>(),
  {
    description: '',
    format: (value: number) => String(value),
    formatRate: (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`),
  },
)

// SVG `<title>` and `<desc>` are wired to the graphic by id, so the ids have
// to be unique per instance — several of these charts share a page.
const uid = `chart-funnel-${Math.random().toString(36).slice(2, 9)}`
const titleId = `${uid}-title`
const descId = `${uid}-desc`

const WIDTH = 760
const ROW_HEIGHT = 46
const BAR_HEIGHT = 26
const LABEL_WIDTH = 230

const height = computed(() => Math.max(ROW_HEIGHT, props.steps.length * ROW_HEIGHT))
const max = computed(() => Math.max(1, ...props.steps.map((step) => step.visitors)))
const barArea = computed(() => WIDTH - LABEL_WIDTH - 90)

const drawn = computed(() =>
  props.steps.map((step, index) => ({
    ...step,
    y: index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2,
    width: Math.max(step.visitors > 0 ? 2 : 0, (step.visitors / max.value) * barArea.value),
  })),
)

const hasData = computed(() => props.steps.some((step) => step.visitors > 0))

const textAlternative = computed(() => {
  if (!hasData.value) return `${props.title}: no visitors reached any stage in this range.`
  return `${props.title}. ${props.steps
    .map((step) => `${step.label}: ${props.format(step.visitors)} visitors (${props.formatRate(step.rateFromStart)} of the first stage)`)
    .join('. ')}.`
})
</script>

<template>
  <figure class="m-0">
    <figcaption class="mb-3">
      <h3 class="text-[0.9375rem] font-semibold text-ink">{{ title }}</h3>
      <p class="mt-0.5 text-[0.8125rem] text-soft">
        {{ description }}
      </p>
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
        <g v-for="step in drawn" :key="step.key">
          <text
            :x="0"
            :y="step.y + BAR_HEIGHT / 2 + 4"
            font-size="13"
            fill="var(--ink)"
          >
            {{ step.label }}
          </text>

          <rect
            :x="LABEL_WIDTH"
            :y="step.y"
            :width="barArea"
            :height="BAR_HEIGHT"
            rx="4"
            fill="var(--paper-sunken)"
          />
          <rect
            :x="LABEL_WIDTH"
            :y="step.y"
            :width="step.width"
            :height="BAR_HEIGHT"
            rx="4"
            fill="var(--brand)"
            :opacity="step.visitors === 0 ? 0 : 0.9"
          />

          <text
            :x="WIDTH"
            :y="step.y + BAR_HEIGHT / 2 + 4"
            text-anchor="end"
            font-size="13"
            fill="var(--ink)"
            class="tabular-nums"
          >
            {{ format(step.visitors) }}
          </text>
          <text
            :x="WIDTH - 62"
            :y="step.y + BAR_HEIGHT / 2 + 4"
            text-anchor="end"
            font-size="12"
            fill="var(--ink-faint)"
            class="tabular-nums"
          >
            {{ formatRate(step.rateFromStart) }}
          </text>
        </g>
      </g>
    </svg>

    <details class="mt-3 text-[0.8125rem]">
      <summary class="cursor-pointer text-soft transition-colors hover:text-ink">
        Show these numbers, and what each stage counts
      </summary>
      <div class="mt-2 overflow-x-auto rounded-lg border border-line">
        <table class="w-full min-w-[34rem] border-collapse text-left text-[0.8125rem]">
          <caption class="sr-only">{{ title }}</caption>
          <thead>
            <tr class="border-b border-line bg-sunken">
              <th scope="col" class="px-3 py-2 font-semibold text-faint">Stage</th>
              <th scope="col" class="px-3 py-2 font-semibold text-faint">Counts these events</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold text-faint">Visitors</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold text-faint">Of first stage</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold text-faint">Of previous stage</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="step in steps" :key="step.key" class="border-b border-line last:border-0">
              <th scope="row" class="px-3 py-1.5 font-medium text-ink">{{ step.label }}</th>
              <td class="px-3 py-1.5 text-soft">{{ step.events.join(', ') }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums text-ink">{{ format(step.visitors) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums text-soft">{{ formatRate(step.rateFromStart) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums text-soft">{{ formatRate(step.rateFromPrevious) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
