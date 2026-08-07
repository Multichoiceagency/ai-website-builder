<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Sparkles,
  Trash2,
} from '@lucide/vue'

/**
 * The quick controls that float over the selected section on the canvas.
 *
 * It lives *inside* the zoomed frame so it tracks the section without any
 * measurement, and cancels the frame's zoom with its own — `zoom` multiplies
 * down the tree, so `100 / zoom` restores exactly 1:1. The controls therefore
 * stay the same physical size at 50% as at 125%, which is the whole point of a
 * chrome element: it is not part of the page being designed.
 *
 * Above the section where there is room, tucked inside the top-right corner for
 * the first one, where "above" would be clipped by the frame.
 */
const props = defineProps<{
  index: number
  total: number
  label: string
  zoom: number
  canWrite: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  moveUp: []
  moveDown: []
  duplicate: []
  remove: []
  askAi: []
  dragStart: [PointerEvent]
}>()

/** Counter-zoom, so the toolbar renders at its natural size at any zoom. */
const scale = computed(() => 100 / (props.zoom || 100))

const first = computed(() => props.index === 0)

const BUTTON =
  'grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30'
</script>

<template>
  <div
    class="absolute right-2 z-20 flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5 shadow-float"
    :class="first ? 'top-2' : '-top-1 -translate-y-full'"
    :style="{ zoom: scale }"
    role="toolbar"
    :aria-label="`${label} controls`"
    @click.stop
    @pointerdown.stop
  >
    <span class="type-button-10 max-w-[10rem] truncate px-1.5 text-faint">{{ label }}</span>

    <span
      class="grid h-7 w-6 cursor-grab touch-none place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink active:cursor-grabbing"
      role="button"
      tabindex="-1"
      aria-label="Drag to reorder"
      title="Drag to reorder"
      @pointerdown="emit('dragStart', $event)"
    >
      <GripVertical class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </span>

    <span class="mx-0.5 h-4 w-px bg-line" aria-hidden="true" />

    <button
      type="button"
      :class="BUTTON"
      :disabled="index === 0"
      aria-label="Move section up"
      title="Move up (⌥↑)"
      @click="emit('moveUp')"
    >
      <ArrowUp class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </button>

    <button
      type="button"
      :class="BUTTON"
      :disabled="index === total - 1"
      aria-label="Move section down"
      title="Move down (⌥↓)"
      @click="emit('moveDown')"
    >
      <ArrowDown class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </button>

    <button
      v-if="canWrite"
      type="button"
      :class="BUTTON"
      aria-label="Duplicate section"
      title="Duplicate (⌘D)"
      @click="emit('duplicate')"
    >
      <Copy class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </button>

    <button
      v-if="canWrite"
      type="button"
      :class="BUTTON"
      aria-label="Delete section"
      title="Delete"
      @click="emit('remove')"
    >
      <Trash2 class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </button>

    <span v-if="canWrite" class="mx-0.5 h-4 w-px bg-line" aria-hidden="true" />

    <button
      v-if="canWrite"
      type="button"
      class="type-button-12 inline-flex h-7 items-center gap-1 rounded-md bg-brand-soft px-2 text-brand transition-colors hover:bg-brand hover:text-brand-ink disabled:opacity-50"
      :disabled="busy"
      aria-label="Ask AI to edit this section"
      title="Ask AI"
      @click="emit('askAi')"
    >
      <Sparkles class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
      Ask AI
    </button>
  </div>
</template>
