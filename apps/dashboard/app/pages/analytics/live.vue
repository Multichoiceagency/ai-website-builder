<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onErrorCaptured, onMounted, ref, watch } from 'vue'
import type { AnalyticsLivePresence, Site } from '@platform/schemas'
import { Sparkles } from '@lucide/vue'

/**
 * Live View — Aceternity-style 3D globe with live visitor avatars,
 * website + ecommerce channel split, and AI recommendations.
 */

const EMPTY_PRESENCE: AnalyticsLivePresence = {
  activeCount: 0,
  windowMinutes: 15,
  asOf: new Date(0).toISOString(),
  siteId: null,
  visitors: [],
  locations: [],
  channels: { website: 0, ecommerce: 0, unknown: 0 },
  recommendations: [],
}

const api = useApi()

const siteId = ref('')
const autoRefresh = ref(true)
const aiTips = ref(true)
const selected = ref<string | null>(null)
const globeCrashed = ref(false)
const globeCrashReason = ref('')

onErrorCaptured((caught) => {
  globeCrashed.value = true
  globeCrashReason.value =
    caught instanceof Error ? caught.message : 'The 3D globe failed to render.'
  return false
})

const AnalyticsLiveGlobeLazy = defineAsyncComponent({
  loader: () => import('~/components/AnalyticsLiveGlobe.vue'),
  delay: 80,
  timeout: 20_000,
  onError(error, _retry, fail) {
    globeCrashed.value = true
    globeCrashReason.value = error instanceof Error ? error.message : 'Could not load the globe module.'
    fail()
  },
})

const { data: sites } = await useAsyncData('live:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

const { data, pending, refresh, error } = await useAsyncData(
  () => `analytics:live-presence:${siteId.value}:${aiTips.value ? 'ai' : 'rules'}`,
  () =>
    api
      .get<AnalyticsLivePresence>('/api/v1/analytics/live', {
        windowMinutes: 15,
        ai: aiTips.value ? '1' : '0',
        ...(siteId.value ? { siteId: siteId.value } : {}),
      })
      .catch(() => null),
  { watch: [siteId, aiTips], default: () => null },
)

const presence = computed(() => data.value ?? EMPTY_PRESENCE)

const siteOptions = computed(() => [
  { label: 'All websites', value: '' },
  ...(sites.value ?? []).map((site) => ({ label: site.name, value: site.id })),
])

const globeMarkers = computed(() =>
  presence.value.visitors
    .filter((visitor) => visitor.lat != null && visitor.lng != null)
    .map((visitor) => ({
      id: visitor.id,
      label: visitor.label,
      lat: visitor.lat!,
      lng: visitor.lng!,
      src: visitor.avatarUrl,
      channel: visitor.channel,
      weight: Math.min(4, Math.max(1, visitor.eventCount / 3)),
    })),
)

const selectedVisitor = computed(() =>
  presence.value.visitors.find((visitor) => visitor.id === selected.value) ?? null,
)

let timer: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (timer) clearInterval(timer)
  timer = null
}

function startPolling() {
  stopPolling()
  if (autoRefresh.value) timer = setInterval(() => refresh(), 20_000)
}

onMounted(startPolling)
onBeforeUnmount(stopPolling)

watch(autoRefresh, (enabled) => {
  if (enabled) startPolling()
  else stopPolling()
})

const toneClass = {
  info: 'border-line bg-sunken/40',
  action: 'border-brand/30 bg-brand/5',
  warning: 'border-warning/40 bg-warning/5',
} as const
</script>

