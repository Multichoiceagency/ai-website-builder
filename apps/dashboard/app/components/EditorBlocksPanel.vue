<script setup lang="ts">
import { computed, ref } from 'vue'
import { listBlockMetadata } from '@platform/blocks'
import {
  BLOCK_CATEGORIES,
  type PerformanceClass,
  type RegistryBlockMetadata,
} from '@platform/schemas'
import { EMPTY_LAYOUT_BLOCK_IDS } from '../utils/catalog-split'
import { LIBRARY_DRAG_MIME } from '../utils/library-drag'

/**
 * The docked Blocks panel — the Frappe-Builder "components" sidebar.
 *
 * Every block in the registry, grouped by category, permanently one drag away
 * from the canvas. Click appends to the end of the page; dragging drops the
 * block at a precise insertion index through the same MIME envelope the
 * Insert panel uses, so the canvas needs no second drop path (ADR-0003).
 */
const props = withDefaults(
  defineProps<{
    /** Mirrors `page:write`. Cards stay browsable but inert when false. */
    canWrite?: boolean
    /** The site's rendering budget. Heavier blocks are not offered. */
    maxPerformanceClass?: PerformanceClass
  }>(),
  { canWrite: false, maxPerformanceClass: 'D' },
)

const emit = defineEmits<{
  /** Click-to-insert: append this block to the page. */
  insert: [blockId: string]
  /** Open the full Insert panel (templates, backgrounds, Motionsites). */
  'open-library': []
}>()

const search = ref('')
const category = ref('')

const CLASS_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
const all = listBlockMetadata()
const EMPTY_PIN_SET = new Set<string>(EMPTY_LAYOUT_BLOCK_IDS)

const withinBudget = computed(() =>
  all.filter(
    (block) =>
      EMPTY_PIN_SET.has(block.id) ||
      CLASS_ORDER[block.performanceClass]! <= CLASS_ORDER[props.maxPerformanceClass]!,
  ),
)

/** Freeform Empty section — always first when present. */
const pinnedEmpty = computed(() =>
  EMPTY_LAYOUT_BLOCK_IDS.map((id) => withinBudget.value.find((block) => block.id === id)).filter(
    (block): block is RegistryBlockMetadata => Boolean(block),
  ),
)

const results = computed(() => {
  const term = search.value.trim().toLowerCase()
  return withinBudget.value.filter((block) => {
    if (EMPTY_PIN_SET.has(block.id) && !term && !category.value) return false
    if (category.value && block.category !== category.value) return false
    if (!term) return true
    return `${block.name} ${block.description} ${block.tags.join(' ')}`
      .toLowerCase()
      .includes(term)
  })
})

/** Categories that still have blocks after filtering, in registry order. */
const groups = computed(() =>
  BLOCK_CATEGORIES.map((id) => ({
    id,
    label: id[0]!.toUpperCase() + id.slice(1),
    blocks: results.value.filter((block) => block.category === id),
  })).filter((group) => group.blocks.length),
)

const CATEGORY_CHIPS = computed(() => [
  { label: 'All', value: '' },
  ...BLOCK_CATEGORIES.filter((id) =>
    withinBudget.value.some((block) => block.category === id),
  ).map((id) => ({ label: id[0]!.toUpperCase() + id.slice(1), value: id })),
])

function toneFor(performanceClass: string) {
  if (performanceClass === 'A') return 'positive'
  if (performanceClass === 'B') return 'neutral'
  return 'warning'
}

function onDragStart(block: RegistryBlockMetadata, event: DragEvent) {
  if (!props.canWrite || !event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(
    LIBRARY_DRAG_MIME,
    JSON.stringify({ kind: 'insert-block', blockIds: [block.id] }),
  )
  event.dataTransfer.setData('text/plain', block.name)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 space-y-2 border-b border-line px-3 py-2">
      <div class="flex items-center justify-between gap-2">
        <span class="type-button-10 uppercase tracking-[0.08em] text-faint">Blocks</span>
        <button
          type="button"
          class="type-button-10 rounded-md px-2 py-1 text-soft transition-colors hover:bg-sunken hover:text-ink"
          title="Templates, backgrounds and Motionsites"
          @click="emit('open-library')"
        >Library ↗</button>
      </div>
      <UiInput v-model="search" placeholder="Search blocks…" aria-label="Search blocks" />
      <div class="flex flex-wrap gap-1">
        <button
          v-for="chip in CATEGORY_CHIPS"
          :key="chip.value"
          type="button"
          class="type-button-10 rounded-full px-2 py-0.5 transition-colors"
          :class="
            category === chip.value
              ? 'bg-brand-soft text-brand'
              : 'bg-sunken text-soft hover:text-ink'
          "
          :aria-pressed="category === chip.value"
          @click="category = chip.value"
        >{{ chip.label }}</button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
      <section
        v-if="pinnedEmpty.length && !category && !search.trim()"
        class="mb-4 last:mb-0"
      >
        <h3 class="type-button-10 mb-1 px-1 uppercase tracking-[0.08em] text-faint">
          Freeform
        </h3>
        <ul class="space-y-1">
          <li v-for="block in pinnedEmpty" :key="block.id">
            <button
              type="button"
              :draggable="canWrite"
              class="group flex w-full items-center gap-2 rounded-md border border-brand/25 bg-brand-soft/30 px-2 py-1.5 text-left transition-colors hover:border-brand hover:bg-brand-soft disabled:cursor-default"
              :class="canWrite ? 'cursor-grab active:cursor-grabbing' : ''"
              :disabled="!canWrite"
              :title="block.description"
              @click="canWrite && emit('insert', block.id)"
              @dragstart="onDragStart(block, $event)"
            >
              <span
                class="type-button-12 select-none text-faint opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              >⠿</span>
              <span class="type-button-12 min-w-0 flex-1 truncate text-ink">{{ block.name }}</span>
              <UiBadge tone="brand">Freeform</UiBadge>
            </button>
          </li>
        </ul>
      </section>

      <section v-for="group in groups" :key="group.id" class="mb-4 last:mb-0">
        <h3 class="type-button-10 mb-1 px-1 uppercase tracking-[0.08em] text-faint">
          {{ group.label }}
        </h3>
        <ul class="space-y-1">
          <li v-for="block in group.blocks" :key="block.id">
            <button
              type="button"
              :draggable="canWrite"
              class="group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-sunken disabled:cursor-default"
              :class="canWrite ? 'cursor-grab active:cursor-grabbing' : ''"
              :disabled="!canWrite"
              :title="block.description"
              @click="canWrite && emit('insert', block.id)"
              @dragstart="onDragStart(block, $event)"
            >
              <span
                class="type-button-12 select-none text-faint opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              >⠿</span>
              <span class="type-button-12 min-w-0 flex-1 truncate text-ink">{{ block.name }}</span>
              <UiBadge :tone="toneFor(block.performanceClass)">{{ block.performanceClass }}</UiBadge>
            </button>
          </li>
        </ul>
      </section>

      <p
        v-if="!results.length && !(pinnedEmpty.length && !category && !search.trim())"
        class="px-2 py-6 text-center text-[0.75rem] text-faint"
      >
        Nothing matches. Try another word or category.
      </p>
    </div>
  </div>
</template>
