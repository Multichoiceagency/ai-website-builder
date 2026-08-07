<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { createSection, getBlock, PERFORMANCE_CLASS_ORDER } from '@platform/blocks'
import {
  ASSET_COLLECTIONS,
  type AssetCollectionId,
  type AssetLibrarySource,
  type AssetListItem,
  type PerformanceClass,
  type Section,
  type Theme,
} from '@platform/schemas'

/**
 * The editor's Assets panel.
 *
 * An asset is a saved arrangement of sections — data, not code. Inserting one
 * appends registry blocks that were already installed; nothing is fetched and
 * nothing new executes (ADR-0003).
 *
 * Chrome mirrors the Insert panel's category-rail + large variation cards, scaled
 * to the narrower left dock: sticky collection rail, then stacked preview cards
 * that insert on click.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The site's performance ceiling. Sections heavier than this are removed
     * from what `insert` emits, and the card says how many would go — a user
     * should learn the cost before the insert, not after.
     */
    maxPerformanceClass?: PerformanceClass | null
    /**
     * The sections the editor currently has selected. Saving is offered only
     * when there is something to save; the parent decides whether that is one
     * section or a contiguous run of them.
     */
    selection?: Section[]
    /** Mirrors `page:write`. The API re-checks; this only hides affordances. */
    canWrite?: boolean
    /** Site theme for live miniatures. */
    theme?: Theme | null
  }>(),
  { maxPerformanceClass: null, selection: () => [], canWrite: false, theme: null },
)

const emit = defineEmits<{
  /**
   * Insert a whole asset. Section ids are already regenerated and the
   * performance ceiling is already applied, so the parent can append the array
   * as-is — as ONE undoable step.
   */
  insert: [sections: Section[]]
  /** An asset was created or deleted; the editor may want to say so. */
  changed: [message: string]
}>()

const api = useApi()

const assets = ref<AssetListItem[]>([])
const libraries = ref<AssetLibrarySource[]>([])
const loading = ref(false)
const loadError = ref('')

const search = ref('')
/** Empty = all collections. */
const collection = ref<'' | AssetCollectionId>('')
/** Filter by UI-library source from the full licence register. */
const library = ref('')

const saving = ref(false)
const saveOpen = ref(false)
const saveName = ref('')
const saveDescription = ref('')
const saveCollection = ref<string>('utility')
const saveError = ref('')
/** Set when the workspace already holds this arrangement. Saving anyway is a click. */
const duplicateOf = ref<{ id: string; name: string } | null>(null)

const activeCardId = ref<string | null>(null)
const copiedCommand = ref(false)

function activate(id: string) {
  activeCardId.value = id
}

function deactivate(id: string) {
  if (activeCardId.value === id) activeCardId.value = null
}

/** Every register entry — cleared and refused — so empty libraries still appear. */
const LIBRARY_OPTIONS = computed(() => {
  const cleared = libraries.value
    .filter((entry) => entry.importable && entry.library !== 'platform')
    .sort((a, b) => a.library.localeCompare(b.library))
  const refused = libraries.value
    .filter((entry) => !entry.importable)
    .sort((a, b) => a.library.localeCompare(b.library))

  return [
    { label: 'All libraries', value: '' },
    { label: 'Platform only', value: 'platform' },
    ...cleared.map((entry) => ({
      label: `${entry.library} (${entry.presetCount})`,
      value: entry.library,
    })),
    ...refused.map((entry) => ({
      label: `${entry.library} — refused`,
      value: entry.library,
    })),
  ]
})

const selectedLibrary = computed(() =>
  library.value ? libraries.value.find((entry) => entry.library === library.value) ?? null : null,
)

