<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BlockField, BlockMetadata, PageSummary, Section } from '@platform/schemas'
import { ICON_NAMES, isIconName } from '@platform/blocks'
import { ChevronRight } from '@lucide/vue'

/**
 * Structurally `OptionGridItem` from the UI layer. Declared locally rather than
 * imported: Nuxt layers auto-import components across packages, but not their
 * types, and reaching into another layer's source path would be a worse
 * dependency than restating three fields.
 */
interface VisualOption {
  value: string
  label: string
  icon: string
}

/**
 * The editor form for one placed block, generated from the block's own field
 * descriptors.
 *
 * This is why the editor stays simple as the registry grows: adding a block
 * adds a form, with no dashboard code to write. See ADR-0003.
 *
 * `pages` / `siteId` feed `PageLinkField` for every `url` field so CTAs store
 * relative paths (`/contact`) instead of absolute hosts.
 */
const props = withDefaults(
  defineProps<{
    section: Section
    block: BlockMetadata
    /** Site pages for url/CTA pickers — usually the editor's siblings list. */
    pages?: PageSummary[]
    siteId?: string | null
  }>(),
  { pages: () => [], siteId: null },
)
const emit = defineEmits<{ update: [props: Record<string, unknown>] }>()

const values = computed(() => props.section.props)

function setValue(key: string, value: unknown) {
  emit('update', { ...values.value, [key]: value })
}

function onScrollVideoSelect(key: string, asset: import('@platform/schemas').MediaAsset) {
  if (props.block.id !== 'scroll-video-scrub-01' || key !== 'video') return
  emit('update', {
    ...values.value,
    video: asset.url,
    mediaId: asset.id,
    frameCount: asset.frameCount,
    frameFps: asset.frameFps || 24,
  })
}

// --- visual selects ---------------------------------------------------------

/**
 * Option values that mean something visual, and the icon that shows it.
 *
 * Keyed by *value*, not by field key: block definitions are written by whoever
 * adds a block, so recognising `left` / `dark` / `bolt` wherever they appear is
 * more robust than maintaining a list of field names. A select whose values are
 * not all in here stays a dropdown — which is the right answer for anything
 * that is a word rather than a picture.
 */
const VISUAL_OPTION_ICONS: Record<string, string> = {
  // alignment / header layout
  left: 'align-left',
  center: 'align-center',
  right: 'align-right',
  split: 'layout-split',
  // surface tone
  light: 'tone-light',
  muted: 'tone-muted',
  primary: 'tone-primary',
  dark: 'tone-dark',
  // motion intensity and speed
  subtle: 'intensity-subtle',
  pronounced: 'intensity-pronounced',
  slow: 'speed-slow',
  medium: 'speed-medium',
  fast: 'speed-fast',
}

/** Twelve options is the ceiling: past that a grid is worse than a dropdown. */
const MAX_GRID_OPTIONS = 12

function visualOptions(field: Pick<BlockField, 'type' | 'options'>): VisualOption[] | null {
  if (field.type !== 'select') return null

  const options = field.options ?? []
  if (!options.length || options.length > MAX_GRID_OPTIONS) return null
  if (!options.every((option) => VISUAL_OPTION_ICONS[option.value])) return null

  return options.map((option) => ({
    value: option.value,
    label: option.label,
    icon: VISUAL_OPTION_ICONS[option.value] ?? 'dot',
  }))
}

/** Two or three options read best on one row; more want a tidy four-column block. */
function gridColumns(count: number): number {
  return count <= 3 ? count : 4
}

const iconSearch = ref('')

const filteredIconNames = computed(() => {
  const term = iconSearch.value.trim().toLowerCase()
  if (!term) return [...ICON_NAMES]
  return ICON_NAMES.filter((name) => name.includes(term) || name.replace(/-/g, ' ').includes(term))
})

function iconValue(value: unknown): string {
  return isIconName(value) ? value : 'check'
}

