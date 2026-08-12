<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import {
  isLayoutCanvasBlock,
  resolveContentWidthCss,
  resolveContentWidthPx,
  type Section,
  type Theme,
} from '@platform/schemas'
import {
  hasLibraryDrag,
  parseLibraryDrag,
  type LibraryDragPayload,
} from '../utils/library-drag'

/**
 * The editor canvas.
 *
 * It renders the *real* blocks with the *real* theme — the same
 * `<BlockRenderer>` the storefront uses, from the shared Nuxt layer. So this is
 * not a preview approximation: what you see is the page, updating as you type,
 * with no round trip to a preview server.
 *
 * Each section gets a selection overlay rather than a wrapper that changes the
 * layout, so clicking to select never shifts what you are looking at.
 *
 * Sections are rearranged by dragging them directly. That runs on Pointer
 * Events rather than HTML5 drag-and-drop: HTML5 DnD cannot draw a custom drop
 * indicator reliably, and it misbehaves inside a scaled container — which this
 * is, because the frame is zoomable.
 *
 * Library inserts (InsertPanel cards) *do* use HTML5 DnD so they can cross the
 * panel → canvas boundary. Reorder and library-drop share the same insert
 * indicator; they never run at the same time.
 */
/** Keep viewport-fixed blocks (liquid-glass header) inside the canvas frame. */
provide('platformBlockPreview', true)
/** Layout-canvas empty chrome + editor hit targets (not on storefront). */
provide('layoutCanvasEditing', true)

const props = withDefaults(
  defineProps<{
    sections: Section[]
    theme: Theme
    selectedId: string | null
    /** Selected layout-canvas node id (Structure / canvas click). */
    selectedNodeId?: string | null
    device: 'desktop' | 'tablet' | 'mobile'
    zoom: number
    /** Which half of the theme to paint. Falls back to light when there is no dark set. */
    mode?: 'light' | 'dark'
    /** Hides the destructive half of the section toolbar for read-only roles. */
    canWrite?: boolean
    /** An AI proposal is in flight for the selected section. */
    aiBusy?: boolean
    /**
     * Sections whose copy is still being written. They are real, placed and
     * editable; only the words are pending.
     */
    generatingIds?: string[]
    /** Site SEO / business brand logo — header-simple falls back to this. */
    brandLogo?: string
    /** Design mode: hide classic section toolbar (Ask AI / reorder chrome). */
    hideSectionToolbar?: boolean
  }>(),
  {
    mode: 'light',
    canWrite: true,
    aiBusy: false,
    generatingIds: () => [],
    brandLogo: '',
    selectedNodeId: null,
    hideSectionToolbar: false,
  },
)

provide(
  'platformBrandLogo',
  computed(() => props.brandLogo?.trim() ?? ''),
)

const generating = computed(() => new Set(props.generatingIds))

const emit = defineEmits<{
  select: [id: string]
  /** Layout-canvas node under the click (closest [data-node-id]). */
  'select-node': [nodeId: string]
  reorder: [from: number, to: number]
  moveUp: [index: number]
  moveDown: [index: number]
  duplicate: [index: number]
  remove: [index: number]
  askAi: [index: number]
  /** InsertPanel / library card dropped at an insertion index. */
  libraryDrop: [payload: LibraryDragPayload, index: number]
  openInsert: []
}>()

/** Desktop base is wide enough that 1280 / 1440 / 1600 show gutters vs full. */
const DEVICE_WIDTH = { desktop: 1680, tablet: 768, mobile: 390 } as const

const width = computed(() => {
  const base = DEVICE_WIDTH[props.device]
  if (props.device !== 'desktop') return base
  const contentPx = resolveContentWidthPx(props.theme)
  // Grow past the base when a custom measure exceeds it.
  return contentPx ? Math.max(base, contentPx) : base
})

/**
 * Site content measure on the section shell. Motionsites and sections that
 * opt into `maxWidth: full` stay edge-to-edge inside the frame.
 */