const SAVE_COLLECTION_OPTIONS = ASSET_COLLECTIONS.map((value) => ({
  label: value[0]!.toUpperCase() + value.slice(1),
  value,
}))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    // The ceiling is deliberately *not* sent: the panel wants to show what an
    // asset would cost, which means it has to see the parts it cannot afford.
    const [assetRows, sourceRows] = await Promise.all([
      api.get<AssetListItem[]>('/api/v1/assets'),
      api.get<AssetLibrarySource[]>('/api/v1/assets/sources'),
    ])
    assets.value = assetRows
    libraries.value = sourceRows
  } catch (caught) {
    loadError.value = caught instanceof ApiError ? caught.message : 'Could not load assets.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function copyInstallCommand() {
  const command = selectedLibrary.value?.install?.command?.trim()
  if (!command) return
  try {
    await navigator.clipboard.writeText(command)
    copiedCommand.value = true
    window.setTimeout(() => {
      copiedCommand.value = false
    }, 1600)
  } catch {
    // Clipboard can fail in insecure contexts; the command stays visible to copy manually.
  }
}

// region Ceiling

const ceiling = computed(() =>
  props.maxPerformanceClass ? PERFORMANCE_CLASS_ORDER[props.maxPerformanceClass] : undefined,
)

/** Unknown ids count as heavy: what we cannot score, we must not assume is cheap. */
function classOf(section: Section): PerformanceClass {
  return getBlock(section.block)?.performanceClass ?? 'D'
}

function affordable(sections: Section[]): Section[] {
  if (ceiling.value === undefined) return sections
  return sections.filter((section) => PERFORMANCE_CLASS_ORDER[classOf(section)] <= ceiling.value!)
}

/** How many of an asset's sections this site's budget cannot take. */
function droppedCount(asset: AssetListItem): number {
  return asset.sections.length - affordable(asset.sections).length
}

/** True when nothing survives the ceiling — the asset cannot be inserted at all. */
function fullyBlocked(asset: AssetListItem): boolean {
  return affordable(asset.sections).length === 0
}

// endregion

function titleCase(value: string) {
  return value[0]!.toUpperCase() + value.slice(1)
}

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return assets.value.filter((asset) => {
    const sourceLibrary = asset.source?.library?.trim() || 'platform'
    if (library.value === 'platform') {
      if (sourceLibrary !== 'platform' && sourceLibrary !== '') return false
    } else if (library.value && sourceLibrary !== library.value) {
      return false
    }
    if (!term) return true
    return `${asset.name} ${asset.description} ${asset.tags.join(' ')} ${sourceLibrary}`.toLowerCase().includes(term)
  })
})

const categoryRail = computed(() => {
  const counts = new Map<string, number>()
  for (const asset of filtered.value) {
    counts.set(asset.collection, (counts.get(asset.collection) ?? 0) + 1)
  }

  return [
    { value: '' as const, label: 'All', count: filtered.value.length },
    ...ASSET_COLLECTIONS.map((id) => ({
      value: id,
      label: titleCase(id),
      count: counts.get(id) ?? 0,
      // Empty groups stay hidden — a library filter that shows “Hero 0” only
      // teaches people the catalogue is broken when it is merely elsewhere.
    })).filter((entry) => entry.count > 0),
  ]
})

const results = computed(() => {
  if (!collection.value) return filtered.value
  return filtered.value.filter((asset) => asset.collection === collection.value)
})

// If the active collection empties (library / search change), fall back to All.
watch([filtered, library, search], () => {
  if (!collection.value) return
  const stillThere = filtered.value.some((asset) => asset.collection === collection.value)
  if (!stillThere) collection.value = ''
})

const activeLabel = computed(() =>
  collection.value ? titleCase(collection.value) : 'All assets',
)

/**
 * Stable preview id lists per asset so TemplatePreview does not remount on
 * every parent render.
 */
const previewIds = computed(() => {
  const map = new Map<string, string[]>()
  for (const asset of assets.value) {
    map.set(
      asset.id,
      affordable(asset.sections).map((section) => section.block),
    )
  }
  return map
})

const collectionOrdinal = computed(() => {
  const map = new Map<string, number>()
  const counters = new Map<string, number>()
  for (const asset of assets.value) {
    const next = (counters.get(asset.collection) ?? 0) + 1
    counters.set(asset.collection, next)
    map.set(asset.id, next)
  }
  return map
})

function variationTitle(asset: AssetListItem) {
  const ordinal = String(collectionOrdinal.value.get(asset.id) ?? 1).padStart(2, '0')
  return `${titleCase(asset.collection)} ${ordinal} — ${asset.name}`
}