// --- repeatable items -------------------------------------------------------

function itemsOf(field: BlockField): Record<string, unknown>[] {
  const value = values.value[field.key]
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function blankItem(field: BlockField): Record<string, unknown> {
  return Object.fromEntries(
    (field.itemFields ?? []).map((sub) => [
      sub.key,
      sub.type === 'number' ? 0 : sub.type === 'boolean' ? false : sub.type === 'icon' ? 'check' : '',
    ]),
  )
}

function updateItem(field: BlockField, index: number, key: string, value: unknown) {
  const next = itemsOf(field).map((item, i) => (i === index ? { ...item, [key]: value } : item))
  setValue(field.key, next)
}

function addItem(field: BlockField) {
  setValue(field.key, [...itemsOf(field), blankItem(field)])
}

function duplicateItem(field: BlockField, index: number) {
  const items = itemsOf(field)
  const original = items[index]
  if (!original) return
  const copy = { ...original }
  const next = [...items]
  next.splice(index + 1, 0, copy)
  setValue(field.key, next)
  // Keep the new copy open so the editor can see it was added.
  collapsedItems.value = new Set(
    [...collapsedItems.value].filter((id) => id !== itemKey(field.key, index + 1)),
  )
}

function removeItem(field: BlockField, index: number) {
  setValue(
    field.key,
    itemsOf(field).filter((_, i) => i !== index),
  )
}

function moveItem(field: BlockField, index: number, delta: number) {
  const items = [...itemsOf(field)]
  const target = index + delta
  if (target < 0 || target >= items.length) return
  const [moved] = items.splice(index, 1)
  items.splice(target, 0, moved!)
  setValue(field.key, items)
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

/** Collapsed repeatable cards. Keyed `${fieldKey}:${index}` so lists stay independent. */
const collapsedItems = ref<Set<string>>(new Set())

function itemKey(fieldKey: string, index: number) {
  return `${fieldKey}:${index}`
}

function isItemOpen(fieldKey: string, index: number) {
  return !collapsedItems.value.has(itemKey(fieldKey, index))
}

function toggleItem(fieldKey: string, index: number) {
  const key = itemKey(fieldKey, index)
  const next = new Set(collapsedItems.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedItems.value = next
}

function itemSummary(field: BlockField, item: Record<string, unknown>): string {
  for (const sub of field.itemFields ?? []) {
    if (sub.type === 'text' || sub.type === 'textarea') {
      const value = asText(item[sub.key]).trim()
      if (value) return value
    }
  }
  return field.itemLabel ?? 'Item'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <template v-for="field in block.fields" :key="field.key">
      <!-- repeatable list -->
      <div v-if="field.type === 'items'">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-[0.8125rem] font-medium text-soft">{{ field.label }}</p>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="field.maxItems !== undefined && itemsOf(field).length >= field.maxItems"
            @click="addItem(field)"
          >
            + Add
          </UiButton>
        </div>

        <div class="flex flex-col gap-3">
          <div
            v-for="(item, index) in itemsOf(field)"
            :key="index"
            class="rounded-lg border border-line bg-sunken/50"
          >
            <div class="flex items-center gap-1 px-3 py-2">
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-0.5 text-left transition-colors hover:bg-raised/60"
                :aria-expanded="isItemOpen(field.key, index)"
                @click="toggleItem(field.key, index)"
              >
                <ChevronRight
                  class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
                  :class="isItemOpen(field.key, index) ? 'rotate-90' : ''"
                  :stroke-width="2.25"
                  aria-hidden="true"
                />
                <span class="type-button-12 truncate text-ink">
                  {{ field.itemLabel ?? 'Item' }} {{ index + 1 }}
                </span>
                <span
                  v-if="!isItemOpen(field.key, index)"
                  class="type-caption-12 min-w-0 flex-1 truncate text-faint"
                >{{ itemSummary(field, item) }}</span>
              </button>

              <div class="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
                  :disabled="index === 0"
                  aria-label="Move up"
                  @click="moveItem(field, index, -1)"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
                  :disabled="index === itemsOf(field).length - 1"
                  aria-label="Move down"
                  @click="moveItem(field, index, 1)"
                >
                  &darr;
                </button>
                <button
                  type="button"
                  class="type-button-10 h-7 rounded-md px-1.5 text-faint transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
                  :disabled="field.maxItems !== undefined && itemsOf(field).length >= field.maxItems"
                  aria-label="Duplicate item"
                  title="Duplicate"
                  @click="duplicateItem(field, index)"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  aria-label="Remove"
                  @click="removeItem(field, index)"
                >
                  &times;
                </button>
              </div>
            </div>

            <div v-show="isItemOpen(field.key, index)" class="flex flex-col gap-3 border-t border-line px-3.5 py-3">
              <template v-for="sub in field.itemFields ?? []" :key="sub.key">
                <!-- A picture is a better control than a list of words for it. -->
                <UiOptionGrid
                  v-if="visualOptions(sub)"
                  :label="sub.label"
                  :options="visualOptions(sub)!"
                  :columns="gridColumns(visualOptions(sub)!.length)"
                  :model-value="asText(item[sub.key])"
                  @update:model-value="updateItem(field, index, sub.key, $event)"
                />

                <div v-else-if="sub.type === 'icon'">
                  <p class="type-caption mb-1.5 text-soft">{{ sub.label }}</p>
                  <UiInput
                    v-model="iconSearch"
                    type="search"
                    placeholder="Search icons…"
                    class="mb-1.5"
                    aria-label="Search icons"
                  />
                  <div class="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-line p-1.5">
                    <button
                      v-for="name in filteredIconNames"
                      :key="name"
                      type="button"
                      class="grid h-8 place-items-center rounded-md transition-colors"
                      :class="
                        iconValue(item[sub.key]) === name
                          ? 'bg-brand-soft text-brand'
                          : 'text-soft hover:bg-raised hover:text-ink'
                      "
                      :title="name"
                      :aria-label="name"
                      :aria-pressed="iconValue(item[sub.key]) === name"
                      @click="updateItem(field, index, sub.key, name)"
                    >
                      <UiIcon :name="name" class="h-4 w-4" />
                    </button>
                  </div>
                  <p v-if="!filteredIconNames.length" class="mt-1 type-caption-12 text-faint">No icons match.</p>
                </div>

                <UiField v-else v-slot="{ id }" :label="sub.label">
                  <UiTextarea
                    v-if="sub.type === 'textarea'"
                    :id="id"
                    :model-value="asText(item[sub.key])"
                    :rows="2"
                    @update:model-value="updateItem(field, index, sub.key, $event)"
                  />
                  <UiSelect
                    v-else-if="sub.type === 'select'"
                    :id="id"
                    :model-value="asText(item[sub.key])"
                    :options="sub.options ?? []"
                    @update:model-value="updateItem(field, index, sub.key, $event)"
                  />
                  <MediaField
                    v-else-if="sub.type === 'image' || sub.type === 'media'"
                    :id="id"
                    :model-value="asText(item[sub.key])"
                    :placeholder="sub.placeholder"
                    folder="blocks"
                    @update:model-value="updateItem(field, index, sub.key, $event)"
                  />
                  <PageLinkField
                    v-else-if="sub.type === 'url'"
                    :id="id"
                    :model-value="asText(item[sub.key])"
                    :placeholder="sub.placeholder"
                    :pages="pages"
                    :site-id="siteId"
                    @update:model-value="updateItem(field, index, sub.key, $event)"
                  />
                  <UiInput
                    v-else
                    :id="id"
                    :type="sub.type === 'number' ? 'number' : 'text'"
                    :model-value="asText(item[sub.key])"
                    @update:model-value="
                      updateItem(field, index, sub.key, sub.type === 'number' ? Number($event) : $event)
                    "
                  />
                </UiField>
              </template>
            </div>
          </div>
        </div>

        <UiEmptyState
          v-if="!itemsOf(field).length"
          :title="`No ${field.label.toLowerCase()} yet`"
          description="Add the first one to get started."
        />
      </div>

      <!-- single visual choice -->
      <UiOptionGrid
        v-else-if="visualOptions(field)"
        :label="field.label"
        :help="field.help ?? ''"
        :options="visualOptions(field)!"
        :columns="gridColumns(visualOptions(field)!.length)"
        :model-value="asText(values[field.key])"
        @update:model-value="setValue(field.key, $event)"
      />

      <!-- icon picker — searchable Lucide-aligned set -->
      <div v-else-if="field.type === 'icon'">
        <p class="type-caption mb-1.5 text-soft">{{ field.label }}</p>
        <p v-if="field.help" class="type-caption-12 mb-2 text-faint">{{ field.help }}</p>
        <UiInput
          v-model="iconSearch"
          type="search"
          placeholder="Search icons…"
          class="mb-1.5"
          aria-label="Search icons"
        />
        <div class="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-line p-1.5">
          <button
            v-for="name in filteredIconNames"
            :key="name"
            type="button"
            class="grid h-8 place-items-center rounded-md transition-colors"
            :class="
              iconValue(values[field.key]) === name
                ? 'bg-brand-soft text-brand'
                : 'text-soft hover:bg-raised hover:text-ink'
            "
            :title="name"
            :aria-label="name"
            :aria-pressed="iconValue(values[field.key]) === name"
            @click="setValue(field.key, name)"
          >
            <UiIcon :name="name" class="h-4 w-4" />
          </button>
        </div>
        <p v-if="!filteredIconNames.length" class="mt-1 type-caption-12 text-faint">No icons match.</p>
      </div>

      <!-- single value -->
      <UiField v-else v-slot="{ id, describedBy }" :label="field.label" :help="field.help">
        <UiTextarea
          v-if="field.type === 'textarea'"
          :id="id"
          :described-by="describedBy"
          :model-value="asText(values[field.key])"
          :placeholder="field.placeholder"
          :rows="4"
          @update:model-value="setValue(field.key, $event)"
        />
        <UiSelect
          v-else-if="field.type === 'select'"
          :id="id"
          :described-by="describedBy"
          :model-value="asText(values[field.key])"
          :options="field.options ?? []"
          @update:model-value="setValue(field.key, $event)"
        />
        <UiSwitch
          v-else-if="field.type === 'boolean'"
          :id="id"
          :model-value="Boolean(values[field.key])"
          :label="field.label"
          @update:model-value="setValue(field.key, $event)"
        />
        <MediaField
          v-else-if="field.type === 'image' || field.type === 'media'"
          :id="id"
          :described-by="describedBy"
          :model-value="asText(values[field.key])"
          :placeholder="field.placeholder"
          :folder="field.key === 'logo' ? 'brand' : 'blocks'"
          :scroll-ready-only="block.id === 'scroll-video-scrub-01' && field.key === 'video'"
          @update:model-value="setValue(field.key, $event)"
          @select="onScrollVideoSelect(field.key, $event)"
        />
        <PageLinkField
          v-else-if="field.type === 'url'"
          :id="id"
          :described-by="describedBy"
          :model-value="asText(values[field.key])"
          :placeholder="field.placeholder"
          :pages="pages"
          :site-id="siteId"
          @update:model-value="setValue(field.key, $event)"
        />
        <UiInput
          v-else
          :id="id"
          :described-by="describedBy"
          :type="field.type === 'number' ? 'number' : 'text'"
          :model-value="asText(values[field.key])"
          :placeholder="field.placeholder"
          @update:model-value="setValue(field.key, field.type === 'number' ? Number($event) : $event)"
        />
      </UiField>
    </template>
  </div>
</template>
