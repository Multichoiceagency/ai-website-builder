<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  type AnalyticsTrackingHealth,
  type Site,
  type StoredTrackingEvent,
  type TrackingDeliveryStatus,
} from '@platform/schemas'

/**
 * Tracking operations (§26).
 *
 * This is the screen that decides whether anyone believes the other two. Its
 * job is to answer "why does our number disagree with GA4" without a support
 * ticket, so the discrepancy is decomposed rather than summarised: every event
 * the platform recorded was either accepted by a destination or withheld for a
 * reason that is printed here verbatim, exactly as the consent engine or the
 * adapter wrote it at the time.
 *
 * Nothing on this page is inferred. A destination with no credentials says so
 * by name; a withheld event names the consent category that withheld it.
 */

const api = useApi()

const WINDOWS = [1, 6, 24, 24 * 7] as const
const hours = ref<number>(24)
const siteId = ref<string>('')
const live = ref(false)
const nameFilter = ref<string>('')
const expanded = ref<string | null>(null)

const STATUS_TONE: Record<TrackingDeliveryStatus, 'positive' | 'warning' | 'danger' | 'neutral'> = {
  delivered: 'positive',
  skipped: 'warning',
  failed: 'danger',
  not_configured: 'neutral',
}

const { data: sites } = await useAsyncData('tracking:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

const { data, pending, refresh, error } = await useAsyncData(
  () => `tracking:health:${hours.value}:${siteId.value}`,
  () =>
    api.get<AnalyticsTrackingHealth>('/api/v1/analytics/tracking', {
      hours: hours.value,
      ...(siteId.value ? { siteId: siteId.value } : {}),
    }),
  { watch: [hours, siteId], default: () => null },
)

const { data: events, refresh: refreshEvents } = await useAsyncData(
  () => `tracking:events:${siteId.value}:${nameFilter.value}`,
  () =>
    api.get<StoredTrackingEvent[]>('/api/v1/tracking/events', {
      limit: 50,
      ...(siteId.value ? { siteId: siteId.value } : {}),
      ...(nameFilter.value ? { name: nameFilter.value } : {}),
    }),
  { watch: [siteId, nameFilter], default: () => [] as StoredTrackingEvent[] },
)

/**
 * The debugger polls only while it is switched on, and only the event feed —
 * a dashboard that quietly re-queries forever is a dashboard nobody leaves
 * open.
 */
let timer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (timer) clearInterval(timer)
  timer = null
}

watch(live, (enabled) => {
  stopPolling()
  if (enabled) timer = setInterval(() => refreshEvents(), 5000)
})

onBeforeUnmount(stopPolling)

const siteOptions = computed(() => [
  { label: 'All websites', value: '' },
  ...(sites.value ?? []).map((site) => ({ label: site.name, value: site.id })),
])

const nameOptions = computed(() => [
  { label: 'All event names', value: '' },
  ...(data.value?.eventCounts ?? []).map((entry) => ({
    label: `${humanizeEventName(entry.name)} (${entry.count})`,
    value: entry.name,
  })),
])

const volumePoints = computed(() =>
  (data.value?.volume ?? []).map((point) => ({
    label: formatHourLabel(point.hour),
    values: { events: point.events },
  })),
)

const totalSkipped = computed(() =>
  (data.value?.consentSkips ?? []).reduce((sum, entry) => sum + entry.count, 0),
)
const totalFailed = computed(() => (data.value?.failures ?? []).reduce((sum, entry) => sum + entry.count, 0))
const deliveringDestinations = computed(
  () => (data.value?.destinations ?? []).filter((entry) => entry.delivered > 0).length,
)
const unconfigured = computed(() => (data.value?.destinations ?? []).filter((entry) => !entry.configured))

