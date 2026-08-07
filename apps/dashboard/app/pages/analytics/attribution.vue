<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  TRACKING_CONVERSION_EVENTS,
  type AnalyticsAttributionReport,
  type AnalyticsBreakdownDimension,
  type AnalyticsJourneyReport,
  type Site,
} from '@platform/schemas'

/**
 * Attribution (§28).
 *
 * The page is built around one argument: an attribution number is a modelling
 * choice, not a fact. So the three models are shown next to each other rather
 * than behind a switch, the conversions that *cannot* be credited are counted
 * in the open, and individual journeys are available underneath the aggregates
 * so a disputed figure can be traced to the sessions that produced it.
 *
 * Nothing here is estimated. A conversion appears in these tables only if the
 * visitor has a recorded session inside the lookback window.
 */

const api = useApi()

const RANGES = [7, 30, 90] as const
const LOOKBACKS = [7, 30, 90] as const

const days = ref<number>(30)
const lookbackDays = ref<number>(30)
const siteId = ref<string>('')
const eventFilter = ref<string>('')
const journeyModel = ref<'firstClick' | 'lastClick' | 'linear'>('lastClick')

const MODELS = [
  { key: 'firstClick', apiKey: 'first_click', label: 'First click' },
  { key: 'lastClick', apiKey: 'last_click', label: 'Last click' },
  { key: 'linear', apiKey: 'linear', label: 'Linear' },
] as const

const DIMENSIONS: { key: AnalyticsBreakdownDimension; label: string }[] = [
  { key: 'channel', label: 'Channel' },
  { key: 'source', label: 'Source' },
  { key: 'medium', label: 'Medium' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'landing_page', label: 'Landing page' },
]
const activeDimension = ref<AnalyticsBreakdownDimension>('channel')
const metric = ref<'value' | 'conversions'>('value')

