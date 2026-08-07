<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Site } from '@platform/schemas'
import { ChevronLeft, ChevronRight, Settings, Sparkles } from '@lucide/vue'

/**
 * The app shell: icon rail, section sidebar, content, assistant panel.
 *
 * Master plan §39 — every module’s subpages live in the left sidebar under the
 * active rail icon (Website → Theme, Blog, Media, …), not only as top tabs.
 *
 * Tenant white-label settings retint `--brand` / surfaces / fonts and swap the
 * rail mark for the client logo. The section sidebar collapses to reclaim space.
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

const assistantOpen = ref(true)

const section = computed(() => sectionForPath(route.path))
const subNav = computed(() =>
  (section.value?.items ?? []).filter((item) => !item.permission || can(item.permission)),
)

const isActiveSection = (id: string) => section.value?.id === id
const isActiveItem = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

const { data: sites } = await useAsyncData('shell:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})

if (!activeSiteId.value && sites.value?.length) activeSiteId.value = sites.value[0]!.id

const activeSite = computed(() => sites.value?.find((site) => site.id === activeSiteId.value) ?? null)

function onSiteChange(event: Event) {
  activeSiteId.value = (event.target as HTMLSelectElement).value
}

async function signOut() {
  await api.post('/api/v1/auth/logout')
  session.value = null
  tenantId.value = null
  await navigateTo('/login')
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    assistantOpen.value = !assistantOpen.value
  }
  if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
    event.preventDefault()
    toggleSidebar()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const previewUrl = computed(() =>
  activeSite.value?.primaryHostname
    ? `http://${activeSite.value.primaryHostname}:3001`
    : config.public.storefrontUrl,
)

const railSections = computed(() => NAV_SECTIONS.filter((entry) => entry.id !== 'settings' && entry.id !== 'ai'))

const workspaceLabel = computed(
  () => brandName.value || membership.value?.tenantName || 'Workspace',
)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-sunken">
    <!-- Icon rail ---------------------------------------------------------- -->
    <nav
      class="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-paper py-3"
      aria-label="Modules"
    >
      <NuxtLink
        to="/"
        class="mb-3 grid h-8 w-8 place-items-center overflow-hidden rounded-lg no-underline"
        :class="logoUrl ? 'bg-transparent' : 'bg-brand text-brand-ink'"
        :aria-label="workspaceLabel"
      >
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="workspaceLabel"
          class="h-8 w-8 object-contain"
        />
        <Sparkles v-else class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
      </NuxtLink>

      <NuxtLink
        v-for="item in railSections"
        :key="item.id"
        :to="item.to"
        class="group relative grid h-9 w-9 place-items-center rounded-lg no-underline transition-colors duration-150"
        :class="isActiveSection(item.id) ? 'bg-brand-soft text-brand' : 'text-faint hover:bg-sunken hover:text-ink'"
        :aria-label="item.label"
        :aria-current="isActiveSection(item.id) ? 'page' : undefined"
      >
        <component :is="item.icon" class="h-[18px] w-[18px]" :stroke-width="ICON_STROKE" aria-hidden="true" />
        <span
          class="pointer-events-none absolute left-full z-[var(--z-nav-flyout)] ml-2 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[0.75rem] font-medium text-paper group-hover:block"
        >
          {{ item.label }}
          <span v-if="item.phase" class="opacity-60"> · phase {{ item.phase }}</span>
        </span>
      </NuxtLink>

      <div class="mt-auto flex flex-col items-center gap-1">
        <NuxtLink
          to="/settings"
          class="group relative grid h-9 w-9 place-items-center rounded-lg no-underline transition-colors"
          :class="isActiveSection('settings') ? 'bg-brand-soft text-brand' : 'text-faint hover:bg-sunken hover:text-ink'"
          aria-label="Settings"
        >
          <Settings class="h-[18px] w-[18px]" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </NuxtLink>

        <button
          type="button"
          class="grid h-9 w-9 place-items-center rounded-lg bg-sunken text-[0.75rem] font-semibold text-soft transition-colors hover:text-ink"
          :title="`${session?.user.name} — sign out`"
          aria-label="Sign out"
          @click="signOut"
        >
          {{ (session?.user.name ?? '?').charAt(0).toUpperCase() }}
        </button>
      </div>
    </nav>

    <!-- Section sidebar (Website → Theme, Blog, Media, …) ---------------- -->
    <aside
      v-if="subNav.length"
      class="relative flex shrink-0 flex-col border-r border-line bg-paper transition-[width] duration-200 ease-[var(--ease-out-quart)]"
      :class="sidebarCollapsed ? 'w-12' : 'w-52'"
      aria-label="Section navigation"
    >
      <div class="flex items-center gap-2 border-b border-line px-2 py-2" :class="sidebarCollapsed ? 'justify-center' : 'px-3'">
        <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
          <p class="type-caption truncate text-faint uppercase tracking-[0.06em]">{{ section?.label }}</p>
          <select
            v-if="section?.id === 'website' && (sites?.length ?? 0) > 0"
            :value="activeSiteId ?? ''"
            class="mt-2 h-8 w-full rounded-md border border-line bg-raised px-2 text-[0.8125rem] text-ink"
            aria-label="Active website"
            @change="onSiteChange"
          >
            <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
          :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="sidebarCollapsed ? 'Expand (⌘\\)' : 'Collapse (⌘\\)'"
          @click="toggleSidebar"
        >
          <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" :stroke-width="ICON_STROKE" />
          <ChevronLeft v-else class="h-4 w-4" :stroke-width="ICON_STROKE" />
        </button>
      </div>

      <nav class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <NuxtLink
          v-for="item in subNav"
          :key="`${item.label}-${item.to}`"
          :to="item.to"
          class="flex items-center gap-2 rounded-md py-2 text-[0.8125rem] font-medium no-underline transition-colors"
          :class="[
            sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2.5',
            isActiveItem(item.to)
              ? 'bg-brand-soft text-brand'
              : 'text-soft hover:bg-sunken hover:text-ink',
          ]"
          :title="sidebarCollapsed ? item.label : undefined"
        >
          <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
          <span
            v-else
            class="grid h-7 w-7 place-items-center rounded text-[0.6875rem] font-semibold uppercase"
            aria-hidden="true"
          >
            {{ item.label.charAt(0) }}
          </span>
          <span v-if="!sidebarCollapsed && item.phase" class="shrink-0 text-[0.625rem] font-normal text-faint">soon</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main column -------------------------------------------------------- -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-paper px-5">
        <p class="truncate text-[0.8125rem] font-semibold text-ink">{{ workspaceLabel }}</p>
        <UiBadge v-if="membership" tone="brand">{{ membership.plan }}</UiBadge>
        <span v-if="!hidePlatformBranding" class="hidden text-[0.6875rem] text-faint sm:inline">Platform</span>

        <div class="ml-auto flex items-center gap-2">
          <UiButton size="sm" :to="previewUrl" target="_blank" external>View site</UiButton>
          <UiButton v-if="!assistantOpen" size="sm" variant="primary" @click="assistantOpen = true">
            Assistant
            <kbd class="ml-1 rounded border border-current/30 px-1 text-[0.625rem] opacity-70">⌘K</kbd>
          </UiButton>
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <main class="min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <div class="mx-auto w-full max-w-5xl">
            <slot />
          </div>
        </main>

        <aside v-if="assistantOpen" class="w-[21rem] shrink-0 border-l border-line">
          <AssistantPanel closable @close="assistantOpen = false" />
        </aside>
      </div>
    </div>
  </div>
</template>
