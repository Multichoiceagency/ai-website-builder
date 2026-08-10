<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Site } from '@platform/schemas'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Settings,
  Sparkles,
} from '@lucide/vue'

/**
 * Lovable-inspired glass shell: frosted sidebar, soft atmosphere, Connectors
 * modal, ⌘K search, AI as a drawer. Editor stays on layouts/editor.vue.
 */
const session = useSession()
const membership = useActiveMembership()
const tenantId = useActiveTenantId()
const activeSiteId = useActiveSiteId()
const api = useApi()
const can = useCan()
const route = useRoute()
const config = useRuntimeConfig()

const {
  logoUrl,
  brandName,
  hidePlatformBranding,
  sidebarCollapsed,
  toggleSidebar,
} = useDashboardBranding()

const assistantOpen = useAssistantOpen()
const connectorsOpen = ref(false)
const commandOpen = ref(false)
const feedbackOpen = ref(false)
const feedbackMessage = ref('')
const feedbackBusy = ref(false)
const feedbackError = ref('')
const feedbackSent = ref(false)
const exitImpersonating = ref(false)

const isImpersonating = computed(() => Boolean(session.value?.impersonatorUserId))

async function submitFeedback() {
  feedbackError.value = ''
  feedbackSent.value = false
  const message = feedbackMessage.value.trim()
  if (!message) {
    feedbackError.value = 'Write a short message.'
    return
  }
  feedbackBusy.value = true
  try {
    await api.post('/api/v1/feedback', { message, pagePath: route.fullPath })
    feedbackSent.value = true
    feedbackMessage.value = ''
    setTimeout(() => {
      feedbackOpen.value = false
      feedbackSent.value = false
    }, 1200)
  } catch (caught) {
    feedbackError.value = caught instanceof ApiError ? caught.message : 'Could not send feedback.'
  } finally {
    feedbackBusy.value = false
  }
}

async function exitImpersonation() {
  exitImpersonating.value = true
  try {
    const context = await api.post<NonNullable<typeof session.value>>('/api/v1/auth/exit-impersonation')
    session.value = context
    tenantId.value = context.activeTenantId
    const adminUrl = String(config.public.adminUrl || '').trim()
    if (adminUrl) {
      window.location.href = adminUrl
      return
    }
    await navigateTo('/')
  } catch {
    await signOut()
  } finally {
    exitImpersonating.value = false
  }
}

const section = computed(() => sectionForPath(route.path))
const subNav = computed(() =>
  (section.value?.items ?? []).filter((item) => !item.permission || can(item.permission)),
)

const isActiveSection = (id: string) => section.value?.id === id
const isActiveItem = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

const { data: sites } = await useAsyncData('shell:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

syncActiveSiteId(sites.value)
watch(sites, (list) => syncActiveSiteId(list), { deep: true })

const activeSite = computed(() => sites.value?.find((site) => site.id === activeSiteId.value) ?? null)

const workspaceLabel = computed(
  () => brandName.value || membership.value?.tenantName || 'Workspace',
)

const previewUrl = computed(() =>
  buildStorefrontUrl({
    storefrontBase: String(config.public.storefrontUrl || 'http://localhost:3001'),
    primaryHostname: activeSite.value?.primaryHostname,
    path: '/',
  }),
)

const moduleSections = computed(() =>
  NAV_SECTIONS.filter((entry) => !['home', 'ai', 'apps', 'settings'].includes(entry.id)),
)

function onSiteChange(event: Event) {
  activeSiteId.value = (event.target as HTMLSelectElement).value
}

async function signOut() {
  await api.post('/api/v1/auth/logout')
  session.value = null
  tenantId.value = null
  await navigateTo('/login')
}

function openAssistant() {
  assistantOpen.value = true
  commandOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandOpen.value = !commandOpen.value
    if (commandOpen.value) assistantOpen.value = false
  }
  if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
    event.preventDefault()
    toggleSidebar()
  }
  if (event.key === 'Escape') {
    if (commandOpen.value) commandOpen.value = false
    else if (connectorsOpen.value) connectorsOpen.value = false
    else if (assistantOpen.value) assistantOpen.value = false
  }
}

