<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import type { AnalyticsOverview } from '@platform/schemas'

/**
 * Shopify-style home analytics: KPI tabs + selected metric over time
 * (current solid, previous dashed).
 */

const props = defineProps<{
  overview: AnalyticsOverview
}>()

const chartFailed = ref(false)
onErrorCaptured(() => {
  chartFailed.value = true
  return false
})

const { formatCount, formatChange, formatAmount, formatRatio, formatDayLabel } = useAnalyticsFormat()

type MetricKey = 'sessions' | 'revenue' | 'orders' | 'conversionRate'

const active = ref<MetricKey>('sessions')

const tabs = computed(() => {
  const m = props.overview.metrics
  const currency = props.overview.currency
  return [
    {
      key: 'sessions' as const,
      label: 'Sessions',
      value: formatCount(m.sessions.current),
      change: formatChange(m.sessions.changePct, props.overview.range.days),
    },
    {
      key: 'revenue' as const,
      label: 'Total sales',
      value: formatAmount(m.revenue.current, currency),
      change: currency ? formatChange(m.revenue.changePct, props.overview.range.days) : '—',
    },
    {
      key: 'orders' as const,
      label: 'Orders',
      value: formatCount(m.orders.current),
      change: formatChange(m.orders.changePct, props.overview.range.days),
    },
    {
      key: 'conversionRate' as const,
      label: 'Conversion rate',
      value: formatRatio(m.conversionRate.current, 1),
      change: formatChange(m.conversionRate.changePct, props.overview.range.days),
    },
  ]
})

const activeTab = computed(() => tabs.value.find((tab) => tab.key === active.value) ?? tabs.value[0]!)

const seriesKey = computed(() => {
  if (active.value === 'conversionRate') return 'conversions'
  if (active.value === 'revenue') return 'revenue'
  if (active.value === 'orders') return 'conversions'
  return 'sessions'
})

const chartPoints = computed(() => {
  const current = props.overview.series
  const previous = props.overview.previousSeries ?? []
  const key = seriesKey.value

  return current.map((point, index) => {
    const prev = previous[index]
    const pick = (row: typeof point | undefined) => {
      if (!row) return 0
      if (active.value === 'conversionRate') {
        return row.sessions > 0 ? row.conversions / row.sessions : 0
      }
      if (key === 'sessions') return row.sessions
      if (key === 'revenue') return row.revenue
      return row.conversions
    }
    return {
      label: formatDayLabel(point.date),
      values: {
        current: pick(point),
        previous: pick(prev),
      },
    }
  })
})

const chartFormat = computed(() => {
  if (active.value === 'revenue') {
    return (value: number) => formatAmount(value, props.overview.currency)
  }
  if (active.value === 'conversionRate') {
    return (value: number) => formatRatio(value, 1)
  }
  return (value: number) => formatCount(value)
})

const rangeLabel = computed(() => {
  const r = props.overview.range
  return `${formatDayLabel(r.from.slice(0, 10))} – ${formatDayLabel(r.to.slice(0, 10))}`
})

const previousRangeLabel = computed(() => {
  const r = props.overview.range
  return `${formatDayLabel(r.previousFrom.slice(0, 10))} – ${formatDayLabel(r.previousTo.slice(0, 10))}`
})
</script>

<template>
  <UiCard class="!p-0 overflow-hidden">
    <div class="flex flex-wrap gap-1 border-b border-line p-2 sm:p-3">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="min-w-[7.5rem] flex-1 rounded-xl px-3 py-2.5 text-left transition-colors sm:flex-none"
        :class="active === tab.key ? 'bg-sunken shadow-sm' : 'hover:bg-sunken/60'"
        :aria-pressed="active === tab.key"
        @click="active = tab.key"
      >
        <p class="text-[0.6875rem] font-medium uppercase tracking-wide text-faint">{{ tab.label }}</p>
        <p class="mt-1 flex items-baseline gap-2 text-[1.125rem] font-semibold tabular-nums text-ink">
          {{ tab.value }}
          <span class="text-[0.75rem] font-medium text-soft">{{ tab.change }}</span>
        </p>
      </button>
    </div>

    <div class="p-4 sm:p-5">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-[0.9375rem] font-semibold text-ink">{{ activeTab.label }} over time</h2>
          <p class="mt-1 flex items-baseline gap-2 text-[1.25rem] font-semibold tabular-nums text-ink">
            {{ activeTab.value }}
            <span class="text-[0.8125rem] font-medium text-soft">{{ activeTab.change }}</span>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton size="sm" to="/analytics">Analytics</UiButton>
          <UiButton size="sm" to="/analytics/live">Live</UiButton>
          <UiButton size="sm" to="/analytics/google">Google Analytics</UiButton>
        </div>
      </div>

      <p
        v-if="chartFailed"
        class="rounded-lg bg-sunken px-3 py-8 text-center text-[0.8125rem] text-soft"
        role="status"
      >
        Chart could not render — KPI tabs above still work.
      </p>
      <ChartLine
        v-else
        :title="`${activeTab.label} over time`"
        :description="`Compared with the previous ${overview.range.days} days.`"
        :series="[
          { key: 'current', label: rangeLabel, emphasis: true },
          { key: 'previous', label: previousRangeLabel, dashed: true },
        ]"
        :points="chartPoints"
        :format="chartFormat"
        :height="220"
        empty-message="No events in this range yet."
      />
    </div>
  </UiCard>
</template>