<template>
  <div>
    <UiPageHeader
      title="Live View"
      description="Live visitor avatars on a 3D globe — websites and ecommerce — with AI recommendations."
    >
      <template #actions>
        <UiSelect v-if="(sites?.length ?? 0) > 1" v-model="siteId" :options="siteOptions" aria-label="Website" />
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
        <UiButton size="sm" :variant="aiTips ? 'primary' : 'secondary'" @click="aiTips = !aiTips">
          <Sparkles class="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {{ aiTips ? 'AI tips on' : 'AI tips off' }}
        </UiButton>
        <UiButton size="sm" :variant="autoRefresh ? 'primary' : 'secondary'" @click="autoRefresh = !autoRefresh">
          {{ autoRefresh ? 'Live · 20s' : 'Paused' }}
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-5 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      Could not load live presence: {{ error.message }}. Showing empty counters until tracking responds.
    </p>

    <div v-if="pending && !data" class="mb-5 py-8 text-center text-sm text-soft">Reading live sessions…</div>

    <section class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStat label="Live now" :value="presence.activeCount" :hint="`Last ${presence.windowMinutes} min`" />
      <UiStat label="Website" :value="presence.channels.website" hint="Page / lead sessions" />
      <UiStat label="Ecommerce" :value="presence.channels.ecommerce" hint="Shop / cart signals" />
      <UiStat label="Mapped" :value="globeMarkers.length" hint="With country pin" />
    </section>

    <div class="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <UiCard :padded="false" class="overflow-hidden !p-0">
        <div class="flex items-center justify-between gap-3 px-4 pt-4">
          <div>
            <h2 class="text-heading font-semibold text-ink">Live globe</h2>
            <p class="mt-0.5 text-[0.8125rem] text-soft">
              Aceternity-style Earth — pins are live visitors only.
            </p>
          </div>
          <UiBadge :tone="autoRefresh ? 'positive' : 'neutral'">
            {{ autoRefresh ? 'Live' : 'Paused' }}
          </UiBadge>
        </div>
        <div class="p-3 sm:p-4">
          <ClientOnly>
            <div
              v-if="globeCrashed"
              class="flex aspect-square w-full max-w-lg flex-col items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#1a2744,transparent_55%),#0b1220] px-6 text-center"
            >
              <p class="text-[0.875rem] font-medium text-white/90">{{ presence.activeCount }} live</p>
              <p class="mt-1 text-[0.75rem] text-white/55">
                {{ globeCrashReason || 'Globe unavailable — counters and lists still work.' }}
              </p>
            </div>
            <AnalyticsLiveGlobeLazy
              v-else
              :active-count="presence.activeCount"
              :markers="globeMarkers"
            />
            <template #fallback>
              <div
                class="flex aspect-square w-full max-w-lg flex-col items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#1a2744,transparent_55%),#0b1220] px-6 text-center"
              >
                <p class="text-[0.875rem] font-medium text-white/90">{{ presence.activeCount }} live</p>
                <p class="mt-1 text-[0.75rem] text-white/55">Loading globe…</p>
              </div>
            </template>
          </ClientOnly>
        </div>
      </UiCard>

      <div class="flex flex-col gap-5">
        <UiCard>
          <div class="mb-3 flex items-center gap-2">
            <Sparkles class="h-4 w-4 text-brand" aria-hidden="true" />
            <h2 class="text-heading font-semibold text-ink">AI recommendations</h2>
          </div>
          <ul v-if="presence.recommendations.length" class="flex flex-col gap-2">
            <li
              v-for="tip in presence.recommendations"
              :key="tip.id"
              class="rounded-xl border px-3 py-2.5"
              :class="toneClass[tip.tone]"
            >
              <p class="text-[0.8125rem] font-semibold text-ink">{{ tip.title }}</p>
              <p class="mt-1 text-[0.75rem] leading-relaxed text-soft">{{ tip.body }}</p>
              <NuxtLink
                v-if="tip.href"
                :to="tip.href"
                class="mt-2 inline-block text-[0.75rem] font-semibold text-brand no-underline hover:underline"
              >
                Open →
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="text-[0.8125rem] text-soft">No tips yet — refresh with AI tips on.</p>
        </UiCard>

        <UiCard>
          <h2 class="text-heading font-semibold text-ink">Locations</h2>
          <p class="mt-0.5 text-[0.8125rem] text-soft">Countries from live session locale / country.</p>
          <UiEmptyState
            v-if="!presence.locations.length"
            class="mt-4 !py-8"
            title="No mapped locations yet"
            description="Visitors still count above. Pins appear when a country can be derived from the session."
          />
          <ul v-else class="mt-3 divide-y divide-line rounded-lg border border-line">
            <li
              v-for="row in presence.locations"
              :key="row.countryCode"
              class="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span class="truncate text-sm text-ink">{{ row.countryName }}</span>
              <span class="shrink-0 text-sm tabular-nums text-soft">{{ row.visitors }}</span>
            </li>
          </ul>
        </UiCard>
      </div>
    </div>

    <UiCard class="mt-5">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-heading font-semibold text-ink">Live visitors</h2>
        <span class="text-[0.75rem] text-faint">Avatars keyed to anonymous id</span>
      </div>
      <UiEmptyState
        v-if="!presence.visitors.length"
        title="No visitors in this window"
        description="When the tracking snippet fires on a published page or shop, people appear here with an avatar."
      >
        <UiButton variant="primary" to="/analytics/tracking">Check tracking</UiButton>
      </UiEmptyState>
      <ul v-else class="grid gap-2 sm:grid-cols-2">
        <li
          v-for="visitor in presence.visitors"
          :key="visitor.id"
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-line-strong"
          :class="selected === visitor.id ? 'border-brand/40 bg-brand/5' : ''"
          @click="selected = visitor.id"
        >
          <img
            :src="visitor.avatarUrl"
            :alt="visitor.label"
            class="h-10 w-10 rounded-full bg-sunken object-cover"
            width="40"
            height="40"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[0.8125rem] font-medium text-ink">{{ visitor.path || 'Visit' }}</p>
            <p class="truncate text-[0.6875rem] text-faint">
              {{ visitor.countryName || 'Unmapped' }}
              · {{ visitor.channel }}
            </p>
          </div>
          <UiBadge :tone="visitor.channel === 'ecommerce' ? 'warning' : 'neutral'">
            {{ visitor.channel }}
          </UiBadge>
        </li>
      </ul>
      <p v-if="selectedVisitor" class="mt-3 text-[0.75rem] text-soft">
        Selected: {{ selectedVisitor.label }} · last seen
        {{ new Date(selectedVisitor.lastSeenAt).toLocaleTimeString() }}
      </p>
    </UiCard>
  </div>
</template>