watch(assistantOpen, (open) => {
  if (open) commandOpen.value = false
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="relative flex h-screen overflow-hidden">
    <div
      v-if="isImpersonating"
      class="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-ink px-4 py-2 text-[0.75rem] text-paper"
      role="status"
    >
      <span>
        Viewing as <strong>{{ session?.user.email }}</strong> — staff impersonation
      </span>
      <button
        type="button"
        class="rounded-md border border-white/30 px-2.5 py-1 font-medium hover:bg-white/10"
        :disabled="exitImpersonating"
        @click="exitImpersonation"
      >
        {{ exitImpersonating ? 'Exiting…' : 'Exit impersonation' }}
      </button>
    </div>

    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute inset-0 bg-[#f3f1ec]" />
      <div class="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#d8ebe3]/55 blur-3xl" />
      <div class="absolute right-0 top-20 h-[32rem] w-[32rem] rounded-full bg-[#f0dcc8]/50 blur-3xl" />
      <div class="absolute bottom-0 left-1/3 h-[24rem] w-[40rem] rounded-full bg-[#dde5f2]/45 blur-3xl" />
    </div>

    <aside
      class="relative z-10 m-3 flex shrink-0 flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/55 shadow-[0_8px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl transition-[width] duration-200"
      :class="[
        sidebarCollapsed ? 'w-[4.25rem]' : 'w-[16.5rem]',
        isImpersonating ? 'mt-12' : '',
      ]"
      aria-label="Workspace"
    >
      <div
        class="flex items-center gap-2 border-b border-black/5 py-3"
        :class="sidebarCollapsed ? 'flex-col px-2' : 'px-3'"
      >
        <NuxtLink
          to="/"
          class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl no-underline"
          :class="logoUrl ? 'bg-transparent' : 'bg-ink text-paper'"
          :aria-label="workspaceLabel"
        >
          <img v-if="logoUrl" :src="logoUrl" :alt="workspaceLabel" class="h-9 w-9 object-contain" />
          <Sparkles v-else class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
        </NuxtLink>
        <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
          <p class="truncate text-[0.8125rem] font-semibold tracking-tight text-ink">
            {{ workspaceLabel }}
          </p>
          <p class="truncate text-[0.6875rem] text-faint">
            {{ membership?.plan || 'Workspace' }}
            <span v-if="!hidePlatformBranding"> · Platform</span>
          </p>
        </div>
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-black/5 hover:text-ink"
          :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="sidebarCollapsed ? 'Expand (⌘\\)' : 'Collapse (⌘\\)'"
          @click="toggleSidebar"
        >
          <PanelLeftOpen v-if="sidebarCollapsed" class="h-4 w-4" :stroke-width="1.75" />
          <PanelLeftClose v-else class="h-4 w-4" :stroke-width="1.75" />
        </button>
      </div>

      <nav class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        <div class="space-y-0.5">
          <NuxtLink
            to="/"
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-medium no-underline transition-colors"
            :class="[
              sidebarCollapsed ? 'justify-center px-0' : '',
              route.path === '/' ? 'bg-black/5 text-ink' : 'text-soft hover:bg-black/[0.04] hover:text-ink',
            ]"
            title="Dashboard"
          >
            <Sparkles class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed">Dashboard</span>
          </NuxtLink>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.8125rem] font-medium text-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            :class="sidebarCollapsed ? 'justify-center px-0' : ''"
            title="Search (⌘K)"
            @click="commandOpen = true"
          >
            <Search class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed" class="flex flex-1 items-center justify-between">
              Search
              <kbd class="rounded-md border border-black/10 bg-white/70 px-1.5 py-0.5 text-[0.625rem] text-faint">⌘K</kbd>
            </span>
          </button>
          <NuxtLink
            to="/website/templates"
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-medium no-underline transition-colors"
            :class="[
              sidebarCollapsed ? 'justify-center px-0' : '',
              isActiveItem('/website/templates') ? 'bg-black/5 text-ink' : 'text-soft hover:bg-black/[0.04] hover:text-ink',
            ]"
            title="Templates"
          >
            <LayoutTemplate class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed">Templates</span>
          </NuxtLink>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.8125rem] font-medium text-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            :class="sidebarCollapsed ? 'justify-center px-0' : ''"
            title="Connectors"
            @click="connectorsOpen = true"
          >
            <Plug class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed">Connectors</span>
          </button>
        </div>

        <div v-if="!sidebarCollapsed && (sites?.length ?? 0) > 0">
          <p class="mb-1.5 px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-faint">Sites</p>
          <select
            :value="activeSiteId ?? ''"
            class="mb-1 h-9 w-full rounded-xl border border-black/8 bg-white/70 px-2.5 text-[0.8125rem] text-ink outline-none"
            aria-label="Active website"
            @change="onSiteChange"
          >
            <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>

        <div v-if="subNav.length">
          <p
            v-if="!sidebarCollapsed"
            class="mb-1.5 px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-faint"
          >
            {{ section?.label }}
          </p>
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in subNav"
              :key="`${item.label}-${item.to}`"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-medium no-underline transition-colors"
              :class="[
                sidebarCollapsed ? 'justify-center px-0' : '',
                isActiveItem(item.to)
                  ? 'bg-black/5 text-ink'
                  : 'text-soft hover:bg-black/[0.04] hover:text-ink',
              ]"
              :title="item.label"
            >
              <component :is="item.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
              <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <span v-if="!sidebarCollapsed && item.phase" class="shrink-0 text-[0.625rem] text-faint">soon</span>
            </NuxtLink>
          </div>
        </div>

        <div>
          <p
            v-if="!sidebarCollapsed"
            class="mb-1.5 px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-faint"
          >
            Modules
          </p>
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in moduleSections"
              :key="item.id"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-medium no-underline transition-colors"
              :class="[
                sidebarCollapsed ? 'justify-center px-0' : '',
                isActiveSection(item.id)
                  ? 'bg-black/5 text-ink'
                  : 'text-soft hover:bg-black/[0.04] hover:text-ink',
              ]"
              :title="item.label"
            >
              <component :is="item.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
              <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="mt-auto space-y-1 border-t border-black/5 p-2.5">
        <NuxtLink
          to="/settings"
          class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.8125rem] text-soft no-underline transition-colors hover:bg-black/[0.04] hover:text-ink"
          :class="sidebarCollapsed ? 'justify-center px-0' : ''"
          title="Settings"
        >
          <Settings class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
          <span v-if="!sidebarCollapsed">Settings & plan</span>
        </NuxtLink>
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04]"
          :class="sidebarCollapsed ? 'justify-center px-0' : ''"
          :title="`${session?.user.name} — sign out`"
          @click="signOut"
        >
          <span class="grid h-8 w-8 place-items-center rounded-full bg-ink text-[0.75rem] font-semibold text-paper">
            {{ (session?.user.name ?? '?').charAt(0).toUpperCase() }}
          </span>
          <span v-if="!sidebarCollapsed" class="min-w-0">
            <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ session?.user.name }}</span>
            <span class="block truncate text-[0.6875rem] text-faint">Sign out</span>
          </span>
        </button>
      </div>
    </aside>

    <div
      class="relative z-0 flex min-w-0 flex-1 flex-col py-3 pr-3"
      :class="isImpersonating ? 'pt-12' : ''"
    >
      <header class="mb-3 flex h-12 shrink-0 items-center gap-3 rounded-2xl border border-white/50 bg-white/45 px-4 shadow-sm backdrop-blur-xl">
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-lg text-soft transition-colors hover:bg-black/5 hover:text-ink"
          :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="sidebarCollapsed ? 'Expand menu (⌘\\)' : 'Collapse menu (⌘\\)'"
          @click="toggleSidebar"
        >
          <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" :stroke-width="1.75" />
          <ChevronLeft v-else class="h-4 w-4" :stroke-width="1.75" />
        </button>
        <p class="truncate text-[0.875rem] font-semibold tracking-tight text-ink">
          {{ section?.label || 'Dashboard' }}
        </p>
        <UiBadge v-if="membership" tone="neutral">{{ membership.plan }}</UiBadge>

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="hidden items-center gap-2 rounded-xl border border-black/8 bg-white/70 px-3 py-1.5 text-[0.75rem] text-soft transition-colors hover:text-ink sm:inline-flex"
            @click="commandOpen = true"
          >
            <Search class="h-3.5 w-3.5" :stroke-width="1.75" />
            Search
            <kbd class="rounded border border-black/10 px-1 text-[0.625rem]">⌘K</kbd>
          </button>
          <UiButton size="sm" @click="feedbackOpen = true">Feedback</UiButton>
          <UiButton size="sm" :to="previewUrl" target="_blank" external>
            View site
            <ExternalLink class="ml-1 h-3.5 w-3.5" :stroke-width="1.75" />
          </UiButton>
          <UiButton size="sm" variant="primary" @click="openAssistant">Ask AI</UiButton>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/40 bg-white/50 p-5 shadow-sm backdrop-blur-xl md:p-8">
        <div class="mx-auto w-full max-w-6xl">
          <slot />
        </div>
      </main>
    </div>

    <Teleport to="body">
      <div v-if="assistantOpen" class="fixed inset-0 z-[var(--z-modal,60)] flex justify-end">
        <button
          type="button"
          class="absolute inset-0 bg-[#1a1a1a]/25 backdrop-blur-[2px]"
          aria-label="Close assistant"
          @click="assistantOpen = false"
        />
        <aside class="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/50 bg-white/95 shadow-2xl backdrop-blur-xl">
          <AssistantPanel closable @close="assistantOpen = false" />
        </aside>
      </div>
    </Teleport>

    <AdminCommandSearch v-model:open="commandOpen" />
    <ConnectorsModal v-model:open="connectorsOpen" />

    <Teleport to="body">
      <div
        v-if="feedbackOpen"
        class="fixed inset-0 z-[var(--z-modal,60)] grid place-items-center bg-[#1a1a1a]/30 p-4 backdrop-blur-[2px]"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 shadow-2xl"
          role="dialog"
          aria-labelledby="feedback-title"
        >
          <h2 id="feedback-title" class="text-[1rem] font-semibold text-ink">Send feedback</h2>
          <p class="mt-1 text-[0.8125rem] text-soft">
            Tell us what broke or what you want next. Staff reads this in the admin inbox.
          </p>
          <textarea
            v-model="feedbackMessage"
            rows="5"
            class="mt-4 w-full rounded-xl border border-line bg-sunken/40 px-3 py-2 text-[0.875rem] text-ink"
            placeholder="What should we know?"
          />
          <p v-if="feedbackError" class="mt-2 text-[0.8125rem] text-danger" role="alert">{{ feedbackError }}</p>
          <p v-else-if="feedbackSent" class="mt-2 text-[0.8125rem] text-positive" role="status">Thanks — sent.</p>
          <div class="mt-4 flex justify-end gap-2">
            <UiButton size="sm" @click="feedbackOpen = false">Cancel</UiButton>
            <UiButton size="sm" variant="primary" :loading="feedbackBusy" @click="submitFeedback">
              Send
            </UiButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
