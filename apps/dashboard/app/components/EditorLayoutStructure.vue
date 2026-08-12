<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Box,
  ChevronDown,
  ChevronUp,
  Copy,
  Image,
  Plus,
  Square,
  Trash2,
  Type,
} from '@lucide/vue'
import {
  findLayoutNode,
  findLayoutNodeParent,
  walkLayoutNodes,
  type LayoutNode,
  type LayoutNodeType,
} from '@platform/schemas'

/**
 * Freeform layout-canvas Structure tree (Layers → Structure).
 *
 * Emits intent only — the page owns the document and undo. Walk order is
 * depth-first via `walkLayoutNodes`; keyboard arrows move selection along
 * that same flattened list.
 */
const props = withDefaults(
  defineProps<{
    root: LayoutNode
    selectedNodeId: string | null
    canWrite: boolean
    layersLabel?: string
  }>(),
  { layersLabel: 'Structure' },
)

const emit = defineEmits<{
  'select-node': [id: string]
  'add-child': [parentId: string, type: LayoutNodeType]
  duplicate: [id: string]
  remove: [id: string]
  move: [id: string, delta: -1 | 1]
}>()

const ADD_TYPES: { type: LayoutNodeType; label: string; icon: typeof Box }[] = [
  { type: 'container', label: 'Frame', icon: Box },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'button', label: 'Button', icon: Square },
]

const ICON_FOR: Record<LayoutNodeType, typeof Box> = {
  container: Box,
  text: Type,
  image: Image,
  button: Square,
}

const ICON_STROKE = 1.75

const ACTION_BTN =
  'grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-faint transition-colors duration-150 hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:cursor-default disabled:opacity-25'

interface FlatRow {
  node: LayoutNode
  /** 1-based depth for aria-level (root = 1). */
  level: number
  siblingIndex: number
  siblingCount: number
  isRoot: boolean
}

const rows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  walkLayoutNodes(props.root, (node, path) => {
    const isRoot = node.id === props.root.id
    const parent = isRoot ? null : findLayoutNodeParent(props.root, node.id)
    const siblingCount = parent ? (parent.parent.children?.length ?? 0) : 1
    const siblingIndex = parent ? parent.index : 0
    out.push({
      node,
      level: path.length,
      siblingIndex,
      siblingCount,
      isRoot,
    })
  })
  return out
})

const selectedRow = computed(() =>
  rows.value.find((row) => row.node.id === props.selectedNodeId) ?? null,
)

const canAddChild = computed(
  () =>
    props.canWrite &&
    selectedRow.value !== null &&
    selectedRow.value.node.type === 'container',
)

const addMenuOpen = ref(false)
const addTriggerEl = ref<HTMLElement | null>(null)
const addMenuEl = ref<HTMLElement | null>(null)

watch(
  () => props.selectedNodeId,
  () => {
    addMenuOpen.value = false
  },
)

function typeLabel(type: LayoutNodeType): string {
  if (type === 'container') return 'Frame'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function truncate(value: string, max = 28): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

function previewFor(node: LayoutNode): string {
  if (node.type === 'text') return truncate(node.content ?? '')
  if (node.type === 'button') return truncate(node.label ?? '')
  if (node.type === 'image') return truncate(node.alt ?? '')
  return ''
}

function rowLabel(node: LayoutNode): string {
  const preview = previewFor(node)
  return preview ? `${typeLabel(node.type)} · ${preview}` : typeLabel(node.type)
}

function select(id: string) {
  emit('select-node', id)
}

function onTreeKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const list = rows.value
  if (!list.length) return
  event.preventDefault()
  const current = props.selectedNodeId
    ? list.findIndex((row) => row.node.id === props.selectedNodeId)
    : -1
  let next = current
  if (event.key === 'ArrowDown') {
    next = current < 0 ? 0 : Math.min(list.length - 1, current + 1)
  } else {
    next = current < 0 ? list.length - 1 : Math.max(0, current - 1)
  }
  const target = list[next]
  if (target) emit('select-node', target.node.id)
}

function toggleAddMenu() {
  if (!canAddChild.value) return
  addMenuOpen.value = !addMenuOpen.value
}

