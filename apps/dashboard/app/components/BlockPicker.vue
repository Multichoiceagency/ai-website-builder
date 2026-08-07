<script setup lang="ts">
import { computed, ref } from 'vue'
import { COLLECTIONS, listBlockMetadata } from '@platform/blocks'
import { BLOCK_CATEGORIES, type RegistryBlockMetadata } from '@platform/schemas'

/**
 * Block picker. Reads the same registry the AI block selector uses, so a human
 * and an agent are always choosing from one catalogue (ADR-0003).
 *
 * Grouped by collection, because "which section" is easier to answer after
 * "which kind of section". Filters mirror the component lab exactly — the two
 * views differ in what they do with a block, never in what they can see.
 */
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ pick: [blockId: string] }>()

const search = ref('')
const category = ref('')
const collection = ref('')
const performance = ref('')

const all = listBlockMetadata()

const CATEGORY_OPTIONS = [
  { label: 'All sections', value: '' },
  ...BLOCK_CATEGORIES.map((value) => ({ label: value[0]!.toUpperCase() + value.slice(1), value })),
]

const COLLECTION_OPTIONS = [
  { label: 'All collections', value: '' },
  ...COLLECTIONS.map((entry) => ({ label: entry.name, value: entry.id })),
]

const PERFORMANCE_OPTIONS = [
  { label: 'Any weight', value: '' },
  { label: 'A — static only', value: 'A' },
  { label: 'A–B — light motion', value: 'B' },
  { label: 'A–C — scroll effects', value: 'C' },
]

const CLASS_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

const results = computed<RegistryBlockMetadata[]>(() => {
  const term = search.value.trim().toLowerCase()
  const ceiling = performance.value ? CLASS_ORDER[performance.value]! : undefined

  return all.filter((block) => {
    if (category.value && block.category !== category.value) return false
    if (collection.value && block.collection !== collection.value) return false
    if (ceiling !== undefined && CLASS_ORDER[block.performanceClass]! > ceiling) return false
    if (!term) return true
    return `${block.name} ${block.description} ${block.capabilities.join(' ')} ${block.tags.join(' ')}`
      .toLowerCase()
      .includes(term)
  })
})

/** Collections that still have something to show, in registry order. */
const groups = computed(() =>
  COLLECTIONS.map((entry) => ({
    ...entry,
    blocks: results.value.filter((block) => block.collection === entry.id),
  })).filter((group) => group.blocks.length),
)

function toneFor(performanceClass: string) {
  if (performanceClass === 'A') return 'positive'
  if (performanceClass === 'B') return 'neutral'
  return 'warning'
}

function pick(blockId: string) {
  emit('pick', blockId)
  open.value = false
  search.value = ''
}
</script>

<template>
  <UiDialog v-model:open="open" title="Add a section" description="Pick a layout — you can edit the content next." wide>
    <div class="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <UiInput v-model="search" placeholder="Search sections…" />
      <UiSelect v-model="collection" :options="COLLECTION_OPTIONS" />
      <UiSelect v-model="category" :options="CATEGORY_OPTIONS" />
      <UiSelect v-model="performance" :options="PERFORMANCE_OPTIONS" />
    </div>

    <div class="max-h-[26rem] overflow-y-auto pr-1">
      <section v-for="group in groups" :key="group.id" class="mb-6 last:mb-0">
        <div class="mb-2 flex items-baseline justify-between gap-3">
          <h3 class="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-soft">{{ group.name }}</h3>
          <p class="truncate text-[0.75rem] text-faint">{{ group.styleDirection }}</p>
        </div>

        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="block in group.blocks" :key="block.id">
            <button
              type="button"
              class="h-full w-full rounded-lg border border-line bg-raised p-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-raised"
              @click="pick(block.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-semibold text-ink">{{ block.name }}</p>
                <!-- The performance class stays visible: choosing a heavy
                     section should be a decision someone made on purpose. -->
                <UiBadge :tone="toneFor(block.performanceClass)">{{ block.performanceClass }}</UiBadge>
              </div>
              <p class="mt-1 text-[0.8125rem] leading-relaxed text-soft">{{ block.description }}</p>
              <p class="mt-2 text-[0.75rem] text-faint">
                {{ block.category }}<span v-if="block.tags.length"> · {{ block.tags.slice(0, 3).join(' · ') }}</span>
              </p>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <UiEmptyState v-if="!results.length" title="Nothing matches" description="Try a different word, collection or category." />
  </UiDialog>
</template>
