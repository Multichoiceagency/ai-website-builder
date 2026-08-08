<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AppInstallation, MarketplaceApp } from '@platform/schemas'

/**
 * Lightweight Apps picker — installed + a few marketplace entries.
 * Full install flow stays on /apps.
 */
const open = defineModel<boolean>('open', { default: false })

const api = useApi()

const marketplace = ref<MarketplaceApp[]>([])
const installed = ref<AppInstallation[]>([])
const pending = ref(false)
const loadError = ref('')

const installedSlugs = computed(() => new Set(installed.value.map((e) => e.appSlug)))

const available = computed(() =>
  marketplace.value.filter((entry) => !installedSlugs.value.has(entry.slug)).slice(0, 8),
)

async function load() {
  pending.value = true
  loadError.value = ''
  try {
    const [market, installs] = await Promise.all([
      api.get<MarketplaceApp[]>('/api/v1/apps/marketplace'),
      api.get<AppInstallation[]>('/api/v1/apps/installations'),
    ])
    marketplace.value = market
    installed.value = installs
  } catch {
    loadError.value = 'Could not load apps.'
  } finally {
    pending.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) void load()
})

async function goMarketplace() {
  open.value = false
  await navigateTo('/apps')
}

async function goFeeds() {
  open.value = false
  await navigateTo('/commerce/feeds')
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Apps"
    description="Installed apps and a few from the marketplace. Open the full catalogue for install details."
    @update:open="(value: boolean) => (open = value)"
  >
    <div class="flex flex-col gap-5">
      <p v-if="pending" class="text-[0.8125rem] text-faint">Loading apps…</p>
      <p v-else-if="loadError" class="text-[0.8125rem] text-danger" role="alert">{{ loadError }}</p>

      <template v-else>
        <section aria-label="Installed apps">
          <h3 class="type-caption mb-2 uppercase tracking-[0.06em] text-faint">Installed</h3>
          <ul v-if="installed.length" class="flex flex-col gap-1.5">
            <li
              v-for="entry in installed"
              :key="entry.id"
              class="flex items-center justify-between gap-3 rounded-md border border-line bg-sunken/40 px-3 py-2"
            >
              <div class="flex min-w-0 items-center gap-3">
                <ConnectorIcon :id="entry.appSlug" :label="entry.appName" size="sm" />
                <span class="truncate text-[0.8125rem] font-medium text-ink">{{ entry.appName }}</span>
              </div>
              <UiBadge tone="positive">Installed</UiBadge>
            </li>
          </ul>
          <p v-else class="text-[0.8125rem] text-soft">No apps installed yet.</p>
        </section>

        <section aria-label="Available apps">
          <h3 class="type-caption mb-2 uppercase tracking-[0.06em] text-faint">Available</h3>
          <ul v-if="available.length" class="flex flex-col gap-1.5">
            <li
              v-for="entry in available"
              :key="entry.slug"
              class="flex items-center gap-3 rounded-md border border-line px-3 py-2"
            >
              <img
                v-if="entry.iconUrl"
                :src="entry.iconUrl"
                alt=""
                class="h-9 w-9 shrink-0 rounded-lg object-cover"
                width="36"
                height="36"
                loading="lazy"
              />
              <ConnectorIcon v-else :id="entry.slug" :label="entry.name" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[0.8125rem] font-medium text-ink">{{ entry.name }}</p>
                <p class="truncate text-[0.75rem] text-faint">{{ entry.tagline || entry.publisher }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="text-[0.8125rem] text-soft">Nothing else in the marketplace right now.</p>
        </section>
      </template>
    </div>

    <template #footer>
      <UiButton @click="open = false">Close</UiButton>
      <UiButton @click="goFeeds">Product feeds</UiButton>
      <UiButton variant="primary" @click="goMarketplace">Open marketplace</UiButton>
    </template>
  </UiDialog>
</template>
