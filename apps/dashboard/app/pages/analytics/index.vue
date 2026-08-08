<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnalyticsBreakdownDimension, AnalyticsOverview, Site } from '@platform/schemas'

/**
 * The analytics overview (§21).
 *
 * Every figure on this page is an aggregate over the tracking tables. There is
 * no sample data, no smoothed line and no metric that exists only because the
 * layout looked empty without it. Where the platform cannot compute something
 * — a change against a period with no traffic, a conversion rate with no
 * sessions — the screen says so instead of printing a plausible number. That is
 * the entire value of a measurement product: a figure here is either true or
 * absent.
 */

const api = useApi()

const RANGES = [7, 14, 30, 90, 180] as const
const days = ref<number>(30)
const siteId = ref<string>('')

const DIMENSIONS: { key: AnalyticsBreakdownDimension; label: string; valueLabel: string }[] = [
  { key: 'channel', label: 'Channel', valueLabel: 'Sessions' },
  { key: 'source', label: 'Source', valueLabel: 'Sessions' },
  { key: 'medium', label: 'Medium', valueLabel: 'Sessions' },
  { key: 'campaign', label: 'Campaign', valueLabel: 'Sessions' },
  { key: 'landing_page', label: 'Landing page', valueLabel: 'Sessions' },
]
const activeDimension = ref<AnalyticsBreakdownDimension>('channel')

const METRIC_GROUPS = [
  {
    key: 'traffic',
    label: 'Traffic',
    series: [
      { key: 'visitors', label: 'Visitors', emphasis: true },
      { key: 'sessions', label: 'Sessions' },
      { key: 'pageViews', label: 'Page views' },
    ],
  },
  {
    key: 'conversion',
    label: 'Conversion',
    series: [
      { key: 'conversions', label: 'Conversions', emphasis: true },
      { key: 'leads', label: 'Leads' },
    ],
  },
  {
    key: 'revenue',
    label: 'Revenue',
    series: [{ key: 'revenue', label: 'Revenue', emphasis: true }],
  },
] as const
const activeGroup = ref<(typeof METRIC_GROUPS)[number]['key']>('traffic')

const { data: sites } = await useAsyncData('analytics:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

const { data, pending, refresh, error } = await useAsyncData(
  () => `analytics:overview:${days.value}:${siteId.value}`,
  () =>
    api.get<AnalyticsOverview>('/api/v1/analytics/overview', {
      days: days.value,
      ...(siteId.value ? { siteId: siteId.value } : {}),
    }),
  { watch: [days, siteId], default: () => null },
)

const ga4Busy = ref(false)
const ga4Error = ref('')
const ga4Property = ref('')
const ga4Metrics = ref<{
  sessions: number
  totalUsers: number
  screenPageViews: number
  bounceRate: number | null
} | null>(null)
const ga4Properties = ref<{ property: string; displayName: string }[]>([])

async function loadGa4() {
  ga4Busy.value = true
  ga4Error.value = ''
  try {
    const listed = await api.get<{ properties: { property: string; displayName: string }[] }>(
      '/api/v1/analytics/ga4/properties',
    )
    ga4Properties.value = listed.properties
    const property = ga4Property.value || listed.properties[0]?.property
    if (!property) {
      ga4Error.value = 'No GA4 properties on this Google account.'
      return
    }
    ga4Property.value = property
    const overview = await api.get<{
      metrics: {
        sessions: number
        totalUsers: number
        screenPageViews: number
        bounceRate: number | null
      }
    }>('/api/v1/analytics/ga4/overview', { property, days: days.value })
    ga4Metrics.value = overview.metrics
  } catch (caught) {
    ga4Error.value = caught instanceof ApiError ? caught.message : 'GA4 request failed.'
  } finally {
    ga4Busy.value = false
  }
}

const siteOptions = computed(() => [
  { label: 'All websites', value: '' },
  ...(sites.value ?? []).map((site) => ({ label: site.name, value: site.id })),
])

const currency = computed(() => data.value?.currency ?? null)

/**
 * Nothing at all in this range or the one before it — a different situation
 * from a quiet week, and it needs a different answer.
 *
 * Deliberately not phrased as "you have never collected anything": the overview
 * only sees these two windows, and claiming more than the payload supports is
 * the exact failure mode this page exists to avoid.
 */
const noEventsEitherPeriod = computed(
  () => Boolean(data.value) && data.value!.eventCounts.length === 0 && data.value!.metrics.sessions.previous === 0,
)

const seriesPoints = computed(() =>
  (data.value?.series ?? []).map((point) => ({
    label: formatDayLabel(point.date),
    values: {
      visitors: point.visitors,
      sessions: point.sessions,
      pageViews: point.pageViews,
      leads: point.leads,
      conversions: point.conversions,
      revenue: point.revenue,
    },
  })),
)

const activeSeries = computed(
  () => METRIC_GROUPS.find((group) => group.key === activeGroup.value)?.series ?? METRIC_GROUPS[0].series,
)

const chartFormat = computed(() =>
  activeGroup.value === 'revenue'
    ? (value: number) => formatAmount(value, currency.value)
    : (value: number) => formatCount(value),
)

const breakdown = computed(
  () => data.value?.breakdowns.find((entry) => entry.dimension === activeDimension.value) ?? null,
)

const breakdownRows = computed(() =>
  (breakdown.value?.rows ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    value: row.sessions,
    extra: [
      { label: 'Visitors', value: formatCount(row.visitors) },
      { label: 'Conversions', value: formatCount(row.conversions) },
      { label: 'Conv. rate', value: formatRatio(row.conversionRate) },
      { label: 'Revenue', value: row.revenue > 0 ? formatAmount(row.revenue, currency.value) : '—' },
    ],
  })),
)

