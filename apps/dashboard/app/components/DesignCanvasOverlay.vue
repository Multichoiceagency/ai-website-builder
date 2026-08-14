<script setup lang="ts">
/**
 * Design-mode selection chrome: drag move + 8-handle resize over the live artboard.
 * Commits frames via emit; parent owns undo. Keyboard nudge / z-order helpers.
 * Storefront has no overlay.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findLayoutNode, parseLayoutPx, type LayoutNode } from '@platform/schemas'

const props = withDefaults(
  defineProps<{
    root: LayoutNode
    selectedNodeId: string | null
    /** CSS zoom percent (100 = 1×). */
    zoom: number
    disabled?: boolean
    /** Readdy Select to Edit — hover, edit bar, stacked layers. */
    selectToEdit?: boolean
  }>(),
  { selectToEdit: true },
)

const emit = defineEmits<{
  select: [id: string]
  'commit-frame': [
    id: string,
    frame: { left: string; top: string; width: string; height: string },
  ]
  nudge: [id: string, dx: number, dy: number]
  align: [id: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom']
  'bump-z': [id: string, delta: number]
  'select-parent': [id: string]
  'prompt-in-place': [text: string]
  'patch-node': [id: string, patch: Partial<LayoutNode>]
  'delete-node': [id: string]
  'pick-image': [id: string]
}>()

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move'

const artboardEl = ref<HTMLElement | null>(null)
const box = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const hoverBox = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const stackedMenu = ref<{ x: number; y: number } | null>(null)
const stackedLayers = ref<{ id: string; type: string }[]>([])

const scale = computed(() => Math.max(0.1, props.zoom / 100))

const selectedNode = computed(() =>
  props.selectedNodeId ? findLayoutNode(props.root, props.selectedNodeId) : null,
)

const isLocked = computed(
  () => (selectedNode.value?.styles as { locked?: boolean } | undefined)?.locked === true,
)

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
  if (props.disabled || isLocked.value || !props.selectedNodeId || !box.value) return
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

function nodeIdFromEvent(event: MouseEvent): string | null {
  const target = event.target as HTMLElement | null
  const nodeEl = target?.closest?.('[data-node-id]') as HTMLElement | null
  return nodeEl?.getAttribute('data-node-id') ?? null
}

function onArtboardClick(event: MouseEvent) {
  stackedMenu.value = null
  const id = nodeIdFromEvent(event)
  emit('select', id || props.root.id)
}

function onArtboardDblClick(event: MouseEvent) {
  const id = nodeIdFromEvent(event)
  if (!id) return
  emit('select', id)
}

function onArtboardMove(event: MouseEvent) {
  if (!props.selectToEdit || !artboardEl.value) {
    hoverBox.value = null
    return
  }
  const id = nodeIdFromEvent(event)
  if (!id || id === props.selectedNodeId || id === props.root.id) {
    hoverBox.value = null
    return
  }
  hoverBox.value = readNodeBox(id)
}

function onArtboardLeave() {
  hoverBox.value = null
}

function onArtboardContext(event: MouseEvent) {
  if (!props.selectToEdit || !artboardEl.value) return
  event.preventDefault()
  const hits = document
    .elementsFromPoint(event.clientX, event.clientY)
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el) => el.closest('[data-node-id]'))
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
  const seen = new Set<string>()
  const layers: { id: string; type: string }[] = []
  for (const el of hits) {
    const id = el.getAttribute('data-node-id')
    if (!id || seen.has(id) || id === props.root.id) continue
    seen.add(id)
    layers.push({ id, type: el.getAttribute('data-node-type') || 'node' })
  }
  if (!layers.length) {
    stackedMenu.value = null
    stackedLayers.value = []
    return
  }
  const art = artboardEl.value.getBoundingClientRect()
  const s = scale.value
  stackedLayers.value = layers
  stackedMenu.value = {
    x: (event.clientX - art.left) / s,
    y: (event.clientY - art.top) / s,
  }
}

function pickStacked(id: string) {
  stackedMenu.value = null
  emit('select', id)
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function onKeyDown(event: KeyboardEvent) {
  if (props.disabled || !props.selectedNodeId || props.selectedNodeId === props.root.id) return
  if (isTypingTarget(event.target)) return
  if (isLocked.value && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    return
  }

  const id = props.selectedNodeId
  const step = event.shiftKey ? 10 : 1

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    emit('nudge', id, -step, 0)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    emit('nudge', id, step, 0)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    emit('nudge', id, 0, -step)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    emit('nudge', id, 0, step)
  } else if ((event.metaKey || event.ctrlKey) && event.key === ']') {
    event.preventDefault()
    emit('bump-z', id, 1)
  } else if ((event.metaKey || event.ctrlKey) && event.key === '[') {
    event.preventDefault()
    emit('bump-z', id, -1)
  } else if (event.key === 'Escape') {
    stackedMenu.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
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
    :class="selectToEdit ? 'cursor-crosshair' : ''"
    tabindex="0"
    @click="onArtboardClick"
    @dblclick="onArtboardDblClick"
    @pointermove="onArtboardMove"
    @pointerleave="onArtboardLeave"
    @contextmenu="onArtboardContext"
  >
    <slot />

    <div
      v-if="hoverBox && selectToEdit"
      class="pointer-events-none absolute z-10"
      :style="{
        left: `${hoverBox.left}px`,
        top: `${hoverBox.top}px`,
        width: `${hoverBox.width}px`,
        height: `${hoverBox.height}px`,
        outline: '1px dashed color-mix(in oklab, var(--color-brand, #0f766e) 55%, transparent)',
      }"
    />

    <div
      v-if="stackedMenu"
      class="absolute z-40 min-w-[10rem] rounded-lg border border-line bg-paper py-1 shadow-raised"
      :style="{ left: `${stackedMenu.x}px`, top: `${stackedMenu.y}px` }"
    >
      <p class="type-button-10 px-2.5 py-1 text-faint">Stacked layers</p>
      <button
        v-for="layer in stackedLayers"
        :key="layer.id"
        type="button"
        class="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left type-caption-12 text-ink hover:bg-sunken"
        @click="pickStacked(layer.id)"
      >
        <span class="capitalize">{{ layer.type }}</span>
        <span class="truncate text-faint">{{ layer.id.slice(0, 10) }}</span>
      </button>
    </div>

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
        opacity: isLocked ? '0.7' : '1',
      }"
    >
      <div
        v-if="!isLocked"
        class="pointer-events-auto absolute inset-0 cursor-move"
        @pointerdown="onPointerDown('move', $event)"
      />
      <template v-if="!isLocked">
        <div
          v-for="h in handles"
          :key="h"
          class="pointer-events-auto absolute z-30 rounded-sm border border-ink bg-paper"
          :style="handleStyle(h)"
          @pointerdown="onPointerDown(h, $event)"
        />
      </template>
      <div
        v-if="selectToEdit && selectedNode && selectedNodeId"
        class="pointer-events-auto absolute left-0 z-40"
        :style="{ bottom: '100%', marginBottom: '8px' }"
      >
        <LayoutSelectEditBar
          :node="selectedNode"
          :disabled="disabled || isLocked"
          @prompt-in-place="emit('prompt-in-place', $event)"
          @select-parent="emit('select-parent', selectedNodeId)"
          @delete="emit('delete-node', selectedNodeId)"
          @patch="emit('patch-node', selectedNodeId, $event)"
          @pick-image="emit('pick-image', selectedNodeId)"
        />
      </div>
    </div>
  </div>
</template>
