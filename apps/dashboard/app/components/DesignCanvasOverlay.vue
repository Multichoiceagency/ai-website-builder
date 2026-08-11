<script setup lang="ts">
/**
 * Design-mode selection chrome: drag move + 8-handle resize over the live artboard.
 * Commits frames via emit; parent owns undo. Storefront has no overlay.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { parseLayoutPx, type LayoutNode } from '@platform/schemas'

const props = defineProps<{
  root: LayoutNode
  selectedNodeId: string | null
  /** CSS zoom percent (100 = 1×). */
  zoom: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  'commit-frame': [
    id: string,
    frame: { left: string; top: string; width: string; height: string },
  ]
}>()

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move'

const artboardEl = ref<HTMLElement | null>(null)
const box = ref<{ left: number; top: number; width: number; height: number } | null>(null)

const scale = computed(() => Math.max(0.1, props.zoom / 100))

function readNodeBox(nodeId: string): { left: number; top: number; width: number; height: number } | null {
  if (!artboardEl.value) return null
  const el = artboardEl.value.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`) as HTMLElement | null
  if (!el) return null
  const art = artboardEl.value.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  const s = scale.value
  return {
    left: (rect.left - art.left) / s,
    top: (rect.top - art.top) / s,
    width: Math.max(8, rect.width / s),
    height: Math.max(8, rect.height / s),
  }
}

function refreshBox() {
  if (!props.selectedNodeId || props.selectedNodeId === props.root.id) {
    box.value = null
    return
  }
  box.value = readNodeBox(props.selectedNodeId)
}

watch(
  () => [props.selectedNodeId, props.root, props.zoom] as const,
  () => {
    requestAnimationFrame(refreshBox)
  },
  { immediate: true, deep: true },
)

let drag: {
  handle: Handle
  startX: number
  startY: number
  origin: { left: number; top: number; width: number; height: number }
  id: string
} | null = null

function onPointerDown(handle: Handle, event: PointerEvent) {
  if (props.disabled || !props.selectedNodeId || !box.value) return
  if (props.selectedNodeId === props.root.id) return
  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  drag = {
    handle,
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...box.value },
    id: props.selectedNodeId,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  const s = scale.value
  const dx = (event.clientX - drag.startX) / s
  const dy = (event.clientY - drag.startY) / s
  let { left, top, width, height } = drag.origin
  const h = drag.handle

  if (h === 'move') {
    left += dx
    top += dy
  } else {
    if (h.includes('e')) width = Math.max(8, drag.origin.width + dx)
    if (h.includes('s')) height = Math.max(8, drag.origin.height + dy)
    if (h.includes('w')) {
      const next = Math.max(8, drag.origin.width - dx)
      left = drag.origin.left + (drag.origin.width - next)
      width = next
    }
    if (h.includes('n')) {
      const next = Math.max(8, drag.origin.height - dy)
      top = drag.origin.top + (drag.origin.height - next)
      height = next
    }
  }
  box.value = { left, top, width, height }
}

function onPointerUp() {
  if (!drag || !box.value) {
    drag = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    return
  }
  const { id } = drag
  const frame = {
    left: `${Math.round(box.value.left)}px`,
    top: `${Math.round(box.value.top)}px`,
    width: `${Math.round(box.value.width)}px`,
    height: `${Math.round(box.value.height)}px`,
  }
  drag = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  emit('commit-frame', id, frame)
}

function onArtboardClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const nodeEl = target?.closest?.('[data-node-id]') as HTMLElement | null
  if (!nodeEl) {
    emit('select', props.root.id)
    return
  }
  const id = nodeEl.getAttribute('data-node-id')
  if (id) emit('select', id)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

const handles: Handle[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']

function handleStyle(h: Handle): Record<string, string> {
  if (!box.value) return { display: 'none' }
  const { left, top, width, height } = box.value
  const size = 8
  let x = left + width / 2 - size / 2
  let y = top + height / 2 - size / 2
  if (h.includes('w')) x = left - size / 2
  if (h.includes('e')) x = left + width - size / 2
  if (h.includes('n')) y = top - size / 2
  if (h.includes('s')) y = top + height - size / 2
  const cursor =
    h === 'n' || h === 's'
      ? 'ns-resize'
      : h === 'e' || h === 'w'
        ? 'ew-resize'
        : h === 'ne' || h === 'sw'
          ? 'nesw-resize'
          : 'nwse-resize'
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
    cursor,
  }
}

/** Seed absolute coords from styles when first selecting (for inspector sync). */
function styleHint(node: LayoutNode | null) {
  if (!node?.styles) return null
  return {
    left: parseLayoutPx(node.styles.left as string | undefined),
    top: parseLayoutPx(node.styles.top as string | undefined),
  }
}
void styleHint
</script>

<template>
  <div
    ref="artboardEl"
    class="design-artboard relative"
    @click="onArtboardClick"
  >
    <slot />

    <div
      v-if="box && selectedNodeId && selectedNodeId !== root.id"
      class="pointer-events-none absolute z-20"
      :style="{
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        outline: '1.5px solid color-mix(in oklab, var(--color-brand, #0f766e) 85%, transparent)',
        outlineOffset: '0',
      }"
    >
      <div
        class="pointer-events-auto absolute inset-0 cursor-move"
        @pointerdown="onPointerDown('move', $event)"
      />
      <div
        v-for="h in handles"
        :key="h"
        class="pointer-events-auto absolute z-30 rounded-sm border border-ink bg-paper"
        :style="handleStyle(h)"
        @pointerdown="onPointerDown(h, $event)"
      />
    </div>
  </div>
</template>