const eventRows = computed(() =>
  (data.value?.eventCounts ?? []).slice(0, 10).map((entry) => ({
    key: entry.name,
    label: humanizeEventName(entry.name),
    value: entry.count,
  })),
)

const activeDimensionLabel = computed(
  () => DIMENSIONS.find((entry) => entry.key === activeDimension.value)?.label ?? 'Channel',
)
</script>

<template>
  <div>
    <UiPageHeader
      title="Analytics"
      description="Measured from your own first-party events. Nothing here is modelled or estimated."
    >
      <template #actions>
        <UiSelect v-if="(sites?.length ?? 0) > 1" v-model="siteId" :options="siteOptions" aria-label="Website" />
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
      </template>
    </UiPageHeader>

    <!-- Range picker. The comparison period is always the equally long window
         before it, resolved server-side so the two can never drift apart. -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Reporting range">
        <button
          v-for="range in RANGES"
          :key="range"
          type="button"
          class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
          :class="days === range ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
          :aria-pressed="days === range"
          @click="days = range"
        >
          {{ range }} days
        </button>
      </div>

      <p v-if="data" class="text-[0.8125rem] text-faint">
        Compared with {{ formatDateTime(data.range.previousFrom) }} – {{ formatDateTime(data.range.previousTo) }}
      </p>
    </div>

    <UiCard class="mb-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-heading font-semibold text-ink">Google Analytics 4</h2>
          <p class="mt-1 type-caption-12 text-soft">
            Full GA4 reports (sessions over time, countries, sources) live on a dedicated page.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton size="sm" to="/analytics/google">Open Google Analytics</UiButton>
          <UiButton size="sm" :loading="ga4Busy" @click="loadGa4">Quick load</UiButton>
        </div>
      </div>
      <p v-if="ga4Error" class="mt-3 type-caption-12 text-danger" role="alert">{{ ga4Error }}</p>
      <div v-else-if="ga4Metrics" class="mt-4 grid gap-3 sm:grid-cols-4">
        <UiStat label="Sessions" :value="ga4Metrics.sessions" />
        <UiStat label="Users" :value="ga4Metrics.totalUsers" />
        <UiStat label="Views" :value="ga4Metrics.screenPageViews" />
        <UiStat
          label="Bounce rate"
          :value="ga4Metrics.bounceRate != null ? `${Math.round(ga4Metrics.bounceRate * 100)}%` : '—'"
        />
      </div>
      <p v-if="ga4Property" class="mt-3 type-caption-12 text-faint">{{ ga4Property }}</p>
    </UiCard>

    <p v-if="error" class="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      Could not load analytics: {{ error.message }}
    </p>

    <div v-else-if="pending && !data" class="py-16 text-center text-sm text-soft">Reading your events…</div>

    <template v-else-if="data">
      <!-- The honest empty state: what is missing, and what would fill it. -->
      <UiEmptyState
        v-if="noEventsEitherPeriod"
        :title="`No events in the last ${data.range.days * 2} days`"
        description="Nothing was collected in this range or the one before it, so there is nothing to measure. Analytics fills in by itself once the tracking snippet is running on a published page — the tracking screen shows whether events are arriving at all."
      >
        <UiButton variant="primary" to="/analytics/tracking">Check tracking</UiButton>
        <UiButton to="/website/pages">Publish a page</UiButton>
      </UiEmptyState>

      <div v-else class="flex flex-col gap-5">
        <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <UiStat
            label="Visitors"
            :value="formatCount(data.metrics.visitors.current)"
            :hint="formatChange(data.metrics.visitors.changePct, data.range.days)"
          />
          <UiStat
            label="Sessions"
            :value="formatCount(data.metrics.sessions.current)"
            :hint="formatChange(data.metrics.sessions.changePct, data.range.days)"
          />
          <UiStat
            label="Leads"
            :value="formatCount(data.metrics.leads.current)"
            :hint="formatChange(data.metrics.leads.changePct, data.range.days)"
          />
          <UiStat
            label="Conversion rate"
            :value="formatRatio(data.metrics.conversionRate.current, 2)"
            :hint="`${formatCount(data.metrics.conversions.current)} conversions per ${formatCount(data.metrics.sessions.current)} sessions`"
          />
          <UiStat
            label="Revenue"
            :value="formatAmount(data.metrics.revenue.current, currency)"
            :hint="
              currency
                ? formatChange(data.metrics.revenue.changePct, data.range.days)
                : 'No purchase events with a value recorded'
            "
          />
          <UiStat
            label="Average order"
            :value="formatAmount(data.metrics.averageOrderValue.current, currency)"
            :hint="`${formatCount(data.metrics.orders.current)} purchase${data.metrics.orders.current === 1 ? '' : 's'}`"
          />
        </section>

        <!-- Revenue in a second currency is reported, never added in. -->
        <p
          v-if="data.otherCurrencies.length"
          class="rounded-lg border border-line bg-sunken px-4 py-3 text-[0.8125rem] text-soft"
        >
          <span class="font-medium text-ink">Revenue is shown in {{ currency ?? 'no currency' }}.</span>
          Also recorded:
          {{
            data.otherCurrencies
              .map((slice) => `${formatAmount(slice.amount, slice.currency)} over ${slice.orders} order(s)`)
              .join(', ')
          }}. Amounts in different currencies are never summed together.
        </p>

        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-heading font-semibold text-ink">Over time</h2>
            <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Chart metric">
              <button
                v-for="group in METRIC_GROUPS"
                :key="group.key"
                type="button"
                class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
                :class="activeGroup === group.key ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                :aria-pressed="activeGroup === group.key"
                @click="activeGroup = group.key"
              >
                {{ group.label }}
              </button>
            </div>
          </div>

          <ChartLine
            :title="`${METRIC_GROUPS.find((group) => group.key === activeGroup)!.label} per day`"
            :description="`Rolling ${data.range.days} days, UTC. The first day is partial.`"
            :series="[...activeSeries]"
            :points="seriesPoints"
            :format="chartFormat"
            :empty-message="
              activeGroup === 'revenue'
                ? 'No purchase events carried a value in this range.'
                : 'No events were recorded in this range.'
            "
          />
        </UiCard>

        <div class="grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <UiCard>
            <ChartFunnel
              title="From first visit to conversion"
              description="Visitors who reached each stage. Stages count events, not a fixed path — someone can enter partway through, so these are not strict drop-offs."
              :steps="data.funnel"
              :format="formatCount"
              :format-rate="(value) => formatRatio(value, 0)"
            />
          </UiCard>

          <UiCard>
            <ChartBars
              title="Top pages"
              description="Page views in this range, grouped by path."
              value-label="Views"
              :rows="
                data.topPages.map((page) => ({
                  key: page.path,
                  label: page.path,
                  value: page.views,
                  extra: [{ label: 'Visitors', value: formatCount(page.visitors) }],
                }))
              "
              :format="formatCount"
              empty-title="No page views yet"
              empty-description="A page_view event is recorded the moment a published page is opened."
            />
          </UiCard>
        </div>

        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-heading font-semibold text-ink">Where the traffic came from</h2>
              <p class="mt-0.5 text-[0.8125rem] text-soft">
                Read from the session each event belongs to, so a visit keeps the campaign that started it.
              </p>
            </div>
            <div class="flex flex-wrap gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Breakdown dimension">
              <button
                v-for="dimension in DIMENSIONS"
                :key="dimension.key"
                type="button"
                class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
                :class="
                  activeDimension === dimension.key ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'
                "
                :aria-pressed="activeDimension === dimension.key"
                @click="activeDimension = dimension.key"
              >
                {{ dimension.label }}
              </button>
            </div>
          </div>

          <ChartBars
            :title="`Sessions by ${activeDimensionLabel.toLowerCase()}`"
            value-label="Sessions"
            :rows="breakdownRows"
            :format="formatCount"
            :remaining-rows="breakdown?.remainingRows ?? 0"
            empty-title="Nothing recorded for this breakdown"
            empty-description="Tag your campaign links with UTM parameters and this table fills in on the next visit."
          />

          <p class="mt-4 text-[0.8125rem] text-faint">
            <span class="font-medium text-soft">(direct) / (none)</span> means the visit carried no campaign
            information at all — no UTM tags, no ad click id and no external referrer.
            <NuxtLink to="/analytics/attribution" class="text-brand no-underline hover:underline">
              Attribution
            </NuxtLink>
            shows which of these actually earned the revenue.
          </p>
        </UiCard>

        <UiCard>
          <ChartBars
            title="Events collected"
            description="Every event name this workspace recorded in the range. The tracking screen shows what happened to each one."
            value-label="Events"
            :rows="eventRows"
            :format="formatCount"
            empty-title="No events in this range"
            empty-description="Nothing was collected between these two dates."
          />
        </UiCard>
      </div>
    </template>
  </div>
</template>
