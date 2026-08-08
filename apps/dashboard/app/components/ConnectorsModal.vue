<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Gift, Search, Settings, X } from '@lucide/vue'

/**
 * Connectors browser — Nango-backed OAuth (ADR-0006).
 * Authorize returns a Nango Connect link when `NANGO_SECRET_KEY` is set.
 * Brand marks live in ConnectorIcon.vue.
 */

interface ProviderRow {
  id: string
  name: string
  description: string
  category?: string
  configured: boolean
  reason: string | null
  connection: { id: string; accountLabel?: string } | null
  broker?: 'nango' | 'native'
}

const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const can = useCan()
const route = useRoute()

const query = ref('')
const filter = ref<'all' | 'enabled'>('all')
const category = ref('')
const busy = ref('')
const error = ref('')

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'google', label: 'Google' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'ai', label: 'AI' },
  { id: 'analytics', label: 'Analytics' },
] as const

const { data, refresh, status } = await useAsyncData(
  'shell:connectors',
  () =>
    api
      .get<{ providers: ProviderRow[]; broker?: string }>('/api/v1/integrations')
      .catch(() => ({ providers: [] as ProviderRow[], broker: undefined })),
  { immediate: false },
)

watch(open, (value) => {
  if (value) void refresh()
})

onMounted(() => {
  if (open.value) void refresh()
})

const providers = computed(() => data.value?.providers ?? [])
const broker = computed(() => data.value?.broker ?? 'native')

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return providers.value.filter((provider) => {
    if (filter.value === 'enabled' && !provider.connection) return false
    if (category.value && provider.category !== category.value) return false
    if (!term) return true
    return `${provider.name} ${provider.description} ${provider.id}`.toLowerCase().includes(term)
  })
})

const categoryCounts = computed(() => {
  const counts: Record<string, number> = { '': providers.value.length }
  for (const entry of CATEGORIES) {
    if (!entry.id) continue
    counts[entry.id] = providers.value.filter((provider) => provider.category === entry.id).length
  }
  return counts
})

const enabledCount = computed(() => providers.value.filter((provider) => provider.connection).length)

async function connect(providerId: string) {
  if (!can('integration:write')) return
  busy.value = providerId
  error.value = ''
  try {
    const result = await api.post<{ authorizeUrl?: string; url?: string; broker?: string }>(
      `/api/v1/integrations/${providerId}/authorize`,
      { redirectTo: route.fullPath || '/settings/integrations' },
    )
    const href = result.authorizeUrl || result.url
    if (href) {
      window.location.href = href
      return
    }
    error.value = 'No authorize URL returned. Check Nango configuration on the API.'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not start connect.'
  } finally {
    busy.value = ''
  }
}

