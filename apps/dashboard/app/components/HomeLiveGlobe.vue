<script setup lang="ts">
import { computed, defineAsyncComponent, onErrorCaptured, ref } from 'vue'
import type { AnalyticsLivePresence } from '@platform/schemas'
import { Sparkles } from '@lucide/vue'

/**
 * Compact live globe + AI tips for the home command centre.
 * Counters always render; the 3D globe degrades via ClientOnly + async load
 * so Three.js / WebGL failures never blank the home page.
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

const { data, pending, refresh, error } = await useAsyncData(
  'home:live-presence',
  () =>
    api
      .get<AnalyticsLivePresence>('/api/v1/analytics/live', {
        windowMinutes: 15,
        ai: '1',
      })
      .catch(() => null),
  { default: () => null },
)

const presence = computed(() => data.value ?? EMPTY_PRESENCE)

const markers = computed(() =>
  presence.value.visitors
    .filter((visitor) => visitor.lat != null && visitor.lng != null)
    .map((visitor) => ({
      id: visitor.id,
      label: visitor.label,
      lat: visitor.lat!,
      lng: visitor.lng!,
      src: visitor.avatarUrl,
      channel: visitor.channel,
    })),
)

const tip = computed(() => presence.value.recommendations[0] ?? null)
const websiteCount = computed(() => presence.value.channels.website)
const ecommerceCount = computed(() => presence.value.channels.ecommerce)
const activeCount = computed(() => presence.value.activeCount)
</script>

<template>
  <UiCard :padded="false" class="overflow-hidden !p-0">
    <div class="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
      <div>
        <h2 class="text-heading font-semibold text-ink">Live worldwide</h2>
        <p class="mt-0.5 text-[0.8125rem] text-soft">
          Website + ecommerce visitors · Aceternity-style globe
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiBadge :tone="activeCount > 0 ? 'positive' : 'neutral'">
          {{ activeCount }} live
        </UiBadge>
        <UiButton size="sm" :loading="pending" @click="refresh()">Refresh</UiButton>
        <UiButton size="sm" to="/analytics/live">Open Live View</UiButton>
      </div>
    </div>

    <p
      v-if="error"
      class="mx-4 mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger sm:mx-5"
      role="alert"
    >
      Live presence unavailable — {{ error.message }}. Counters stay at zero until tracking responds.
    </p>

    <div class="grid gap-4 p-4 sm:grid-cols-[1.1fr_0.9fr] sm:p-5">
      <ClientOnly>
        <div
          v-if="globeCrashed"
          class="flex aspect-square w-full max-w-lg flex-col items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#1a2744,transparent_55%),#0b1220] px-6 text-center"
        >
          <p class="text-[0.875rem] font-medium text-white/90">{{ activeCount }} live</p>
          <p class="mt-1 text-[0.75rem] text-white/55">
            {{ globeCrashReason || 'Globe unavailable — counters still work.' }}
          </p>
        </div>
        <AnalyticsLiveGlobeLazy
          v-else
          class="max-w-none"
          :active-count="activeCount"
          :markers="markers"
          :auto-rotate-speed="0.45"
        />
        <template #fallback>
          <div
            class="flex aspect-square w-full max-w-lg flex-col items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#1a2744,transparent_55%),#0b1220] px-6 text-center"
          >
            <p class="text-[0.875rem] font-medium text-white/90">{{ activeCount }} live</p>
            <p class="mt-1 text-[0.75rem] text-white/55">Loading globe…</p>
          </div>
        </template>
      </ClientOnly>

      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-line px-3 py-2">
            <p class="text-[0.6875rem] uppercase tracking-wide text-faint">Website</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-ink">
              {{ websiteCount }}
            </p>
          </div>
          <div class="rounded-xl border border-line px-3 py-2">
            <p class="text-[0.6875rem] uppercase tracking-wide text-faint">Ecommerce</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-ink">
              {{ ecommerceCount }}
            </p>
          </div>
        </div>

        <div v-if="tip" class="rounded-xl border border-brand/25 bg-brand/5 px-3 py-3">
          <div class="mb-1 flex items-center gap-1.5 text-brand">
            <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
            <span class="text-[0.6875rem] font-semibold uppercase tracking-wide">AI tip</span>
          </div>
          <p class="text-[0.8125rem] font-semibold text-ink">{{ tip.title }}</p>
          <p class="mt-1 text-[0.75rem] leading-relaxed text-soft">{{ tip.body }}</p>
          <NuxtLink
            v-if="tip.href"
            :to="tip.href"
            class="mt-2 inline-block text-[0.75rem] font-semibold text-brand no-underline hover:underline"
          >
            Open →
          </NuxtLink>
        </div>

        <ul v-if="presence.visitors.length" class="flex flex-col gap-1.5">
          <li
            v-for="visitor in presence.visitors.slice(0, 4)"
            :key="visitor.id"
            class="flex items-center gap-2 rounded-lg px-1 py-1"
          >
            <img
              :src="visitor.avatarUrl"
              alt=""
              class="h-7 w-7 rounded-full bg-sunken object-cover"
              width="28"
              height="28"
              loading="lazy"
            />
            <span class="min-w-0 flex-1 truncate text-[0.75rem] text-ink">
              {{ visitor.path || visitor.label }}
            </span>
            <span class="shrink-0 text-[0.6875rem] text-faint">{{ visitor.channel }}</span>
          </li>
        </ul>
        <p v-else class="text-[0.8125rem] text-soft">
          Live avatars appear when published pages or shop tracking fire.
        </p>
      </div>
    </div>
  </UiCard>
</template>