function sectionStackStyle(section: Section): Record<string, string> | undefined {
  if (section.block === 'motion-section-01') return undefined
  if (section.style?.maxWidth === 'full') return undefined
  const css = resolveContentWidthCss(props.theme)
  if (css === '100%') return undefined
  return {
    maxWidth: 'var(--site-content-max)',
    marginInline: 'auto',
    width: '100%',
  }
}

const RADIUS: Record<Theme['radius'], string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
}

/**
 * The same custom properties the storefront sets, so blocks look identical.
 *
 * The `??` fallbacks mirror the storefront's exactly — a theme stored before
 * the palette system existed carries `null` for the extended tokens, and the
 * canvas has to paint it the way the published page will.
 */
const themeVars = computed(() => {
  const theme = props.theme
  const dark = props.mode === 'dark' ? theme.dark : null

  const colors = dark
    ? {
        '--site-surface': dark.surface,
        '--site-surface-alt': dark.surfaceAlt,
        '--site-surface-sunken': dark.surfaceSunken,
        '--site-text': dark.text,
        '--site-text-muted': dark.textMuted,
        '--site-line': dark.line,
        '--site-line-strong': dark.lineStrong,
        '--site-primary': dark.primary,
        '--site-primary-hover': dark.primaryHover,
        '--site-primary-ink': dark.primaryInk,
        '--site-accent': dark.accent,
        '--site-accent-ink': dark.accentInk,
        '--site-positive': dark.positive,
        '--site-warning': dark.warning,
        '--site-danger': dark.danger,
        '--site-focus': dark.focus,
      }
    : {
        '--site-surface': theme.colorSurface,
        '--site-surface-alt': theme.colorSurfaceAlt,
        '--site-surface-sunken':
          theme.colorSurfaceSunken ?? `color-mix(in oklab, ${theme.colorText} 5%, ${theme.colorSurface})`,
        '--site-text': theme.colorText,
        '--site-text-muted': theme.colorTextMuted,
        '--site-line': theme.colorLine ?? `color-mix(in oklab, ${theme.colorText} 13%, ${theme.colorSurface})`,
        '--site-line-strong':
          theme.colorLineStrong ?? `color-mix(in oklab, ${theme.colorText} 48%, ${theme.colorSurface})`,
        '--site-primary': theme.colorPrimary,
        '--site-primary-hover':
          theme.colorPrimaryHover ?? `color-mix(in oklab, ${theme.colorPrimary} 86%, #000000)`,
        '--site-primary-ink': theme.colorPrimaryInk ?? '#ffffff',
        '--site-accent': theme.colorAccent,
        '--site-accent-ink': theme.colorAccentInk ?? '#ffffff',
        '--site-positive': theme.colorPositive ?? '#15803d',
        '--site-warning': theme.colorWarning ?? '#b45309',
        '--site-danger': theme.colorDanger ?? '#b91c1c',
        '--site-focus': theme.colorFocus ?? theme.colorPrimary,
      }

  return {
    ...colors,
    '--site-radius': RADIUS[theme.radius],
    '--site-font-heading': `${theme.fontHeading}, ui-sans-serif, system-ui, sans-serif`,
    '--site-font-body': `${theme.fontBody}, ui-sans-serif, system-ui, sans-serif`,
    '--site-primary-fill': theme.gradientPrimary || colors['--site-primary'],
    '--site-surface-fill': theme.gradientSurface || colors['--site-surface'],
    '--site-surface-alt-fill': theme.gradientSurfaceAlt || colors['--site-surface-alt'],
    '--site-content-width': resolveContentWidthCss(theme),
    /** Alias kept for blocks / older CSS that read `--site-content-max`. */
    '--site-content-max': resolveContentWidthCss(theme),
    background: theme.gradientSurface || colors['--site-surface'],
    color: colors['--site-text'],
    fontFamily: `${theme.fontBody}, ui-sans-serif, system-ui, sans-serif`,
  }
})

// --- direct manipulation ----------------------------------------------------