function close() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[var(--z-modal,60)] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connectors-title"
    >
      <button
        type="button"
        class="absolute inset-0 bg-[#1a1a1a]/35 backdrop-blur-sm"
        aria-label="Close connectors"
        @click="close"
      />

      <div
        class="relative flex max-h-[min(88vh,52rem)] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      >
        <button
          type="button"
          class="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Close"
          @click="close"
        >
          <X class="h-4 w-4" :stroke-width="1.75" />
        </button>

        <aside class="flex w-52 shrink-0 flex-col border-r border-line/70 bg-[#f7f7f5]/80 p-4">
          <label class="relative mb-3 block">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" :stroke-width="1.75" />
            <input
              v-model="query"
              type="search"
              placeholder="Search"
              class="h-9 w-full rounded-xl border border-line bg-white pl-8 pr-3 text-[0.8125rem] text-ink outline-none placeholder:text-faint focus:border-ink/30"
            />
          </label>

          <div class="mb-3 flex gap-1">
            <button
              type="button"
              class="flex-1 rounded-lg px-2 py-1.5 text-[0.75rem] font-medium transition-colors"
              :class="filter === 'enabled' ? 'bg-ink text-paper' : 'text-soft hover:bg-white'"
              @click="filter = 'enabled'"
            >
              Enabled
              <span class="opacity-70">{{ enabledCount }}</span>
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg px-2 py-1.5 text-[0.75rem] font-medium transition-colors"
              :class="filter === 'all' ? 'bg-ink text-paper' : 'text-soft hover:bg-white'"
              @click="filter = 'all'"
            >
              All
              <span class="opacity-70">{{ providers.length }}</span>
            </button>
          </div>

          <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Connector categories">
            <button
              v-for="entry in CATEGORIES"
              :key="entry.id || 'all'"
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[0.8125rem] transition-colors"
              :class="category === entry.id ? 'bg-white font-medium text-ink shadow-sm' : 'text-soft hover:bg-white/70'"
              @click="category = entry.id"
            >
              <span>{{ entry.label }}</span>
              <span class="tabular-nums text-[0.6875rem] text-faint">{{ categoryCounts[entry.id] ?? 0 }}</span>
            </button>
          </nav>

          <div class="mt-3 flex flex-col gap-1.5 border-t border-line/70 pt-3">
            <NuxtLink
              to="/settings/integrations"
              class="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] text-soft no-underline hover:bg-white hover:text-ink"
              @click="close"
            >
              <Settings class="h-3.5 w-3.5" :stroke-width="1.75" />
              Admin settings
            </NuxtLink>
            <a
              href="mailto:hello@multichoice.agency?subject=Connector%20request"
              class="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] text-soft no-underline hover:bg-white hover:text-ink"
            >
              <Gift class="h-3.5 w-3.5" :stroke-width="1.75" />
              Request
            </a>
          </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="border-b border-line/70 px-8 pb-5 pt-7">
            <p id="connectors-title" class="text-[1.75rem] font-semibold tracking-tight text-ink">Connectors</p>
            <p class="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-soft">
              OAuth connections are brokered by
              <span class="font-medium text-ink">{{ broker === 'nango' ? 'Nango' : 'native Google OAuth' }}</span>.
              Tokens stay on the server — Connect opens Nango’s consent UI when Nango is configured.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <UiButton size="sm" to="/settings/integrations" @click="close">Manage connections</UiButton>
              <UiButton size="sm" variant="primary" @click="close">Got it</UiButton>
            </div>
            <p v-if="error" class="mt-3 text-[0.8125rem] text-danger" role="alert">{{ error }}</p>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto p-6">
            <p v-if="status === 'pending'" class="py-16 text-center text-[0.8125rem] text-soft">Loading connectors…</p>
            <UiEmptyState
              v-else-if="!filtered.length"
              title="No connectors match"
              description="Try another category or clear search."
            />
            <ul v-else class="grid gap-3 sm:grid-cols-2">
              <li
                v-for="provider in filtered"
                :key="provider.id"
                class="flex gap-3 rounded-2xl border border-line/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <ConnectorIcon :id="provider.id" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-start gap-2">
                    <p class="truncate text-[0.9375rem] font-semibold text-ink">{{ provider.name }}</p>
                    <UiBadge v-if="provider.connection" tone="positive">On</UiBadge>
                    <UiBadge v-else-if="!provider.configured" tone="warning">Setup</UiBadge>
                    <UiBadge v-if="provider.broker === 'nango'" tone="neutral">Nango</UiBadge>
                  </div>
                  <p class="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-soft">
                    {{ provider.description || provider.reason || 'Connect this tool to your workspace.' }}
                  </p>
                  <p v-if="provider.reason && !provider.connection" class="mt-1 text-[0.6875rem] text-warning">
                    {{ provider.reason }}
                  </p>
                  <div class="mt-3">
                    <UiButton
                      v-if="!provider.connection && can('integration:write')"
                      size="sm"
                      variant="primary"
                      :disabled="!provider.configured"
                      :loading="busy === provider.id"
                      @click="connect(provider.id)"
                    >
                      Connect
                    </UiButton>
                    <UiButton
                      v-else
                      size="sm"
                      to="/settings/integrations"
                      @click="close"
                    >
                      Manage
                    </UiButton>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