/**
 * Insert an asset.
 *
 * Every section gets a fresh id. Without that, inserting the same asset twice
 * yields two sections claiming one identity and the editor's selection,
 * reordering and undo all start acting on the wrong one.
 */
function insert(asset: AssetListItem) {
  if (!props.canWrite || fullyBlocked(asset)) return
  const sections = affordable(asset.sections).map((section) => {
    const fresh = createSection(section.block, section.props)
    return {
      ...fresh,
      ...(section.motion ? { motion: section.motion } : {}),
      ...(section.visibility ? { visibility: section.visibility } : {}),
      ...(section.seo ? { seo: section.seo } : {}),
    }
  })

  if (!sections.length) return
  emit('insert', sections)
}

// region Saving

const canSave = computed(() => props.canWrite && props.selection.length > 0)

async function openSave() {
  if (!canSave.value) return

  saveError.value = ''
  duplicateOf.value = null
  saveName.value = ''
  saveDescription.value = ''
  saveCollection.value = 'utility'
  saveOpen.value = true

  // Pre-flight, so "you already have this" arrives before the naming, not after
  // the save. The API enforces the same rule independently.
  try {
    const check = await api.post<{ duplicate: boolean; existing: { id: string; name: string } | null }>(
      '/api/v1/assets/duplicate-check',
      { sections: props.selection },
    )
    if (check.duplicate) duplicateOf.value = check.existing
  } catch {
    // A failed pre-flight must not block saving — the write path re-checks.
  }
}

async function save(allowDuplicate = false) {
  saving.value = true
  saveError.value = ''
  try {
    await api.post(`/api/v1/assets${allowDuplicate ? '?allowDuplicate=true' : ''}`, {
      name: saveName.value,
      description: saveDescription.value,
      collection: saveCollection.value as AssetCollectionId,
      sections: props.selection,
    })
    saveOpen.value = false
    emit('changed', 'Saved as an asset.')
    await load()
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'conflict') {
      const details = caught.details as { existing?: { id: string; name: string } } | undefined
      if (details?.existing) {
        duplicateOf.value = details.existing
        saveError.value = ''
        return
      }
    }
    saveError.value = caught instanceof ApiError ? caught.message : 'Could not save the asset.'
  } finally {
    saving.value = false
  }
}

async function remove(asset: AssetListItem, event?: Event) {
  event?.stopPropagation()
  if (asset.tier !== 'workspace') return
  try {
    await api.del(`/api/v1/assets/${asset.id}`)
    emit('changed', 'Asset deleted.')
    await load()
  } catch (caught) {
    loadError.value = caught instanceof ApiError ? caught.message : 'Could not delete the asset.'
  }
}

// endregion

// Re-check the duplicate warning if the selection changes under an open dialog.
watch(
  () => props.selection,
  () => {
    if (saveOpen.value) duplicateOf.value = null
  },
)

function toneFor(performanceClass: PerformanceClass) {
  if (performanceClass === 'A') return 'positive'
  if (performanceClass === 'B') return 'neutral'
  return 'warning'
}

