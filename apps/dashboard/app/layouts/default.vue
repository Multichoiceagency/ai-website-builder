<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, resolveComponent, watch } from 'vue'
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

/** One row style for every nav entry, so a tweak lands in one place. */
const rowClass = (active: boolean) => [
  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] no-underline transition-colors',
  active ? 'bg-white/[0.07] text-ink' : 'text-soft hover:bg-white/5 hover:text-ink',
]

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

/** Pinned entries above the module list; `action` opens an overlay, `to` navigates. */
const quickActions = computed(() => [
  { label: 'Agent', icon: Sparkles, to: '/', active: route.path === '/' },
  { label: 'Search', icon: Search, action: () => (commandOpen.value = true), kbd: '⌘K', active: false },
  {
    label: 'Templates',
    icon: LayoutTemplate,
    to: '/website/templates',
    active: isActiveItem('/website/templates'),
  },
  { label: 'Connectors', icon: Plug, action: () => (connectorsOpen.value = true), active: false },
])

const moduleSections = computed(() =>
  NAV_SECTIONS.filter(
    (entry) =>
      !['home', 'ai', 'apps', 'settings'].includes(entry.id) &&
      (!entry.permission || can(entry.permission)),
  ),
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
  <div class="relative flex h-screen overflow-hidden bg-paper text-ink">
    <div
      v-if="isImpersonating"
      class="absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-warning-soft px-4 py-2 text-[0.75rem] text-ink"
      role="status"
    >
      <span>
        Viewing as <strong>{{ session?.user.email }}</strong> — staff impersonation
      </span>
      <button
        type="button"
        class="rounded-md border border-line-strong px-2.5 py-1 font-medium hover:bg-white/5"
        :disabled="exitImpersonating"
        @click="exitImpersonation"
      >
        {{ exitImpersonating ? 'Exiting…' : 'Exit impersonation' }}
      </button>
    </div>

    <aside
      class="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-line bg-sunken transition-[width] duration-200"
      :class="[
        sidebarCollapsed ? 'w-[3.25rem]' : 'w-[15rem]',
        isImpersonating ? 'mt-10' : '',
      ]"
      aria-label="Workspace"
    >
      <div
        class="flex h-11 items-center gap-2 border-b border-line"
        :class="sidebarCollapsed ? 'justify-center px-0' : 'px-3'"
      >
        <NuxtLink
          to="/"
          class="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md no-underline"
          :class="logoUrl ? 'bg-transparent' : 'bg-ink text-paper'"
          :aria-label="workspaceLabel"
        >
          <img v-if="logoUrl" :src="logoUrl" :alt="workspaceLabel" class="h-7 w-7 object-contain" />
          <Sparkles v-else class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
        </NuxtLink>
        <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
          <p class="truncate text-[0.8125rem] font-medium text-ink">{{ workspaceLabel }}</p>
          <p class="truncate text-[0.6875rem] text-faint">
            {{ membership?.plan || 'Workspace' }}
            <span v-if="!hidePlatformBranding"> · MultichoiceCMS</span>
          </p>
        </div>
      </div>

      <nav class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3" aria-label="Primary">
        <div class="space-y-px">
          <component
            v-for="action in quickActions"
            :is="action.to ? resolveComponent('NuxtLink') : 'button'"
            :key="action.label"
            :to="action.to"
            :type="action.to ? undefined : 'button'"
            :class="[rowClass(action.active), sidebarCollapsed ? 'justify-center px-0' : '']"
            :title="action.kbd ? `${action.label} (${action.kbd})` : action.label"
            @click="action.action?.()"
          >
            <component :is="action.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed" class="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span class="truncate">{{ action.label }}</span>
              <kbd
                v-if="action.kbd"
                class="shrink-0 rounded border border-line px-1 py-px font-sans text-[0.625rem] text-faint"
              >
                {{ action.kbd }}
              </kbd>
            </span>
          </component>
        </div>

        <label v-if="!sidebarCollapsed && (sites?.length ?? 0) > 0" class="block">
          <span class="mb-1 block px-2 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-faint">Website</span>
          <select
            :value="activeSiteId ?? ''"
            class="h-8 w-full rounded-md border border-line bg-raised px-2 text-[0.8125rem] text-ink outline-none transition-colors hover:border-line-strong focus-visible:border-brand"
            aria-label="Active website"
            @change="onSiteChange"
          >
            <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </label>

        <div class="space-y-px">
          <NuxtLink
            v-for="item in moduleSections"
            :key="item.id"
            :to="item.to"
            :class="[rowClass(isActiveSection(item.id)), sidebarCollapsed ? 'justify-center px-0' : '']"
            :title="item.label"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </div>

        <!-- Collapsed shows modules only: a rail of near-identical page icons is unreadable. -->
        <div v-if="!sidebarCollapsed && subNav.length" class="space-y-px">
          <p class="mb-1 px-2 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-faint">
            {{ section?.label }}
          </p>
          <NuxtLink
            v-for="item in subNav"
            :key="`${item.label}-${item.to}`"
            :to="item.to"
            :class="rowClass(isActiveItem(item.to))"
            :title="item.label"
          >
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span v-if="item.phase" class="shrink-0 text-[0.625rem] text-faint">soon</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="mt-auto space-y-px border-t border-line p-2">
        <NuxtLink
          to="/settings"
          class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.8125rem] text-soft no-underline transition-colors hover:bg-white/5 hover:text-ink"
          :class="sidebarCollapsed ? 'justify-center px-0' : ''"
          title="Settings"
        >
          <Settings class="h-4 w-4 shrink-0" :stroke-width="1.75" aria-hidden="true" />
          <span v-if="!sidebarCollapsed">Settings & plan</span>
        </NuxtLink>
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/5"
          :class="sidebarCollapsed ? 'justify-center px-0' : ''"
          :title="`${session?.user.name} — sign out`"
          @click="signOut"
        >
          <span class="grid h-6 w-6 place-items-center rounded-full bg-brand text-[0.6875rem] font-semibold text-brand-ink">
            {{ (session?.user.name ?? '?').charAt(0).toUpperCase() }}
          </span>
          <span v-if="!sidebarCollapsed" class="min-w-0">
            <span class="block truncate text-[0.8125rem] text-ink">{{ session?.user.name }}</span>
            <span class="block truncate text-[0.6875rem] text-faint">Sign out</span>
          </span>
        </button>
      </div>
    </aside>

    <div
      class="relative z-0 flex min-w-0 flex-1 flex-col"
      :class="isImpersonating ? 'pt-10' : ''"
    >
      <header class="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-paper px-3">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-white/5 hover:text-ink"
          :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="sidebarCollapsed ? 'Expand menu (⌘\\)' : 'Collapse menu (⌘\\)'"
          @click="toggleSidebar"
        >
          <PanelLeftOpen v-if="sidebarCollapsed" class="h-4 w-4" :stroke-width="1.75" />
          <PanelLeftClose v-else class="h-4 w-4" :stroke-width="1.75" />
        </button>
        <p class="truncate text-[0.8125rem] font-medium text-ink">
          {{ section?.label || 'Agent' }}
        </p>
        <UiBadge v-if="membership" tone="neutral">{{ membership.plan }}</UiBadge>

        <div class="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            class="hidden h-7 items-center gap-2 rounded-md border border-line bg-raised px-2.5 text-[0.75rem] text-soft transition-colors hover:border-line-strong hover:text-ink sm:inline-flex"
            @click="commandOpen = true"
          >
            <Search class="h-3.5 w-3.5" :stroke-width="1.75" />
            Search
            <kbd class="rounded border border-line px-1 font-sans text-[0.625rem] text-faint">⌘K</kbd>
          </button>
          <UiButton size="sm" @click="feedbackOpen = true">Feedback</UiButton>
          <UiButton size="sm" :to="previewUrl" target="_blank" external>
            View site
            <ExternalLink class="ml-1 h-3.5 w-3.5" :stroke-width="1.75" />
          </UiButton>
          <UiButton size="sm" variant="primary" @click="openAssistant">Ask AI</UiButton>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto bg-paper p-5 md:p-8">
        <div class="mx-auto w-full max-w-6xl">
          <slot />
        </div>
      </main>
    </div>

    <Teleport to="body">
      <div v-if="assistantOpen" class="fixed inset-0 z-[var(--z-modal,60)] flex justify-end">
        <button
          type="button"
          class="absolute inset-0 bg-black/60"
          aria-label="Close assistant"
          @click="assistantOpen = false"
        />
        <aside class="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-paper shadow-float">
          <AssistantPanel closable @close="assistantOpen = false" />
        </aside>
      </div>
    </Teleport>

    <AdminCommandSearch v-model:open="commandOpen" />
    <ConnectorsModal v-model:open="connectorsOpen" />

    <Teleport to="body">
      <div
        v-if="feedbackOpen"
        class="fixed inset-0 z-[var(--z-modal,60)] grid place-items-center bg-black/60 p-4"
      >
        <div
          class="w-full max-w-md rounded-xl border border-line bg-raised p-5 shadow-float"
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
            class="mt-4 w-full rounded-lg border border-line bg-sunken px-3 py-2 text-[0.875rem] text-ink"
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