/**
 * Live element per section, so drop targets are computed from
 * `getBoundingClientRect()`.
 *
 * That is not an implementation detail: the frame is scaled with `zoom`, so a
 * section's offset inside the document and its position on screen are different
 * numbers. Rects are already in screen space, which makes hit-testing correct
 * at 50% and at 125% without a single conversion.
 */
const elements = new Map<string, HTMLElement>()

function setElement(id: string, el: unknown) {
  if (el instanceof HTMLElement) elements.set(id, el)
  else elements.delete(id)
}

const root = ref<HTMLElement | null>(null)

const draggingIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
/** Screen-space geometry for the drop indicator, or null while not dragging. */
const indicator = ref<{ top: number; left: number; width: number } | null>(null)

/** A drag ends in a click event the browser still delivers. Ignore that one. */
let suppressClick = false
let pending: { index: number; startX: number; startY: number } | null = null
let pointerY = 0
let scroller: HTMLElement | null = null
let autoScrollFrame = 0

const DRAG_THRESHOLD = 4
const EDGE = 72
const MAX_SCROLL_STEP = 18

function rectFor(index: number): DOMRect | null {
  const section = props.sections[index]
  const element = section ? elements.get(section.id) : null
  return element?.getBoundingClientRect() ?? null
}

/** Where the section would land: an insertion point in `0..sections.length`. */
function computeDropIndex(clientY: number): number {
  let index = 0
  for (let i = 0; i < props.sections.length; i += 1) {
    const rect = rectFor(i)
    if (!rect) continue
    if (clientY > rect.top + rect.height / 2) index = i + 1
  }
  return index
}

function updateIndicator(insertAt: number) {
  if (!props.sections.length) {
    const frameEl = root.value?.querySelector<HTMLElement>('[data-canvas-frame]')
    const frame = frameEl?.getBoundingClientRect()
    if (!frame) {
      indicator.value = null
      return
    }
    const viewport = scroller?.getBoundingClientRect()
    indicator.value = {
      top: viewport ? Math.min(Math.max(frame.top + 48, viewport.top + 1), viewport.bottom - 1) : frame.top + 48,
      left: frame.left + 16,
      width: Math.max(frame.width - 32, 80),
    }
    return
  }

  const frame = rectFor(Math.min(insertAt, props.sections.length - 1))
  if (!frame) {
    indicator.value = null
    return
  }

  const last = rectFor(props.sections.length - 1)
  const top = insertAt >= props.sections.length ? (last?.bottom ?? frame.top) : frame.top

  const viewport = scroller?.getBoundingClientRect()
  indicator.value = {
    top: viewport ? Math.min(Math.max(top, viewport.top + 1), viewport.bottom - 1) : top,
    left: frame.left,
    width: frame.width,
  }
}

// --- library HTML5 drop (InsertPanel cards) ---------------------------------

const libraryDropping = ref(false)

function ensureScroller() {
  scroller = root.value?.closest<HTMLElement>('[data-editor-scroll]') ?? scroller
}

function onLibraryDragOver(event: DragEvent) {
  if (!hasLibraryDrag(event.dataTransfer)) return
  if (draggingIndex.value !== null) return

  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'

  ensureScroller()
  libraryDropping.value = true
  pointerY = event.clientY
  const insertAt = computeDropIndex(event.clientY)
  dropIndex.value = insertAt
  updateIndicator(insertAt)
}

function onLibraryDragLeave(event: DragEvent) {
  if (!libraryDropping.value) return
  const next = event.relatedTarget
  if (next instanceof Node && root.value?.contains(next)) return
  libraryDropping.value = false
  dropIndex.value = null
  indicator.value = null
}

function onLibraryDrop(event: DragEvent) {
  if (!hasLibraryDrag(event.dataTransfer)) return
  event.preventDefault()

  const payload = parseLibraryDrag(event.dataTransfer)
  const insertAt = dropIndex.value ?? computeDropIndex(event.clientY)

  libraryDropping.value = false
  dropIndex.value = null
  indicator.value = null

  if (!payload?.blockIds.length) return
  emit('libraryDrop', payload, insertAt)
}

