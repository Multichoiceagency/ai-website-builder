<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Full Google Analytics 4 results — separate from first-party analytics.
 */

const api = useApi()
const { formatCount, formatRatio, formatDayLabel } = useAnalyticsFormat()

const RANGES = [7, 14, 28, 90] as const
const days = ref(28)
const property = ref('')
const dimension = ref<'country' | 'sessionSource' | 'deviceCategory' | 'landingPage'>('country')
const busy = ref(false)
const error = ref('')

const properties = ref<{ property: string; displayName: string }[]>([])
const metrics = ref<{
  sessions: number
  totalUsers: number
  screenPageViews: number
  bounceRate: number | null
  averageSessionDuration: number | null
} | null>(null)
const series = ref<{ date: string; sessions: number; totalUsers: number; screenPageViews: number }[]>([])
const rows = ref<{ key: string; label: string; sessions: number; totalUsers: number }[]>([])

const { data: status } = await useAsyncData('ga4:status', () =>
  api.get<{ configured: boolean; connected: boolean; reason: string }>('/api/v1/analytics/ga4/status'),
)

const propertyOptions = computed(() =>
  properties.value.map((entry) => ({ label: entry.displayName, value: entry.property })),
)

const dimensionOptions = [
  { label: 'Country', value: 'country' },
  { label: 'Source', value: 'sessionSource' },
  { label: 'Device', value: 'deviceCategory' },
  { label: 'Landing page', value: 'landingPage' },
]

const chartPoints = computed(() =>
  series.value.map((point) => ({
    label: formatDayLabel(point.date),
    values: {
      sessions: point.sessions,
      users: point.totalUsers,
      views: point.screenPageViews,
    },
  })),
)

async function loadProperties() {
  error.value = ''
  try {
    const listed = await api.get<{ properties: { property: string; displayName: string }[] }>(
      '/api/v1/analytics/ga4/properties',
    )
    properties.value = listed.properties
    if (!property.value && listed.properties[0]) property.value = listed.properties[0].property
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not list GA4 properties.'
  }
}

async function loadAll() {
  if (!property.value) {
    await loadProperties()
  }
  if (!property.value) {
    error.value = error.value || 'No GA4 properties on this Google account.'
    return
  }

  busy.value = true
  error.value = ''
  try {
    const [overview, seriesResult, breakdown] = await Promise.all([
      api.get<{ metrics: NonNullable<typeof metrics.value> }>('/api/v1/analytics/ga4/overview', {
        property: property.value,
        days: days.value,
      }),
      api.get<{ series: typeof series.value }>('/api/v1/analytics/ga4/series', {
        property: property.value,
        days: days.value,
      }),
      api.get<{ rows: typeof rows.value }>('/api/v1/analytics/ga4/breakdown', {
        property: property.value,
        days: days.value,
        dimension: dimension.value,
      }),
    ])
    metrics.value = overview.metrics
    series.value = seriesResult.series
    rows.value = breakdown.rows
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'GA4 request failed.'
  } finally {
    busy.value = false
  }
}

watch([days, property, dimension], () => {
  if (property.value) void loadAll()
})

onMounted(() => {
  if (status.value?.connected) void loadAll()
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Google Analytics"
      description="Observed GA4 metrics from the Google account connected under Integrations."
    >
      <template #actions>
        <UiSelect
          v-if="propertyOptions.length"
          v-model="property"
          :options="propertyOptions"
          aria-label="GA4 property"
        />
        <UiButton size="sm" :loading="busy" @click="loadAll">Refresh</UiButton>
        <UiButton size="sm" to="/analytics">First-party analytics</UiButton>
      </template>
    </UiPageHeader>

    <UiCard v-if="!status?.connected" class="mb-5">
      <p class="text-sm text-soft">{{ status?.reason || 'Connect Google to load GA4.' }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiButton size="sm" variant="primary" to="/settings/integrations">Connect Google</UiButton>
        <UiButton size="sm" to="/analytics">Use first-party analytics</UiButton>
      </div>
    </UiCard>

    <template v-else>
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
        <UiSelect v-model="dimension" :options="dimensionOptions" aria-label="Breakdown" />
      </div>

      <p v-if="error" class="mb-5 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
        {{ error }}
      </p>

      <section v-if="metrics" class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <UiStat label="Sessions" :value="formatCount(metrics.sessions)" />
        <UiStat label="Users" :value="formatCount(metrics.totalUsers)" />
        <UiStat label="Views" :value="formatCount(metrics.screenPageViews)" />
        <UiStat
          label="Bounce rate"
          :value="metrics.bounceRate != null ? formatRatio(metrics.bounceRate, 1) : '—'"
        />
        <UiStat
          label="Avg. session"
          :value="
            metrics.averageSessionDuration != null
              ? `${Math.round(metrics.averageSessionDuration)}s`
              : '—'
          "
        />
      </section>

      <UiCard class="mb-5">
        <ChartLine
          title="Traffic over time"
          description="Sessions, users, and views from GA4."
          :series="[
            { key: 'sessions', label: 'Sessions', emphasis: true },
            { key: 'users', label: 'Users' },
            { key: 'views', label: 'Views' },
          ]"
          :points="chartPoints"
          :format="formatCount"
          empty-message="No GA4 rows in this range."
        />
      </UiCard>

      <UiCard>
        <ChartBars
          :title="`By ${dimensionOptions.find((entry) => entry.value === dimension)?.label ?? 'dimension'}`"
          description="Top rows from the GA4 Data API."
          value-label="Sessions"
          :rows="
            rows.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.sessions,
              extra: [{ label: 'Users', value: formatCount(row.totalUsers) }],
            }))
          "
          :format="formatCount"
          empty-title="No breakdown rows yet"
          empty-description="Pick a property and range, then refresh."
        />
      </UiCard>
    </template>
  </div>
</template>
