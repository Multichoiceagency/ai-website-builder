<script setup lang="ts">
import { ref } from 'vue'

/**
 * Draggable divider between a panel and the canvas.
 *
 * Exposed as `role="separator"` with `aria-valuenow`, and driven by arrow keys
 * as well as the pointer — a divider you can only drag is unusable for anyone
 * on a keyboard, and it is trivially cheap to support both.
 */
const width = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Which side of the canvas this divider sits on. */
    side: 'left' | 'right'
    min?: number
    max?: number
    label?: string
  }>(),
  { min: 200, max: 560, label: 'Resize panel' },
)

const dragging = ref(false)
let startX = 0
let startWidth = 0

function clamp(value: number): number {
  return Math.min(props.max, Math.max(props.min, Math.round(value)))
}

function onPointerDown(event: PointerEvent) {
  dragging.value = true
  startX = event.clientX
  startWidth = width.value
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  // Suppress text selection across the whole document while dragging.
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  // A left panel grows as the pointer moves right; a right panel grows as it
  // moves left.
  const delta = props.side === 'left' ? event.clientX - startX : startX - event.clientX
  width.value = clamp(startWidth + delta)
}

function stop(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 48 : 16
  const grow = props.side === 'left' ? 'ArrowRight' : 'ArrowLeft'
  const shrink = props.side === 'left' ? 'ArrowLeft' : 'ArrowRight'

  if (event.key === grow) {
    event.preventDefault()
    width.value = clamp(width.value + step)
  } else if (event.key === shrink) {
    event.preventDefault()
    width.value = clamp(width.value - step)
  } else if (event.key === 'Home') {
    event.preventDefault()
    width.value = props.min
  } else if (event.key === 'End') {
    event.preventDefault()
    width.value = props.max
  }
}
</script>

<template>
  <div
    role="separator"
    tabindex="0"
    aria-orientation="vertical"
    :aria-label="label"
    :aria-valuenow="width"
    :aria-valuemin="min"
    :aria-valuemax="max"
    class="group relative z-10 w-px shrink-0 cursor-col-resize bg-line outline-none transition-colors"
    :class="dragging ? 'bg-brand' : 'hover:bg-brand focus-visible:bg-brand'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="stop"
    @pointercancel="stop"
    @keydown="onKeydown"
  >
    <!-- The visible divider is 1px; the grab target is 9px, because a 1px hit
         area is a usability bug on every pointer device. -->
    <span class="absolute inset-y-0 -left-1 -right-1 block" aria-hidden="true" />
  </div>
</template>