function autoScroll() {
  autoScrollFrame = requestAnimationFrame(autoScroll)
  if (!scroller || draggingIndex.value === null) return

  const rect = scroller.getBoundingClientRect()
  let delta = 0
  if (pointerY < rect.top + EDGE) delta = -MAX_SCROLL_STEP * ((rect.top + EDGE - pointerY) / EDGE)
  else if (pointerY > rect.bottom - EDGE) delta = MAX_SCROLL_STEP * ((pointerY - rect.bottom + EDGE) / EDGE)
  if (!delta) return

  scroller.scrollTop += delta
  // Rects moved with the scroll, so the drop target has to be re-read.
  const insertAt = computeDropIndex(pointerY)
  dropIndex.value = insertAt
  updateIndicator(insertAt)
}

function beginPointerDrag(index: number, event: PointerEvent) {
  // Secondary buttons open menus; they must not start a drag.
  if (event.button !== 0) return
  // Library HTML5 drop and section reorder never share the indicator.
  libraryDropping.value = false

  pending = { index, startX: event.clientX, startY: event.clientY }
  pointerY = event.clientY
  scroller = root.value?.closest<HTMLElement>('[data-editor-scroll]') ?? null

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('keydown', onDragKeydown)
}

function onPointerMove(event: PointerEvent) {
  pointerY = event.clientY
  if (!pending) return

  if (draggingIndex.value === null) {
    const moved = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)
    if (moved < DRAG_THRESHOLD) return

    draggingIndex.value = pending.index
    document.body.style.userSelect = 'none'
    autoScrollFrame = requestAnimationFrame(autoScroll)
  }

  event.preventDefault()
  const insertAt = computeDropIndex(event.clientY)
  dropIndex.value = insertAt
  updateIndicator(insertAt)
}

function onPointerUp() {
  const from = draggingIndex.value
  const insertAt = dropIndex.value

  if (from !== null && insertAt !== null) {
    // One reorder for the whole gesture, so it is one undo step.
    const to = insertAt > from ? insertAt - 1 : insertAt
    if (to !== from) emit('reorder', from, to)
    suppressClick = true
  }

  cancelDrag()
}

function cancelDrag() {
  pending = null
  draggingIndex.value = null
  dropIndex.value = null
  indicator.value = null
  document.body.style.userSelect = ''
  cancelAnimationFrame(autoScrollFrame)
  autoScrollFrame = 0

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', cancelDrag)
  window.removeEventListener('keydown', onDragKeydown)
}

function onDragKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  cancelDrag()
}

/**
 * Section select still owns the overlay click. For layout-canvas sections,
 * after the section is selected (or was already), hit-test through the
 * transparent overlay to the nearest [data-node-id] and emit select-node.
 */
function onSelect(id: string, event: MouseEvent) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('select', id)

  const section = props.sections.find((s) => s.id === id)
  if (!section || !isLayoutCanvasBlock(section.block)) return

  const overlay = event.currentTarget
  if (!(overlay instanceof HTMLElement)) return

  const prev = overlay.style.pointerEvents
  overlay.style.pointerEvents = 'none'
  const under = document.elementFromPoint(event.clientX, event.clientY)
  overlay.style.pointerEvents = prev

  const nodeEl = under instanceof Element ? under.closest('[data-node-id]') : null
  const nodeId = nodeEl?.getAttribute('data-node-id')
  if (nodeId) emit('select-node', nodeId)
}