function addChild(type: LayoutNodeType) {
  const id = props.selectedNodeId
  if (!id || !canAddChild.value) return
  const node = findLayoutNode(props.root, id)
  if (!node || node.type !== 'container') return
  addMenuOpen.value = false
  emit('add-child', id, type)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!addMenuOpen.value) return
  const target = event.target as Node | null
  if (addMenuEl.value?.contains(target) || addTriggerEl.value?.contains(target)) return
  addMenuOpen.value = false
}

watch(addMenuOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex shrink-0 items-center justify-between px-3 py-2">
      <span class="type-button-10 uppercase tracking-[0.08em] text-faint">{{ layersLabel }}</span>
    </div>

    <ul
      role="tree"
      tabindex="0"
      aria-label="Layout structure"
      class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3 focus-visible:outline-none"
      @keydown="onTreeKeydown"
    >
      <li
        v-for="row in rows"
        :key="row.node.id"
        role="treeitem"
        :aria-selected="row.node.id === selectedNodeId"
        :aria-level="row.level"
        class="rounded-md"
      >
        <div
          class="group flex flex-col rounded-md py-0.5 pr-1 transition-colors duration-150"
          :class="
            row.node.id === selectedNodeId
              ? 'bg-brand-soft text-brand'
              : 'text-ink hover:bg-sunken'
          "
          :style="{ paddingLeft: `${(row.level - 1) * 12 + 6}px` }"
        >
          <div class="flex min-w-0 items-center gap-0.5">
            <button
              type="button"
              class="type-button-12 flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 truncate rounded px-0.5 py-1 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              :class="row.node.id === selectedNodeId ? 'text-brand' : 'text-ink'"
              @click="select(row.node.id)"
            >
              <component
                :is="ICON_FOR[row.node.type]"
                class="h-3.5 w-3.5 shrink-0 opacity-70"
                :stroke-width="ICON_STROKE"
                aria-hidden="true"
              />
              <span class="truncate">{{ rowLabel(row.node) }}</span>
            </button>
          </div>

          <div
            v-if="canWrite && row.node.id === selectedNodeId"
            class="relative flex flex-wrap items-center gap-0.5 px-0.5 pb-1"
          >
            <button
              v-if="canAddChild"
              ref="addTriggerEl"
              type="button"
              :class="ACTION_BTN"
              :aria-expanded="addMenuOpen"
              aria-haspopup="menu"
              aria-label="Add child"
              title="Add child"
              @click.stop="toggleAddMenu"
            >
              <Plus class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
            </button>

            <div
              v-if="addMenuOpen && canAddChild"
              ref="addMenuEl"
              role="menu"
              aria-label="Add child type"
              class="absolute left-0 top-full z-20 mt-1 min-w-[9.5rem] rounded-md border border-line bg-raised py-1 shadow-float"
            >
              <button
                v-for="entry in ADD_TYPES"
                :key="entry.type"
                type="button"
                role="menuitem"
                class="type-button-12 flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-ink transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                @click.stop="addChild(entry.type)"
              >
                <component
                  :is="entry.icon"
                  class="h-3.5 w-3.5 shrink-0 text-faint"
                  :stroke-width="ICON_STROKE"
                  aria-hidden="true"
                />
                {{ entry.label }}
              </button>
            </div>

            <button
              type="button"
              :class="ACTION_BTN"
              :disabled="row.isRoot || row.siblingIndex === 0"
              aria-label="Move up"
              title="Move up"
              @click.stop="emit('move', row.node.id, -1)"
            >
              <ChevronUp class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
            </button>
            <button
              type="button"
              :class="ACTION_BTN"
              :disabled="row.isRoot || row.siblingIndex >= row.siblingCount - 1"
              aria-label="Move down"
              title="Move down"
              @click.stop="emit('move', row.node.id, 1)"
            >
              <ChevronDown class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
            </button>
            <button
              type="button"
              :class="ACTION_BTN"
              :disabled="row.isRoot"
              aria-label="Duplicate"
              title="Duplicate"
              @click.stop="emit('duplicate', row.node.id)"
            >
              <Copy class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
            </button>
            <button
              type="button"
              :class="[ACTION_BTN, 'hover:text-danger']"
              :disabled="row.isRoot"
              aria-label="Delete"
              title="Delete"
              @click.stop="emit('remove', row.node.id)"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
