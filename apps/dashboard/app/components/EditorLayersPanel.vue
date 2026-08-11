<script setup lang="ts">
import { ref } from 'vue'
import { getBlock } from '@platform/blocks'
import type { LayoutNode, LayoutNodeType, Section } from '@platform/schemas'

/**
 * The docked Layers panel: one row per section, in page order.
 *
 * When the selected section is a layout-canvas, Structure appears under the
 * list so nestable nodes share the same rail. Mutations are emitted only —
 * the page owns the document and undo history.
 */
const props = defineProps<{
  sections: Section[]
  selectedId: string | null
  /** Sections whose copy / island is being generated — shown as a pulse. */
  generatingIds: string[]
  canWrite: boolean
  /** Layout-canvas root when the selected section is freeform. */
  structureRoot?: LayoutNode | null
  selectedNodeId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  reorder: [from: number, to: number]
  move: [index: number, delta: number]
  duplicate: [index: number]
  remove: [index: number]
  /** Open the Insert panel. */
  add: []
  'select-node': [id: string]
  'add-child': [parentId: string, type: LayoutNodeType]
  'duplicate-node': [id: string]
  'remove-node': [id: string]
  'move-node': [id: string, delta: -1 | 1]
}>()

function labelFor(section: Section): string {
  return getBlock(section.block)?.name ?? section.block
}

const draggingIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', String(index))
}
function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  dropIndex.value = index
}
function onDrop(index: number) {
  if (draggingIndex.value !== null) emit('reorder', draggingIndex.value, index)
  draggingIndex.value = null
  dropIndex.value = null
}
function onDragEnd() {
  draggingIndex.value = null
  dropIndex.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex shrink-0 items-center justify-between px-3 py-2">
      <span class="type-button-10 uppercase tracking-[0.08em] text-faint">Sections</span>
      <UiButton v-if="canWrite" size="sm" variant="ghost" @click="emit('add')">+ Add</UiButton>
    </div>

    <ul v-if="sections.length" class="min-h-0 shrink-0 overflow-y-auto px-1.5 pb-2" :class="structureRoot ? 'max-h-[40%]' : 'flex-1'">
      <li
        v-for="(section, index) in sections"
        :key="section.id"
        draggable="true"
        class="rounded-md transition-[opacity,box-shadow]"
        :class="[
          draggingIndex === index ? 'opacity-40' : '',
          dropIndex === index && draggingIndex !== index ? 'shadow-[inset_0_2px_0_0_var(--brand)]' : '',
        ]"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <div
          class="group flex items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors"
          :class="section.id === selectedId ? 'bg-brand-soft' : 'hover:bg-sunken'"
        >
          <span
            v-if="generatingIds.includes(section.id)"
            class="grid h-4 w-4 shrink-0 place-items-center px-0.5"
            :title="section.block === 'motion-section-01' ? 'Generating Motionsites…' : 'Writing copy…'"
          >
            <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" aria-hidden="true" />
            <span class="sr-only">{{
              section.block === 'motion-section-01' ? 'Generating Motionsites' : 'Writing copy'
            }}</span>
          </span>
          <span
            v-else
            class="type-button-12 cursor-grab select-none px-0.5 text-faint active:cursor-grabbing"
            aria-hidden="true"
          >⠿</span>

          <button
            type="button"
            class="type-button-12 min-w-0 flex-1 truncate rounded px-0.5 py-0.5 text-left"
            :class="section.id === selectedId ? 'text-brand' : 'text-ink'"
            @click="emit('select', section.id)"
          >{{ labelFor(section) }}</button>

          <span class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink disabled:opacity-25" :disabled="index === 0" aria-label="Move up" @click="emit('move', index, -1)">↑</button>
            <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink disabled:opacity-25" :disabled="index === sections.length - 1" aria-label="Move down" @click="emit('move', index, 1)">↓</button>
            <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink" aria-label="Duplicate" title="Duplicate (⌘D)" @click="emit('duplicate', index)">⧉</button>
            <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-danger" aria-label="Remove" @click="emit('remove', index)">×</button>
          </span>
        </div>
      </li>
    </ul>

    <div v-else class="px-4 py-8 text-center">
      <p class="text-[0.75rem] text-faint">No sections yet.</p>
      <UiButton v-if="canWrite" type="button" size="sm" class="mt-3" @click="emit('add')">
        Add a section
      </UiButton>
    </div>

    <div
      v-if="structureRoot"
      class="flex min-h-0 flex-1 flex-col border-t border-line"
    >
      <EditorLayoutStructure
        :root="structureRoot"
        :selected-node-id="selectedNodeId ?? null"
        :can-write="canWrite"
        @select-node="emit('select-node', $event)"
        @add-child="(parentId, type) => emit('add-child', parentId, type)"
        @duplicate="emit('duplicate-node', $event)"
        @remove="emit('remove-node', $event)"
        @move="(id, delta) => emit('move-node', id, delta)"
      />
    </div>
  </div>
</template>