function segmentsFor(destination: AnalyticsTrackingHealth['destinations'][number]) {
  return [
    { key: 'delivered', label: 'delivered', value: destination.delivered, color: 'var(--positive)' },
    { key: 'skipped', label: 'withheld by consent', value: destination.skipped, color: 'var(--warning)' },
    { key: 'notConfigured', label: 'no credentials', value: destination.notConfigured, color: 'var(--line-strong)' },
    { key: 'failed', label: 'failed', value: destination.failed, color: 'var(--danger)' },
  ]
}

function toggle(eventId: string) {
  expanded.value = expanded.value === eventId ? null : eventId
}

const nothingRecorded = computed(() => Boolean(data.value) && data.value!.recordedEvents === 0)
</script>

<template>
  <div>
    <UiPageHeader
      title="Tracking"
      description="What was collected, where it went, and — for everything that did not arrive — exactly why."
    >
      <template #actions>
        <UiSelect v-if="(sites?.length ?? 0) > 1" v-model="siteId" :options="siteOptions" aria-label="Website" />
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
      </template>
    </UiPageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Window">
        <button
          v-for="window in WINDOWS"
          :key="window"
          type="button"
          class="rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors"
          :class="hours === window ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
          :aria-pressed="hours === window"
          @click="hours = window"
        >
          {{ window === 168 ? '7 days' : `${window} h` }}
        </button>
      </div>
      <p v-if="data" class="text-[0.8125rem] text-faint">
        {{ formatDateTime(data.from) }} – {{ formatDateTime(data.to) }}
      </p>
    </div>

    <p v-if="error" class="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      Could not load tracking health: {{ error.message }}
    </p>

    <div v-else-if="pending && !data" class="py-16 text-center text-sm text-soft">Reading the delivery ledger…</div>

    <div v-else-if="data" class="flex flex-col gap-5">
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UiStat
          label="Events recorded"
          :value="formatCount(data.recordedEvents)"
          hint="Stored in your own first-party log"
        />
        <UiStat
          label="Destinations delivering"
          :value="`${deliveringDestinations} / ${data.destinations.length}`"
          :hint="unconfigured.length ? `${unconfigured.map((entry) => entry.label).join(', ')} unconfigured` : 'All configured'"
        />
        <UiStat
          label="Withheld by consent"
          :value="formatCount(totalSkipped)"
          :hint="totalSkipped ? 'Visitors who did not grant that category' : 'Nothing was withheld'"
        />
        <UiStat
          label="Delivery failures"
          :value="formatCount(totalFailed)"
          :hint="totalFailed ? 'A destination rejected or could not be reached' : 'No vendor errors in this window'"
        />
      </section>

      <UiEmptyState
        v-if="nothingRecorded"
        title="No events arrived in this window"
        description="The collection endpoint is live and answering, but nothing has been sent to it. That usually means the tracking snippet is not running on a published page yet, or the window is simply too narrow."
      >
        <UiButton variant="primary" to="/website/pages">Open pages</UiButton>
      </UiEmptyState>

      <template v-else>
        <UiCard>
          <ChartLine
            title="Events received per hour"
            description="By arrival time, not by when the event happened — this is the ingest rate."
            :series="[{ key: 'events', label: 'Events', emphasis: true }]"
            :points="volumePoints"
            :format="formatCount"
            :height="170"
            empty-message="No events arrived in this window."
          />
        </UiCard>

        <!-- The discrepancy table (§26). -->
        <UiCard>
          <div class="mb-4">
            <h2 class="text-heading font-semibold text-ink">Our count against each destination</h2>
            <p class="mt-0.5 text-[0.8125rem] text-soft">
              Every event we recorded was either accepted by the destination or withheld for a stated reason. The
              segments below add up exactly — there is no unexplained remainder.
            </p>
          </div>

          <ul class="flex flex-col gap-4">
            <li
              v-for="destination in data.destinations"
              :key="destination.id"
              class="rounded-lg border border-line p-4"
            >
              <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-medium text-ink">{{ destination.label }}</span>
                    <UiBadge :tone="destination.configured ? 'positive' : 'neutral'">
                      {{ destination.configured ? 'Configured' : 'Not configured' }}
                    </UiBadge>
                    <UiBadge tone="neutral">
                      {{ destination.consent === 'none' ? 'no consent gate' : `${destination.consent} consent` }}
                    </UiBadge>
                  </div>
                  <p v-if="!destination.configured" class="mt-1 text-[0.8125rem] text-faint">
                    This installation has no {{ destination.label }} credentials, so nothing can be sent there.
                  </p>
                  <p v-else-if="destination.lastDeliveredAt" class="mt-1 text-[0.8125rem] text-faint">
                    Last delivery {{ relativeTimeFrom(destination.lastDeliveredAt) }}
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-sm tabular-nums text-ink">
                    {{ formatCount(destination.delivered) }} of {{ formatCount(destination.recorded) }} accepted
                  </p>
                  <p
                    class="text-[0.8125rem] tabular-nums"
                    :class="destination.discrepancy > 0 ? 'text-warning' : 'text-faint'"
                  >
                    {{ formatCount(destination.discrepancy) }} not delivered
                  </p>
                </div>
              </div>

              <ChartStackedBar
                :label="destination.label"
                :segments="segmentsFor(destination)"
                :total="destination.recorded"
                :format="formatCount"
              />

              <p
                v-if="destination.lastError"
                class="mt-3 rounded-md bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
              >
                Most recent failure: {{ destination.lastError }}
              </p>
            </li>
          </ul>
        </UiCard>

        <div class="grid gap-5 lg:grid-cols-2 lg:items-start">
          <UiCard>
            <h2 class="mb-1 text-heading font-semibold text-ink">Consent decisions</h2>
            <p class="mb-4 text-[0.8125rem] text-soft">
              Server-side collection respects consent exactly like the browser does. These events were collected into
              your own log and deliberately not forwarded.
            </p>

            <ul v-if="data.consentSkips.length" class="flex flex-col gap-2">
              <li
                v-for="skip in data.consentSkips"
                :key="`${skip.destination}-${skip.reason}`"
                class="flex items-start justify-between gap-4 rounded-lg border border-line px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink">{{ skip.destination }}</p>
                  <p class="mt-0.5 text-[0.8125rem] text-soft">{{ skip.reason ?? 'No reason recorded.' }}</p>
                </div>
                <span class="shrink-0 text-sm tabular-nums text-ink">{{ formatCount(skip.count) }}</span>
              </li>
            </ul>

            <p v-else class="py-8 text-center text-sm text-soft">
              Nothing was withheld in this window. Every collected event was allowed to go everywhere it was
              configured to go.
            </p>
          </UiCard>

          <UiCard>
            <h2 class="mb-1 text-heading font-semibold text-ink">Delivery failures</h2>
            <p class="mb-4 text-[0.8125rem] text-soft">
              A destination that rejected an event or could not be reached. The message is the vendor's, recorded at
              the time.
            </p>

            <ul v-if="data.failures.length" class="flex flex-col gap-2">
              <li
                v-for="failure in data.failures"
                :key="`${failure.destination}-${failure.reason}`"
                class="rounded-lg border border-line px-4 py-3"
              >
                <div class="flex items-start justify-between gap-4">
                  <p class="text-sm font-medium text-ink">{{ failure.destination }}</p>
                  <span class="shrink-0 text-sm tabular-nums text-ink">{{ formatCount(failure.count) }}</span>
                </div>
                <p class="mt-0.5 break-words text-[0.8125rem] text-danger">
                  {{ failure.reason ?? 'No message recorded.' }}
                </p>
                <p v-if="failure.lastAt" class="mt-1 text-[0.75rem] text-faint">
                  Last seen {{ relativeTimeFrom(failure.lastAt) }}
                </p>
              </li>
            </ul>

            <p v-else class="py-8 text-center text-sm text-soft">
              No destination failed in this window.
            </p>
          </UiCard>
        </div>
      </template>

      <!-- The live event debugger (§26). -->
      <UiCard :padded="false">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 class="text-heading font-semibold text-ink">Event debugger</h2>
            <p class="mt-0.5 text-[0.8125rem] text-soft">
              The 50 most recent events with their properties and every destination's verdict.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UiSelect v-model="nameFilter" :options="nameOptions" aria-label="Filter by event name" />
            <UiButton size="sm" :variant="live ? 'primary' : 'secondary'" @click="live = !live">
              <span
                v-if="live"
                class="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                aria-hidden="true"
              />
              {{ live ? 'Live' : 'Go live' }}
            </UiButton>
          </div>
        </div>

        <p v-if="!events?.length" class="px-5 py-12 text-center text-sm text-soft">
          No events match this filter yet. With the debugger live, anything collected appears here within five
          seconds.
        </p>

        <ul v-else class="divide-y divide-line">
          <li v-for="event in events" :key="event.id">
            <button
              type="button"
              class="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-sunken"
              :aria-expanded="expanded === event.id"
              @click="toggle(event.id)"
            >
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <span class="text-sm font-medium text-ink">{{ humanizeEventName(event.name) }}</span>
                <span v-if="event.value !== null" class="text-[0.8125rem] tabular-nums text-soft">
                  {{ formatAmount(event.value, event.currency) }}
                </span>
                <span class="truncate text-[0.8125rem] text-faint">{{ event.context.url }}</span>
              </div>

              <div class="flex shrink-0 flex-wrap items-center gap-1.5">
                <UiBadge
                  v-for="delivery in event.deliveries"
                  :key="delivery.destination"
                  :tone="STATUS_TONE[delivery.status]"
                >
                  {{ delivery.destination }}
                </UiBadge>
                <span class="ml-1 text-[0.75rem] tabular-nums text-faint">
                  {{ relativeTimeFrom(event.receivedAt) }}
                </span>
              </div>
            </button>

            <div v-if="expanded === event.id" class="border-t border-line bg-sunken/50 px-5 py-4">
              <dl class="grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
                <div>
                  <dt class="text-faint">Event id</dt>
                  <dd class="font-mono text-ink">{{ event.eventId }}</dd>
                </div>
                <div>
                  <dt class="text-faint">Occurred / received</dt>
                  <dd class="text-ink">
                    {{ formatDateTime(event.occurredAt) }} · {{ formatDateTime(event.receivedAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-faint">Visitor / session</dt>
                  <dd class="font-mono text-ink">{{ event.anonymousId }} · {{ event.sessionId }}</dd>
                </div>
                <div>
                  <dt class="text-faint">Consent at collection</dt>
                  <dd class="text-ink">
                    analytics {{ event.consent.analytics ? 'yes' : 'no' }} · marketing
                    {{ event.consent.marketing ? 'yes' : 'no' }} · personalization
                    {{ event.consent.personalization ? 'yes' : 'no' }}
                  </dd>
                </div>
              </dl>

              <div class="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
                <div>
                  <h3 class="mb-2 text-label font-semibold uppercase text-faint">Properties</h3>
                  <pre
                    class="max-h-56 overflow-auto rounded-lg border border-line bg-raised p-3 text-[0.75rem] leading-relaxed text-soft"
                  >{{ JSON.stringify(event.properties, null, 2) }}</pre>
                </div>

                <div>
                  <h3 class="mb-2 text-label font-semibold uppercase text-faint">Destinations</h3>
                  <ul class="flex flex-col gap-1.5">
                    <li
                      v-for="delivery in event.deliveries"
                      :key="delivery.destination"
                      class="flex items-start justify-between gap-3 rounded-md border border-line bg-raised px-3 py-2"
                    >
                      <div class="min-w-0">
                        <p class="text-[0.8125rem] font-medium text-ink">{{ delivery.destination }}</p>
                        <p v-if="delivery.reason" class="mt-0.5 text-[0.75rem] text-soft">{{ delivery.reason }}</p>
                      </div>
                      <UiBadge :tone="STATUS_TONE[delivery.status]">
                        {{ delivery.status.replace('_', ' ') }}
                      </UiBadge>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </UiCard>
    </div>
  </div>
</template>