/** Outline the selected layout node under the transparent section overlay. */
watch(
  () => [props.selectedId, props.selectedNodeId, props.sections] as const,
  async () => {
    await nextTick()
    root.value?.querySelectorAll('.layout-node-selected').forEach((el) => {
      el.classList.remove('layout-node-selected')
    })
    const nodeId = props.selectedNodeId
    if (!nodeId || !props.selectedId) return
    const section = props.sections.find((s) => s.id === props.selectedId)
    if (!section || !isLayoutCanvasBlock(section.block)) return
    const host = elements.get(section.id)
    const el = host?.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`)
    el?.classList.add('layout-node-selected')
  },
  { flush: 'post' },
)

onBeforeUnmount(cancelDrag)
</script>

<template>
  <div
    ref="root"
    class="flex min-h-full justify-center px-10 py-10"
    @dragover="onLibraryDragOver"
    @dragleave="onLibraryDragLeave"
    @drop="onLibraryDrop"
  >
    <div>
      <!-- Frame label, mirroring the device it represents. -->
      <div class="type-button-10 mb-2 flex items-center gap-2 uppercase tracking-[0.08em] text-faint">
        <span class="capitalize">{{ device }}</span>
        <span class="tabular-nums">{{ width }}</span>
      </div>

      <!-- `zoom` rather than `transform: scale()`: transform leaves the
           element's layout box at full size, so the frame sat off-centre and
           left a gap below it. `zoom` reflows, so centring and height are
           correct at every level. -->
      <div
        data-canvas-frame
        class="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-16px_rgb(0_0_0/0.22)]"
        :class="libraryDropping ? 'ring-2 ring-brand/40' : ''"
        :style="{ width: `${width}px`, zoom: zoom / 100 }"
      >
        <div :style="themeVars">
          <div
            v-for="(section, index) in sections"
            :key="section.id"
            :ref="(el) => setElement(section.id, el)"
            class="relative transition-opacity"
            :class="draggingIndex === index ? 'opacity-40' : ''"
            :style="sectionStackStyle(section)"
            :aria-busy="generating.has(section.id) || undefined"
          >
            <BlockRenderer :sections="[section]" />

            <!-- Generating: real section stays underneath; veil + sheen say
                 work is in flight (copy write or Motionsites build). -->
            <div
              v-if="generating.has(section.id)"
              class="section-generating pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden"
              :class="section.block === 'motion-section-01' ? 'section-generating--motion' : ''"
              :style="
                section.block === 'motion-section-01'
                  ? undefined
                  : { backgroundColor: 'color-mix(in oklab, var(--site-surface) 78%, transparent)' }
              "
            >
              <div
                v-if="section.block === 'motion-section-01'"
                class="motion-gen-stage absolute inset-0"
                aria-hidden="true"
              >
                <span class="motion-gen-orb motion-gen-orb--a" />
                <span class="motion-gen-orb motion-gen-orb--b" />
                <span class="motion-gen-orb motion-gen-orb--c" />
                <span class="motion-gen-scan" />
              </div>
              <span
                class="type-button-12 relative z-[1] inline-flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-soft shadow-float"
                :class="
                  section.block === 'motion-section-01'
                    ? 'border-white/15 bg-black/55 text-white backdrop-blur-md'
                    : 'border-line bg-raised'
                "
                :style="{ zoom: 100 / (zoom || 100) }"
              >
                <span
                  class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent"
                  :class="section.block === 'motion-section-01' ? 'border-white/80' : 'border-brand'"
                  aria-hidden="true"
                />
                <span class="flex flex-col items-start gap-0.5">
                  <span class="font-semibold tracking-wide">
                    {{
                      section.block === 'motion-section-01'
                        ? 'Generating Motionsites…'
                        : 'Writing copy…'
                    }}
                  </span>
                  <span
                    v-if="section.block === 'motion-section-01'"
                    class="text-[0.65rem] font-normal tracking-[0.08em] text-white/55 uppercase"
                  >
                    Building the live section
                  </span>
                </span>
              </span>
            </div>

            <!-- Overlay: hit area plus selection outline, drawn on top so it
                 cannot affect the block's own layout. A real button, so the
                 canvas is reachable by keyboard and not only by mouse. -->
            <button
              type="button"
              class="absolute inset-0 w-full cursor-pointer transition-shadow duration-100"
              :class="
                selectedId === section.id
                  ? 'shadow-[inset_0_0_0_2px_var(--brand)]'
                  : 'hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--brand)_45%,transparent)]'
              "
              :aria-label="`Select ${section.block}`"
              :aria-pressed="selectedId === section.id"
              @pointerdown="beginPointerDrag(index, $event)"
              @click="onSelect(section.id, $event)"
            />

            <SectionToolbar
              v-if="!hideSectionToolbar && selectedId === section.id && draggingIndex === null"
              :index="index"
              :total="sections.length"
              :label="section.block"
              :zoom="zoom"
              :can-write="canWrite"
              :busy="aiBusy"
              @drag-start="beginPointerDrag(index, $event)"
              @move-up="emit('moveUp', index)"
              @move-down="emit('moveDown', index)"
              @duplicate="emit('duplicate', index)"
              @remove="emit('remove', index)"
              @ask-ai="emit('askAi', index)"
            />
          </div>

          <div v-if="!sections.length" class="grid place-items-center px-8 py-32 text-center">
            <div>
              <p class="text-[1.0625rem] font-semibold text-[var(--site-text)]">This page is empty</p>
              <p class="mt-1.5 text-[0.9375rem] text-[var(--site-text-muted)]">
                Add a section to start building this page.
              </p>
              <button
                v-if="canWrite"
                type="button"
                class="mt-5 rounded-lg bg-[var(--site-primary)] px-4 py-2 text-sm font-semibold text-[var(--site-primary-ink,#fff)]"
                @click="emit('openInsert')"
              >
                Add a section
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- The drop indicator is positioned in screen space, outside the zoomed
         frame, so its thickness stays one crisp line at any zoom level. -->
    <Teleport to="body">
      <div
        v-if="indicator"
        class="pointer-events-none fixed z-40 h-0.5 rounded-full bg-brand shadow-[0_0_0_1px_var(--paper)]"
        :style="{ top: `${indicator.top}px`, left: `${indicator.left}px`, width: `${indicator.width}px` }"
        aria-hidden="true"
      >
        <span class="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-brand" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/**
 * A sheen travelling down the section, so "pending" reads as ongoing rather
 * than as stalled. Compositor-only: it moves a gradient's position, nothing
 * that costs layout.
 */
.section-generating::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in oklab, var(--site-primary) 12%, transparent) 45%,
    transparent 90%
  );
  animation: section-sheen 1.6s ease-in-out infinite;
}

.section-generating--motion {
  background: rgb(0 0 0 / 0.72);
}

.section-generating--motion::before {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgb(255 255 255 / 0.08) 45%,
    transparent 90%
  );
}

.motion-gen-stage {
  pointer-events: none;
}

.motion-gen-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(40px);
  opacity: 0.55;
  animation: motion-orb 3.2s ease-in-out infinite;
}

.motion-gen-orb--a {
  left: 12%;
  top: 18%;
  width: 42%;
  height: 36%;
  background: radial-gradient(circle, #e8702a 0%, transparent 70%);
}

.motion-gen-orb--b {
  right: 8%;
  top: 28%;
  width: 38%;
  height: 40%;
  background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
  animation-delay: -1.1s;
}

.motion-gen-orb--c {
  left: 28%;
  bottom: 10%;
  width: 48%;
  height: 34%;
  background: radial-gradient(circle, #0ea5e9 0%, transparent 70%);
  animation-delay: -2s;
}

.motion-gen-scan {
  position: absolute;
  inset-inline: 0;
  height: 28%;
  background: linear-gradient(
    180deg,
    transparent,
    rgb(255 255 255 / 0.12),
    transparent
  );
  animation: motion-scan 2.4s ease-in-out infinite;
}

@keyframes section-sheen {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes motion-orb {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate3d(4%, -6%, 0) scale(1.12);
    opacity: 0.7;
  }
}

@keyframes motion-scan {
  from {
    transform: translateY(-120%);
  }
  to {
    transform: translateY(320%);
  }
}

/* Motion here carries no information the spinner and label do not, so it is
   the first thing to go. */
@media (prefers-reduced-motion: reduce) {
  .section-generating::before,
  .motion-gen-orb,
  .motion-gen-scan {
    animation: none;
  }
}

/* Layout-canvas node selection (class set by watcher on [data-node-id]). */
:deep(.layout-node-selected) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
  position: relative;
  z-index: 20;
  transition: opacity 150ms;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.layout-node-selected) {
    transition: none;
  }
}
</style>