const { data: sites } = await useAsyncData('attribution:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

const query = computed(() => ({
  days: days.value,
  lookbackDays: lookbackDays.value,
  ...(siteId.value ? { siteId: siteId.value } : {}),
  ...(eventFilter.value ? { events: eventFilter.value } : {}),
}))

const { data, pending, refresh, error } = await useAsyncData(
  () => `attribution:${days.value}:${lookbackDays.value}:${siteId.value}:${eventFilter.value}`,
  () => api.get<AnalyticsAttributionReport>('/api/v1/analytics/attribution', query.value),
  { watch: [days, lookbackDays, siteId, eventFilter], default: () => null },
)

const { data: journeyData } = await useAsyncData(
  () => `attribution:journeys:${days.value}:${lookbackDays.value}:${siteId.value}:${eventFilter.value}`,
  () => api.get<AnalyticsJourneyReport>('/api/v1/analytics/journeys', { ...query.value, limit: 20 }),
  { watch: [days, lookbackDays, siteId, eventFilter], default: () => null },
)

const siteOptions = computed(() => [
  { label: 'All websites', value: '' },
  ...(sites.value ?? []).map((site) => ({ label: site.name, value: site.id })),
])

const eventOptions = computed(() => [
  { label: 'All conversion events', value: '' },
  ...TRACKING_CONVERSION_EVENTS.map((name) => ({ label: humanizeEventName(name), value: name })),
])

const currency = computed(() => data.value?.currency ?? null)

const dimensionRows = computed(() => {
  const dimension = data.value?.dimensions.find((entry) => entry.dimension === activeDimension.value)
  return (dimension?.rows ?? []).map((row) => ({
    key: row.key,
    label: row.label,
    values: {
      firstClick: metric.value === 'value' ? row.firstClick.value : row.firstClick.conversions,
      lastClick: metric.value === 'value' ? row.lastClick.value : row.lastClick.conversions,
      linear: metric.value === 'value' ? row.linear.value : row.linear.conversions,
    },
  }))
})

const compareFormat = computed(() =>
  metric.value === 'value'
    ? (value: number) => formatAmount(value, currency.value)
    : (value: number) => formatCredit(value),
)

/**
 * How much the three models disagree, as one number.
 *
 * The share of credited value that moves when you change the model. Near zero
 * means the choice barely matters here; large means every channel comparison on
 * this screen depends on a decision nobody has explicitly made.
 */
const modelSpread = computed(() => {
  const rows = data.value?.dimensions.find((entry) => entry.dimension === 'channel')?.rows ?? []
  if (!rows.length) return null

  const total = rows.reduce((sum, row) => sum + row.lastClick.value, 0)
  if (total <= 0) return null

  const moved = rows.reduce(
    (sum, row) => sum + Math.abs(row.firstClick.value - row.lastClick.value),
    0,
  )
  return moved / (total * 2)
})

const activeDimensionLabel = computed(
  () => DIMENSIONS.find((entry) => entry.key === activeDimension.value)?.label ?? 'Channel',
)

const journeys = computed(() => journeyData.value?.journeys ?? [])
const journeyModelLabel = computed(
  () => MODELS.find((model) => model.key === journeyModel.value)?.label ?? 'Last click',
)

const nothingToCredit = computed(() => Boolean(data.value) && data.value!.totalConversions === 0)
</script>

<template>
  <div>
    <UiPageHeader
      title="Attribution"
      description="Which marketing produced the revenue — under three models at once, because the answer depends on which one you pick."
    >
      <template #actions>
        <UiSelect v-if="(sites?.length ?? 0) > 1" v-model="siteId" :options="siteOptions" aria-label="Website" />
        <UiSelect v-model="eventFilter" :options="eventOptions" aria-label="Conversion event" />
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
      </template>
    </UiPageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div class="flex items-center gap-2">
        <span class="text-[0.8125rem] text-soft">Conversions in the last</span>
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
            {{ range }}d
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[0.8125rem] text-soft">Looking back over</span>
        <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Lookback window">
          <button
            v-for="lookback in LOOKBACKS"
            :key="lookback"
            type="button"
            class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
            :class="lookbackDays === lookback ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
            :aria-pressed="lookbackDays === lookback"
            @click="lookbackDays = lookback"
          >
            {{ lookback }}d
          </button>
        </div>
        <span class="text-[0.8125rem] text-faint">of sessions per visitor</span>
      </div>
    </div>

    <p v-if="error" class="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      Could not load attribution: {{ error.message }}
    </p>

    <div v-else-if="pending && !data" class="py-16 text-center text-sm text-soft">Rebuilding the journeys…</div>

    <template v-else-if="data">
      <UiEmptyState
        v-if="nothingToCredit"
        title="No conversions to attribute in this range"
        :description="`Attribution needs at least one of these events: ${data.events.map(humanizeEventName).join(', ')}. Once a visitor triggers one, the sessions that preceded it appear here.`"
      >
        <UiButton variant="primary" to="/analytics/tracking">Check what is being collected</UiButton>
      </UiEmptyState>

      <div v-else class="flex flex-col gap-5">
        <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UiStat
            label="Conversions"
            :value="formatCount(data.totalConversions)"
            :hint="data.events.map(humanizeEventName).join(', ')"
          />
          <UiStat
            label="Value"
            :value="formatAmount(data.totalValue, currency)"
            :hint="currency ? `Recorded on the conversion events` : 'No currency was recorded on these events'"
          />
          <UiStat
            label="Cannot be credited"
            :value="formatCount(data.unattributed)"
            :hint="
              data.unattributed > 0
                ? 'No session on record inside the lookback window'
                : 'Every conversion has a journey behind it'
            "
          />
          <UiStat
            label="Model disagreement"
            :value="modelSpread === null ? '—' : formatRatio(modelSpread, 0)"
            :hint="
              modelSpread === null
                ? 'Needs credited revenue to compare'
                : 'Share of value that moves between first and last click'
            "
          />
        </section>

        <!-- The conversions the models physically cannot see. Stated up front:
             rows that quietly omit them make every channel look better. -->
        <p
          v-if="data.unattributed > 0"
          class="rounded-lg border border-line bg-sunken px-4 py-3 text-[0.8125rem] text-soft"
        >
          <span class="font-medium text-ink">
            {{ formatCount(data.unattributed) }} of {{ formatCount(data.totalConversions) }} conversions are missing
            from every table below.
          </span>
          Their visitor has no session recorded within {{ data.lookbackDays }} days of converting — usually a
          conversion imported without a matching visit, or a journey that started before tracking was installed.
          Widening the lookback window can recover some of them.
        </p>

        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-heading font-semibold text-ink">Credit by {{ activeDimensionLabel.toLowerCase() }}</h2>
              <p class="mt-0.5 text-[0.8125rem] text-soft">
                One dataset, three ways of splitting it. Where the bars disagree, the number depends on the model.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Metric">
                <button
                  v-for="option in (['value', 'conversions'] as const)"
                  :key="option"
                  type="button"
                  class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors"
                  :class="metric === option ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                  :aria-pressed="metric === option"
                  @click="metric = option"
                >
                  {{ option }}
                </button>
              </div>
            </div>
          </div>

          <div class="mb-4 flex flex-wrap gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Dimension">
            <button
              v-for="dimension in DIMENSIONS"
              :key="dimension.key"
              type="button"
              class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
              :class="activeDimension === dimension.key ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
              :aria-pressed="activeDimension === dimension.key"
              @click="activeDimension = dimension.key"
            >
              {{ dimension.label }}
            </button>
          </div>

          <ChartCompare
            :title="`${metric === 'value' ? 'Value' : 'Conversions'} attributed by ${activeDimensionLabel.toLowerCase()}`"
            :series="MODELS.map((model) => ({ key: model.key, label: model.label }))"
            :rows="dimensionRows"
            :format="compareFormat"
            empty-title="Nothing to attribute for this dimension"
            empty-description="Conversions exist, but none of their sessions carried this information."
          />

          <p class="mt-4 text-[0.8125rem] text-faint">
            <span class="font-medium text-soft">First click</span> gives everything to the session that started the
            journey, <span class="font-medium text-soft">last click</span> to the one that closed it, and
            <span class="font-medium text-soft">linear</span> splits it equally. Linear credit is fractional on
            purpose — half a conversion is what "two touches shared this" actually means.
          </p>
        </UiCard>

        <section>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-heading font-semibold text-ink">Individual journeys</h2>
              <p class="mt-0.5 text-[0.8125rem] text-soft">
                The most recent conversions and every session that preceded them. Switching the model moves the credit
                along the same timeline.
              </p>
            </div>

            <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Attribution model for journeys">
              <button
                v-for="model in MODELS"
                :key="model.key"
                type="button"
                class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
                :class="journeyModel === model.key ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                :aria-pressed="journeyModel === model.key"
                @click="journeyModel = model.key"
              >
                {{ model.label }}
              </button>
            </div>
          </div>

          <UiEmptyState
            v-if="!journeys.length"
            title="No journeys to show"
            description="A journey appears once a conversion has at least one recorded session behind it."
          />

          <ul v-else class="flex flex-col gap-3">
            <li v-for="journey in journeys" :key="journey.conversionId">
              <UiCard>
                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <UiBadge tone="brand">{{ humanizeEventName(journey.event) }}</UiBadge>
                    <span v-if="journey.value !== null" class="text-sm font-medium tabular-nums text-ink">
                      {{ formatAmount(journey.value, journey.currency) }}
                    </span>
                    <span class="text-[0.8125rem] text-faint">
                      {{ journey.touches.length }} touch{{ journey.touches.length === 1 ? '' : 'es' }}
                      <template v-if="journey.hoursToConvert !== null">
                        · {{ formatCount(journey.hoursToConvert) }} h from first visit
                      </template>
                    </span>
                  </div>
                  <span class="font-mono text-[0.75rem] text-faint">
                    {{ journey.userId ?? journey.anonymousId }}
                  </span>
                </div>

                <ChartJourney
                  :touches="journey.touches"
                  :converted-at="journey.occurredAt"
                  :model="journeyModel"
                  :model-label="journeyModelLabel"
                  :format-moment="formatDateTime"
                />

                <details class="mt-2 text-[0.8125rem]">
                  <summary class="cursor-pointer text-soft transition-colors hover:text-ink">
                    Show every touch
                  </summary>
                  <div class="mt-2 overflow-x-auto rounded-lg border border-line">
                    <table class="w-full min-w-[36rem] border-collapse text-left text-[0.8125rem]">
                      <caption class="sr-only">
                        Sessions preceding this conversion
                      </caption>
                      <thead>
                        <tr class="border-b border-line bg-sunken">
                          <th scope="col" class="px-3 py-2 font-semibold text-faint">Started</th>
                          <th scope="col" class="px-3 py-2 font-semibold text-faint">Channel</th>
                          <th scope="col" class="px-3 py-2 font-semibold text-faint">Campaign</th>
                          <th scope="col" class="px-3 py-2 font-semibold text-faint">Landing page</th>
                          <th
                            v-for="model in MODELS"
                            :key="model.key"
                            scope="col"
                            class="px-3 py-2 text-right font-semibold text-faint"
                          >
                            {{ model.label }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(touch, index) in journey.touches"
                          :key="`${touch.sessionId}-${index}`"
                          class="border-b border-line last:border-0"
                        >
                          <td class="px-3 py-1.5 text-soft">{{ formatDateTime(touch.startedAt) }}</td>
                          <td class="px-3 py-1.5 text-ink">{{ touch.channel }}</td>
                          <td class="px-3 py-1.5 text-soft">{{ touch.campaign || '—' }}</td>
                          <td class="px-3 py-1.5 text-soft">{{ touch.landingPath }}</td>
                          <td
                            v-for="model in MODELS"
                            :key="model.key"
                            class="px-3 py-1.5 text-right tabular-nums"
                            :class="touch[model.key] > 0 ? 'text-ink' : 'text-faint'"
                          >
                            {{ formatRatio(touch[model.key], 0) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </UiCard>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
