<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PageSummary } from '@platform/schemas'
import { ChevronDown, ExternalLink, FileText } from '@lucide/vue'

/**
 * Editor control for a block's `url` field.
 *
 * CTAs and hrefs should usually point at another page on the same site. Picking
 * from the live page list writes a *relative* path (`/contact`) into the
 * document so it stays portable across environments (ADR-0003). Absolute
 * `https://…` links remain available for the rare external case.
 *
 * Pages prefer the list the editor already loaded (siblings). If none were
 * passed, the control fetches `GET /api/v1/sites/:id/pages` from `siteId` or
 * the active site — so experiments and other hosts still get a usable picker.
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    id?: string
    describedBy?: string
    placeholder?: string
    disabled?: boolean
    /** Site pages already in memory (editor siblings). */
    pages?: PageSummary[]
    /** Used to fetch pages when `pages` is empty. */
    siteId?: string | null
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    placeholder: 'https://…',
    disabled: false,
    pages: () => [],
    siteId: null,
  },
)

const api = useApi()
const activeSiteId = useActiveSiteId()

const open = ref(false)
const query = ref('')
const externalMode = ref(false)
const fetched = ref<PageSummary[]>([])
const loading = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const resolvedSiteId = computed(() => props.siteId || activeSiteId.value)

const sitePages = computed(() => (props.pages.length ? props.pages : fetched.value))

const matchedPage = computed(() => {
  const value = model.value.trim()
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return sitePages.value.find((page) => page.path === value) ?? null
})

const isRelativePath = computed(() => {
  const value = model.value.trim()
  return Boolean(value) && value.startsWith('/') && !value.startsWith('//')
})

watch(
  () => model.value,
  (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      // Empty stays on the page picker so the first choice is an internal link.
      if (!open.value) externalMode.value = false
      return
    }
    externalMode.value = !(trimmed.startsWith('/') && !trimmed.startsWith('//'))
  },
  { immediate: true },
)

const filteredPages = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return sitePages.value
  return sitePages.value.filter(
    (page) => page.title.toLowerCase().includes(needle) || page.path.toLowerCase().includes(needle),
  )
})

const summaryLabel = computed(() => {
  if (externalMode.value || (!matchedPage.value && model.value.trim() && !isRelativePath.value)) {
    return model.value.trim() || 'External URL'
  }
  if (matchedPage.value) return matchedPage.value.title
  if (isRelativePath.value) return model.value
  return 'Choose a page'
})

const summaryMeta = computed(() => {
  if (externalMode.value || (!matchedPage.value && model.value.trim() && !isRelativePath.value)) {
    return 'External URL'
  }
  if (matchedPage.value) return matchedPage.value.path
  if (isRelativePath.value) return 'Site page'
  return 'Internal link'
})

async function loadPages() {
  if (props.pages.length) {
    fetched.value = []
    return
  }
  const siteId = resolvedSiteId.value
  if (!siteId) {
    fetched.value = []
    return
  }
  loading.value = true
  try {
    fetched.value = await api.get<PageSummary[]>(`/api/v1/sites/${siteId}/pages`)
  } catch {
    fetched.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.pages, resolvedSiteId.value] as const,
  () => {
    void loadPages()
  },
)

function selectPage(page: PageSummary) {
  // Relative path only — portable across hosts (ADR-0003).
  model.value = page.path
  externalMode.value = false
  open.value = false
  query.value = ''
}

function useExternal() {
  externalMode.value = true
  open.value = false
  query.value = ''
  if (isRelativePath.value || matchedPage.value) model.value = ''
}

function toggleOpen() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) query.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
  }
}

function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)
  void loadPages()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <div ref="root" class="relative flex flex-col gap-2">
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-raised px-3 text-left transition-colors duration-150 hover:border-line-strong disabled:cursor-not-allowed disabled:bg-sunken disabled:text-faint"
      :class="open ? 'border-line-strong' : ''"
      :disabled="disabled"
      :aria-describedby="describedBy"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <component
        :is="externalMode || (!matchedPage && model.trim() && !isRelativePath) ? ExternalLink : FileText"
        class="h-4 w-4 shrink-0 text-faint"
        :stroke-width="ICON_STROKE"
        aria-hidden="true"
      />
      <span class="min-w-0 flex-1">
        <span class="type-button-12 block truncate text-ink">{{ summaryLabel }}</span>
        <span class="type-caption-12 block truncate text-faint">{{ summaryMeta }}</span>
      </span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-faint transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
        :stroke-width="ICON_STROKE"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="open"
      role="listbox"
      aria-label="Site pages"
      class="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[var(--z-nav-flyout)] overflow-hidden rounded-lg border border-line bg-raised shadow-raised"
    >
      <div class="border-b border-line p-2">
        <UiInput
          v-model="query"
          placeholder="Search pages…"
          autocomplete="off"
          aria-label="Search pages"
        />
      </div>

      <ul class="max-h-56 overflow-y-auto p-1">
        <li v-if="loading" class="px-2.5 py-3 type-caption-12 text-faint">Loading pages…</li>
        <li v-else-if="!filteredPages.length" class="px-2.5 py-3 type-caption-12 text-faint">
          {{ sitePages.length ? 'No pages match.' : 'No pages on this site yet.' }}
        </li>
        <li v-for="page in filteredPages" :key="page.id">
          <button
            type="button"
            role="option"
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-sunken"
            :class="matchedPage?.id === page.id ? 'bg-brand-soft text-brand' : 'text-ink'"
            :aria-selected="matchedPage?.id === page.id"
            @click="selectPage(page)"
          >
            <FileText class="h-3.5 w-3.5 shrink-0 text-faint" :stroke-width="ICON_STROKE" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="type-button-12 block truncate">{{ page.title }}</span>
              <span class="type-caption-12 block truncate text-faint">{{ page.path }}</span>
            </span>
          </button>
        </li>
      </ul>

      <div class="border-t border-line p-1">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-ink transition-colors hover:bg-sunken"
          @click="useExternal"
        >
          <ExternalLink class="h-3.5 w-3.5 shrink-0 text-faint" :stroke-width="ICON_STROKE" aria-hidden="true" />
          <span class="type-button-12">Use external URL…</span>
        </button>
      </div>
    </div>

    <UiInput
      v-if="externalMode"
      :model-value="model"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      aria-label="External URL"
      @update:model-value="model = $event"
    />

    <p v-if="matchedPage" class="type-caption-12 text-faint">
      Links as <span class="font-mono text-soft">{{ matchedPage.path }}</span> so the page stays portable.
    </p>
  </div>
</template>
