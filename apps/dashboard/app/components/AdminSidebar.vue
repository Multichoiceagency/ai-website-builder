<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue'
import type { Site } from '@platform/schemas'
import { NAV_SECTIONS, sectionForPath, type NavSection } from '~/composables/useNavigation'

/**
 * Light single sidebar with nested section nav (Polaris / Shopify feel).
 * Reuses NAV_SECTIONS — no icon rail. AI lives in the topbar drawer.
 */
const props = defineProps<{
  sites: Site[]
  activeSiteId: string | null
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  'update:activeSiteId': [id: string]
  'toggle-collapse': []
  'open-apps': []
}>()

const route = useRoute()
const can = useCan()

const section = computed(() => sectionForPath(route.path))

const navSections = computed(() =>
  NAV_SECTIONS.filter((entry) => entry.id !== 'ai').map((entry) => ({
    ...entry,
    items: entry.items.filter((item) => !item.permission || can(item.permission)),
  })),
)

const expanded = ref<Record<string, boolean>>({})

function ensureActiveExpanded() {
  const id = section.value?.id
  if (id) expanded.value = { ...expanded.value, [id]: true }
}

watch(() => route.path, ensureActiveExpanded, { immediate: true })

function isSectionActive(entry: NavSection) {
  return section.value?.id === entry.id
}

function isItemActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

function toggleSection(id: string) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

async function onParentClick(entry: NavSection) {
  if (props.sidebarCollapsed) {
    await navigateTo(entry.to)
    return
  }
  const wasOpen = Boolean(expanded.value[entry.id])
  if (!wasOpen) {
    expanded.value = { ...expanded.value, [entry.id]: true }
    await navigateTo(entry.to)
    return
  }
  toggleSection(entry.id)
}

function onSiteChange(event: Event) {
  emit('update:activeSiteId', (event.target as HTMLSelectElement).value)
}

function sectionClasses(entry: NavSection) {
  const activeLeaf = isSectionActive(entry) && entry.items.length === 0
  const activeParent = isSectionActive(entry) && entry.items.length > 0
  return [
    props.sidebarCollapsed ? 'justify-center px-1' : 'px-2.5',
    activeLeaf
      ? 'bg-paper text-ink shadow-card'
      : activeParent
        ? 'text-ink'
        : 'text-soft hover:bg-paper/80 hover:text-ink',
  ]
}
</script>

<template>
  <aside
    class="relative flex shrink-0 flex-col border-r border-line bg-sunken transition-[width] duration-200 ease-[var(--ease-out-quart)]"
    :class="sidebarCollapsed ? 'w-14' : 'w-[15.5rem]'"
    aria-label="Main navigation"
  >
    <div
      class="flex items-center gap-2 border-b border-line px-2 py-2"
      :class="sidebarCollapsed ? 'justify-center' : 'px-3'"
    >
      <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
        <p class="type-caption truncate text-faint uppercase tracking-[0.06em]">Navigate</p>
        <select
          v-if="sites.length > 0"
          :value="activeSiteId ?? ''"
          class="mt-1.5 h-8 w-full rounded-md border border-line bg-raised px-2 text-[0.8125rem] text-ink"
          aria-label="Active website"
          @change="onSiteChange"
        >
          <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }}</option>
        </select>
      </div>
      <button
        type="button"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-paper hover:text-ink"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="sidebarCollapsed ? 'Expand (⌘\\)' : 'Collapse (⌘\\)'"
        @click="emit('toggle-collapse')"
      >
        <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" :stroke-width="ICON_STROKE" />
        <ChevronLeft v-else class="h-4 w-4" :stroke-width="ICON_STROKE" />
      </button>
    </div>

    <nav class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
      <div v-for="entry in navSections" :key="entry.id" class="flex flex-col gap-0.5">
        <!-- Apps opens modal -->
        <button
          v-if="entry.id === 'apps'"
          type="button"
          class="flex w-full items-center gap-2 rounded-md py-2 text-left text-[0.8125rem] font-medium transition-colors"
          :class="sectionClasses(entry)"
          :title="sidebarCollapsed ? entry.label : undefined"
          @click="emit('open-apps')"
        >
          <component
            :is="entry.icon"
            class="h-[18px] w-[18px] shrink-0"
            :stroke-width="ICON_STROKE"
            aria-hidden="true"
          />
          <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
        </button>

        <!-- Leaf (Home) -->
        <NuxtLink
          v-else-if="entry.items.length === 0"
          :to="entry.to"
          class="flex w-full items-center gap-2 rounded-md py-2 text-[0.8125rem] font-medium no-underline transition-colors"
          :class="sectionClasses(entry)"
          :title="sidebarCollapsed ? entry.label : undefined"
        >
          <component
            :is="entry.icon"
            class="h-[18px] w-[18px] shrink-0"
            :stroke-width="ICON_STROKE"
            aria-hidden="true"
          />
          <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
          <span
            v-if="!sidebarCollapsed && entry.phase"
            class="shrink-0 text-[0.625rem] font-normal text-faint"
          >
            soon
          </span>
        </NuxtLink>

        <!-- Expandable parent -->
        <button
          v-else
          type="button"
          class="flex w-full items-center gap-2 rounded-md py-2 text-left text-[0.8125rem] font-medium transition-colors"
          :class="sectionClasses(entry)"
          :title="sidebarCollapsed ? entry.label : undefined"
          :aria-expanded="Boolean(expanded[entry.id])"
          @click="onParentClick(entry)"
        >
          <component
            :is="entry.icon"
            class="h-[18px] w-[18px] shrink-0"
            :stroke-width="ICON_STROKE"
            aria-hidden="true"
          />
          <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
          <span
            v-if="!sidebarCollapsed && entry.phase"
            class="shrink-0 text-[0.625rem] font-normal text-faint"
          >
            soon
          </span>
          <ChevronDown
            v-if="!sidebarCollapsed"
            class="h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-150"
            :class="expanded[entry.id] ? 'rotate-0' : '-rotate-90'"
            :stroke-width="ICON_STROKE"
            aria-hidden="true"
          />
        </button>

        <div
          v-if="!sidebarCollapsed && entry.items.length && entry.id !== 'apps' && expanded[entry.id]"
          class="mb-1 ml-3 flex flex-col gap-0.5 border-l border-line pl-2"
        >
          <NuxtLink
            v-for="item in entry.items"
            :key="`${entry.id}-${item.to}`"
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.8125rem] no-underline transition-colors"
            :class="
              isItemActive(item.to)
                ? 'bg-paper font-medium text-ink shadow-card'
                : 'text-soft hover:bg-paper/70 hover:text-ink'
            "
          >
            <component
              :is="item.icon"
              class="h-3.5 w-3.5 shrink-0"
              :stroke-width="ICON_STROKE"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <span v-if="item.phase" class="shrink-0 text-[0.625rem] text-faint">soon</span>
          </NuxtLink>
        </div>
      </div>
    </nav>
  </aside>
</template>
