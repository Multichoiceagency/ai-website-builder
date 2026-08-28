<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GoogleBusinessStatus } from '@platform/schemas'
import { settingLabel } from '../../utils/settingLabels'

/**
 * Google Business Profile (§19).
 *
 * Connection runs through the Integration Gateway (`POST …/integrations/google/authorize`).
 * When OAuth is not configured the screen points at Settings — never a Connect
 * button that fails silently on click.
 *
 * `startGoogleConnect` is passed this page's own path: Google redirects back to
 * whatever it is given, so moving this file means changing that argument too.
 */
const api = useApi()
const route = useRoute()
const can = useCan()
const { busy: connecting, error: connectError, connect: startGoogleConnect } = useGoogleConnect()

const callbackStatus = ref('')

const { data: status, refresh } = await useAsyncData('google-business', () =>
  api.get<GoogleBusinessStatus>('/api/v1/ads/google-business'),
)

onMounted(() => {
  const google = route.query.google
  if (typeof google === 'string' && google) {
    callbackStatus.value = google
    if (google === 'connected') void refresh()
  }
})

async function connect() {
  await startGoogleConnect('/settings/google-business')
}

const heading = computed(() => {
  if (!status.value) return 'Checking…'
  if (!status.value.configured) return 'Finish setup in Settings'
  if (!status.value.connected) return 'Connect your Google Business Profile'
  return 'Your Google Business Profile'
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Google Business Profile"
      description="Your listing, reviews, posts and local performance — once it is connected."
    >
      <template #actions>
        <UiBadge v-if="status?.available" tone="positive">Connected</UiBadge>
        <UiBadge v-else-if="status?.configured" tone="warning">Not connected</UiBadge>
        <UiBadge v-else tone="neutral">Needs setup in Settings</UiBadge>
      </template>
    </UiPageHeader>

    <div class="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <UiCard>
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="mb-1 text-heading font-semibold text-ink">{{ heading }}</h2>
            <p class="max-w-2xl text-[0.875rem] leading-relaxed text-soft">
              {{ status?.reason ?? 'Checking…' }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UiButton
              v-if="status && !status.configured"
              size="sm"
              to="/settings/integrations"
            >
              Open Settings
            </UiButton>
            <UiButton
              v-if="can('integration:write') && status?.configured && !status.connected"
              size="sm"
              variant="primary"
              :loading="connecting"
              @click="connect"
            >
              Connect Google
            </UiButton>
          </div>
        </div>

        <p v-if="connectError" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ connectError }}
        </p>
        <p
          v-else-if="callbackStatus && callbackStatus !== 'connected'"
          class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
          role="alert"
        >
          Google connection failed: {{ callbackStatus }}
        </p>
        <p
          v-else-if="callbackStatus === 'connected'"
          class="mb-4 rounded-lg bg-positive-soft px-3 py-2 text-[0.8125rem] text-positive"
          role="status"
        >
          Google is connected to this workspace.
        </p>

        <div v-if="status && !status.configured" class="flex flex-col gap-5">
          <div>
            <h3 class="text-label font-semibold uppercase text-faint">
              1 — Configure in Settings
            </h3>
            <ul class="mt-2 flex flex-col gap-1">
              <li v-for="name in status.missingConfiguration" :key="name" class="text-[0.8125rem] text-ink">
                {{ settingLabel(name) }}
              </li>
            </ul>
            <p class="mt-2 text-[0.8125rem] text-faint">
              Add these under Settings → Integrations. Values are never shown here after saving.
            </p>
            <UiButton class="mt-3" size="sm" to="/settings/integrations">Open Settings → Integrations</UiButton>
          </div>

          <div>
            <h3 class="text-label font-semibold uppercase text-faint">
              2 — APIs to enable on the Google Cloud project
            </h3>
            <ul class="mt-2 flex flex-col gap-1.5 text-[0.8125rem] leading-relaxed text-soft">
              <li v-for="entry in status.requiredApis" :key="entry">{{ entry }}</li>
            </ul>
          </div>

          <div>
            <h3 class="text-label font-semibold uppercase text-faint">3 — OAuth scopes to request</h3>
            <ul class="mt-2 flex flex-col gap-1">
              <li v-for="scope in status.requiredScopes" :key="scope" class="font-mono text-[0.8125rem] break-all text-ink">
                {{ scope }}
              </li>
            </ul>
            <p class="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-faint">
              Google offers nothing narrower: this one scope covers reading listings, editing them, posting, and
              replying to reviews. Connecting grants all of it.
            </p>
          </div>
        </div>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard>
          <h2 class="mb-2 text-label font-semibold uppercase text-faint">Locations</h2>
          <UiEmptyState
            v-if="!status?.locations.length"
            title="Nothing read yet"
            description="Locations appear here once a profile is connected. We do not show examples."
          />
          <ul v-else class="flex flex-col gap-2">
            <li v-for="location in status.locations" :key="location.externalId" class="text-[0.875rem]">
              <span class="font-medium text-ink">{{ location.name }}</span>
              <span class="block text-[0.8125rem] text-soft">{{ location.address }}</span>
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="mb-2 text-label font-semibold uppercase text-faint">One Google connection</h2>
          <p class="text-[0.8125rem] leading-relaxed text-soft">
            Connect Google once for Business Profile, Search Console, Analytics, Ads and Gmail campaigns.
            Sign-up with Google uses the same permission set so the workspace can land already linked.
            You can review every scope under Settings → Integrations before connecting.
          </p>
        </UiCard>
      </div>
    </div>
  </div>
</template>