defineExpose({ reload: load })
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
      <span class="type-button-10 uppercase tracking-[0.08em] text-faint">Assets</span>
      <UiButton v-if="canWrite" size="sm" variant="ghost" :disabled="!canSave" @click="openSave">
        + Save selection
      </UiButton>
    </div>

    <div class="flex min-h-0 flex-1">
      <!-- Collection rail -->
      <nav
        class="flex w-[6.75rem] shrink-0 flex-col border-r border-line bg-paper"
        aria-label="Asset collections"
      >
        <div class="sticky top-0 z-10 space-y-1.5 border-b border-line bg-paper p-1.5">
          <UiInput v-model="search" placeholder="Search…" aria-label="Search assets" />
          <UiSelect v-model="library" :options="LIBRARY_OPTIONS" aria-label="Filter by UI library" />
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto py-1">
          <li v-for="entry in categoryRail" :key="entry.value || 'all'">
            <button
              type="button"
              class="relative flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left transition-colors"
              :class="
                collection === entry.value
                  ? 'bg-sunken text-ink'
                  : 'text-soft hover:bg-sunken/60 hover:text-ink'
              "
              :aria-current="collection === entry.value ? 'true' : undefined"
              @click="collection = entry.value"
            >
              <span
                v-if="collection === entry.value"
                class="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand"
                aria-hidden="true"
              />
              <span class="type-button-10 truncate">{{ entry.label }}</span>
              <span class="type-button-10 tabular-nums text-faint">{{ entry.count }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- Variations -->
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="flex items-center gap-1.5 border-b border-line px-2.5 py-2">
          <h2 class="type-caption uppercase tracking-[0.1em] text-soft">{{ activeLabel }}</h2>
          <span class="rounded bg-sunken px-1 py-0.5 type-button-10 tabular-nums text-faint">
            {{ results.length }}
          </span>
        </div>

        <div
          v-if="selectedLibrary && selectedLibrary.library !== 'platform'"
          class="space-y-1.5 border-b border-line bg-paper px-2.5 py-2"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <UiBadge :tone="selectedLibrary.importable ? 'positive' : 'warning'">
              {{ selectedLibrary.importable ? selectedLibrary.licence : 'refused' }}
            </UiBadge>
            <span class="type-button-10 text-faint">
              {{ selectedLibrary.presetCount }} preset{{ selectedLibrary.presetCount === 1 ? '' : 's' }}
            </span>
            <a
              v-if="selectedLibrary.url"
              :href="selectedLibrary.url"
              target="_blank"
              rel="noopener noreferrer"
              class="type-button-10 text-brand no-underline hover:underline"
            >Docs</a>
          </div>

          <template v-if="selectedLibrary.importable && selectedLibrary.install?.command">
            <p class="type-caption-12 leading-relaxed text-soft">
              Download free source the same way the library ships it (npx / clone). Reference only —
              layouts become our blocks; third-party code never ships to customer pages.
            </p>
            <div class="flex items-stretch gap-1.5">
              <code class="min-w-0 flex-1 truncate rounded-md border border-line bg-sunken px-2 py-1.5 type-button-10 text-ink">
                {{ selectedLibrary.install.command }}
              </code>
              <UiButton size="sm" variant="ghost" @click="copyInstallCommand">
                {{ copiedCommand ? 'Copied' : 'Copy' }}
              </UiButton>
            </div>
          </template>

          <p
            v-else-if="!selectedLibrary.importable"
            class="type-caption-12 leading-relaxed text-warning"
          >
            {{ selectedLibrary.notes || 'This library cannot be imported.' }}
          </p>
        </div>

        <p v-if="loadError" class="px-2 py-2 text-[0.75rem] text-danger" role="alert">{{ loadError }}</p>

        <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <p v-if="loading" class="px-1 py-6 text-center text-[0.75rem] text-faint">Loading…</p>

          <div
            v-else-if="!results.length"
            class="px-1 py-8 text-center text-[0.75rem] leading-relaxed text-faint"
          >
            <p v-if="selectedLibrary && !selectedLibrary.importable">
              This library is refused — no presets and no download path.
            </p>
            <p v-else-if="selectedLibrary?.install?.command">
              No presets from {{ selectedLibrary.library }} yet. Copy the install command above to pull
              the free source into <code class="text-ink">reference/</code>, then map layouts into
              library demos.
            </p>
            <p v-else>
              Nothing here yet. Select a section on the canvas and save it as an asset to reuse it on any page.
            </p>
          </div>

          <ul v-else class="flex flex-col gap-3">
            <li
              v-for="asset in results"
              :key="asset.id"
              class="group relative overflow-hidden rounded-lg border border-line bg-raised transition-[border-color,box-shadow] hover:border-brand hover:shadow-raised"
              :class="fullyBlocked(asset) || !canWrite ? 'opacity-60' : 'cursor-pointer'"
              role="button"
              tabindex="0"
              :aria-label="`Insert ${variationTitle(asset)}`"
              :aria-disabled="!canWrite || fullyBlocked(asset) ? 'true' : undefined"
              @mouseenter="activate(asset.id)"
              @mouseleave="deactivate(asset.id)"
              @click="insert(asset)"
              @keydown.enter.prevent="insert(asset)"
              @keydown.space.prevent="insert(asset)"
            >
              <div class="flex items-start justify-between gap-2 border-b border-line px-2.5 py-2">
                <p class="type-button-12 min-w-0 flex-1 leading-snug text-ink">
                  {{ variationTitle(asset) }}
                </p>
                <UiBadge :tone="toneFor(asset.performanceClass)">{{ asset.performanceClass }}</UiBadge>
              </div>

              <TemplatePreview
                v-if="(previewIds.get(asset.id) ?? []).length"
                :block-ids="previewIds.get(asset.id) ?? []"
                :theme="theme"
                :play="activeCardId === asset.id"
                ratio="16 / 10"
              />

              <div class="border-t border-line px-2.5 py-2">
                <p v-if="asset.description" class="line-clamp-2 text-[0.75rem] leading-relaxed text-soft">
                  {{ asset.description }}
                </p>

                <p class="mt-1 text-[0.6875rem] text-faint">
                  {{ asset.sections.length }} section{{ asset.sections.length === 1 ? '' : 's' }}
                  <span v-if="asset.tier === 'platform'"> · preset</span>
                  <span v-if="asset.source?.library && asset.source.library !== 'platform'">
                    · {{ asset.source.library }}
                  </span>
                </p>

                <p
                  v-if="droppedCount(asset)"
                  class="mt-1.5 rounded bg-warning-soft px-1.5 py-1 text-[0.6875rem] leading-snug text-warning"
                >
                  <template v-if="fullyBlocked(asset)">
                    Too heavy for this site's performance budget.
                  </template>
                  <template v-else>
                    {{ droppedCount(asset) }} of {{ asset.sections.length }} sections exceed this site's
                    performance budget and will be left out.
                  </template>
                </p>

                <p v-if="asset.attribution" class="mt-1.5 text-[0.6875rem] leading-snug text-faint">
                  {{ asset.attribution }}
                </p>

                <div class="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    class="type-button-10 rounded-md border border-line bg-raised px-2 py-1 text-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                    :disabled="!canWrite || fullyBlocked(asset)"
                    :aria-label="`Insert another ${asset.name}`"
                    @click.stop="insert(asset)"
                  >Duplicate</button>
                  <button
                    v-if="asset.tier === 'workspace' && canWrite"
                    type="button"
                    class="ml-auto grid h-6 w-6 place-items-center rounded text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    :aria-label="`Delete ${asset.name}`"
                    @click="remove(asset, $event)"
                  >×</button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <UiDialog
      v-model:open="saveOpen"
      title="Save as asset"
      description="Reuse this arrangement on any page in this workspace."
    >
      <div class="flex flex-col gap-3">
        <p
          v-if="duplicateOf"
          class="rounded-md bg-warning-soft px-3 py-2 text-[0.8125rem] leading-relaxed text-warning"
          role="status"
        >
          You already saved this exact arrangement as “{{ duplicateOf.name }}”. Saving again makes a second copy.
        </p>

        <UiField v-slot="{ id }" label="Name">
          <UiInput :id="id" v-model="saveName" placeholder="Pricing with FAQ" />
        </UiField>

        <UiField v-slot="{ id }" label="Description" help="Optional. What is this for?">
          <UiTextarea :id="id" v-model="saveDescription" :rows="2" />
        </UiField>

        <UiField v-slot="{ id }" label="Group">
          <UiSelect :id="id" v-model="saveCollection" :options="SAVE_COLLECTION_OPTIONS" />
        </UiField>

        <p class="text-[0.75rem] text-faint">
          {{ selection.length }} section{{ selection.length === 1 ? '' : 's' }} will be saved.
        </p>

        <p v-if="saveError" class="text-[0.8125rem] text-danger" role="alert">{{ saveError }}</p>

        <div class="flex justify-end gap-2">
          <UiButton size="sm" variant="ghost" @click="saveOpen = false">Cancel</UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :loading="saving"
            :disabled="!saveName.trim()"
            @click="save(Boolean(duplicateOf))"
          >
            {{ duplicateOf ? 'Save anyway' : 'Save' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
