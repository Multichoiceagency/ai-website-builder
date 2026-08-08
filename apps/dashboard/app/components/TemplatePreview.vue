<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, shallowRef, watch } from 'vue'
import { createSection } from '@platform/blocks'
import { resolveLightTokens, siteColorVariables, siteShapeVariables } from '@platform/theming'
import { sectionMotionSchema, themeSchema, type Section, type Theme } from '@platform/schemas'

/** Fixed-position blocks (e.g. liquid-glass header) must not escape this frame. */
provide('platformBlockPreview', true)

/**
 * A live miniature of what a template actually inserts.
 *
 * The previous version of this card showed the source library's own screenshot,
 * which was a promise the system cannot keep: a template's recipe resolves to
 * *our* registry blocks, so the output is always our design. Showing somebody
 * else's hero and inserting `hero-centered-01` reads as a broken insert — and
 * it was, in the only sense that matters to the person clicking.
 *
 * So the card renders the recipe. Same `<BlockRenderer>` as the canvas and the
 * published site, same theme tokens, scaled down. What you see is what you get,
 * by construction rather than by anyone remembering to re-export a thumbnail.
 *
 * Three things make twenty of these on screen affordable:
 *
 *  - **Mount on intersection, unmount on exit.** A 260-card list would
 *    otherwise hold 260 live pages. The pool stays bounded to what is near the
 *    viewport, and unmount happens off-screen so it is never visible.
 *  - **Motion is forced off.** Entrance animation is not what a thumbnail is
 *    for, and a `viewport`-triggered reveal inside a scaled, cropped frame can
 *    settle *hidden* — the preview would be blank through no fault of the
 *    block. `preset: 'none'` renders every section in its resting state.
 *  - **`zoom`, not `transform: scale()`.** Transform leaves the layout box at
 *    full size; zoom reflows, so the frame crops where it looks like it crops.
 */
/**
 * A shared admission queue for first mounts.
 *
 * Opening the panel puts every visible card into the viewport at once, and
 * mounting them all in one tick pushes the first row's paint behind the last
 * row's render. Releasing a couple per frame means row one appears immediately
 * and the rest fill in behind it — the same total work, ordered so the part the
 * user is looking at lands first.
 */
const mountQueue: (() => void)[] = []
const MOUNTS_PER_FRAME = 2
let draining = false

function drainMountQueue() {
  draining = false
  for (let i = 0; i < MOUNTS_PER_FRAME && mountQueue.length; i += 1) mountQueue.shift()!()
  if (mountQueue.length) scheduleDrain()
}

function scheduleDrain() {
  if (draining) return
  draining = true
  if (typeof requestAnimationFrame === 'undefined') drainMountQueue()
  else requestAnimationFrame(drainMountQueue)
}

function requestMountSlot(mount: () => void) {
  mountQueue.push(mount)
  scheduleDrain()
}

const props = withDefaults(
  defineProps<{
    /** Block ids to render, in order. Already filtered by the caller's ceiling. */
    blockIds: string[]
    /** The site's theme, so the miniature is painted in the customer's colours. */
    theme?: Theme | null
    /** Width the sections are laid out at before scaling down. */
    width?: number
    /** Aspect ratio of the visible crop, as a CSS `aspect-ratio` value. */
    ratio?: string
    /** Render immediately instead of waiting to scroll into view. */
    eager?: boolean
    /**
     * Play the blocks' own entrance motion. Driven by the card's hover state,
     * so only the card under the pointer ever animates.
     */
    play?: boolean
  }>(),
  { theme: null, width: 1200, ratio: '16 / 10', eager: false, play: false },
)

/** A site with no theme yet still gets the platform's own defaults, not blank. */
const DEFAULT_THEME: Theme = themeSchema.parse({})

const theme = computed(() => props.theme ?? DEFAULT_THEME)

/**
 * The same `--site-*` variables the storefront paints with, from the same
 * helper — a preview that derived its own colours would drift the first time a
 * token was added.
 */
const surface = computed(() => resolveLightTokens(theme.value).surface)

const themeVars = computed(() => {
  const tokens = resolveLightTokens(theme.value)
  return {
    ...siteColorVariables(tokens),
    ...siteShapeVariables(theme.value),
    backgroundColor: tokens.surface,
    color: tokens.text,
    fontFamily: `${theme.value.fontBody}, ui-sans-serif, system-ui, sans-serif`,
  }
})

/**
 * The OS setting, read live.
 *
 * The stylesheets already neutralise motion under `prefers-reduced-motion`
 * (`base.css` globally, `motion.css` per preset), so this guard is not what
 * makes the preview safe — it is what stops the panel doing the *work*:
 * without it, hovering would remount a block on every card for an animation
 * the browser has been told not to draw.
 */
const reducedMotion = ref(false)
let motionQuery: MediaQueryList | null = null

function syncReducedMotion(event: MediaQueryList | MediaQueryListEvent) {
  reducedMotion.value = event.matches
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', syncReducedMotion)
}

const animating = computed(() => props.play && !reducedMotion.value)

/**
 * The sections as the registry defines them, built once per recipe.
 *
 * `shallowRef` on purpose: these are handed straight to the renderer and never
 * mutated, so deep reactivity would only cost proxy traffic on every scroll.
 */
const baseSections = shallowRef<Section[]>([])

watch(
  () => props.blockIds,
  (blockIds) => {
    const built: Section[] = []

    for (const blockId of blockIds) {
      try {
        built.push(createSection(blockId))
      } catch {
        // A recipe naming a retired block loses that section, not the preview.
      }
    }

    baseSections.value = built
  },
  { immediate: true },
)

/**
 * At rest the preview is a still: motion off, so every section renders settled.
 * That matters beyond performance — `MotionReveal` holds a section hidden until
 * *its own* viewport intersection, and inside a scaled, cropped frame that can
 * settle hidden, leaving the preview blank.
 *
 * While playing, each section gets back the motion the block itself declares,
 * triggered on load. The panel invents no animation vocabulary of its own: what
 * you see on hover is what the section will do when it lands on the page.
 */
const sections = computed<Section[]>(() =>
  baseSections.value.map((section) => ({
    ...section,
    // Through the schema rather than a spread, so the result is a complete
    // `SectionMotion` whatever the block declared.
    motion: sectionMotionSchema.parse(
      animating.value
        ? { ...section.motion, trigger: 'load' }
        : { ...section.motion, preset: 'none', trigger: 'none' },
    ),
  })),
)

/**
 * `MotionReveal` decides hidden-or-visible once, in `onMounted`. Changing the
 * preset afterwards therefore cannot replay anything — the elements are already
 * at rest. Bumping this key remounts them, which is what makes a second hover
 * play the entrance again.
 */
const replayKey = ref(0)

watch(animating, (isAnimating) => {
  if (isAnimating) replayKey.value += 1
})

// region Mount window

const frame = ref<HTMLElement | null>(null)
const live = ref(props.eager)
/** Whether this preview still wants to be mounted when its turn comes up. */
let wanted = props.eager

let observer: IntersectionObserver | null = null

function observe(element: HTMLElement | null) {
  observer?.disconnect()
  observer = null
  if (!element || props.eager) return

  if (typeof IntersectionObserver === 'undefined') {
    live.value = true
    return
  }

  // Generous margin so a preview is already painted by the time it is on
  // screen, and is only torn down well after it has left.
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        wanted = entry.isIntersecting
        if (!wanted) {
          live.value = false
          continue
        }
        // Queued rather than mounted here: opening the panel intersects every
        // visible card in the same tick, and mounting them together is what
        // would delay the first row.
        requestMountSlot(() => {
          if (wanted) live.value = true
        })
      }
    },
    { rootMargin: '300px 0px' },
  )

  observer.observe(element)
}

watch(frame, (element) => observe(element), { immediate: true })

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// endregion

/**
 * Scale is derived from the frame's own width, so the same component works in
 * a 300px panel card and in a 560px detail dialog without being told which.
 */
const scale = ref(0.24)
let resizeObserver: ResizeObserver | null = null

watch(frame, (element) => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!element || typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(([entry]) => {
    const measured = entry?.contentRect.width ?? 0
    if (measured > 0) scale.value = measured / props.width
  })
  resizeObserver.observe(element)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  motionQuery?.removeEventListener('change', syncReducedMotion)
  motionQuery = null
  wanted = false
})
</script>

<template>
  <!--
    Inert by construction: the miniature is a picture of a page, not a page.
    `aria-hidden` keeps a screen reader out of a duplicate of content that is
    already described in the card's own text, and `pointer-events-none` stops a
    hover state or a tab stop from landing inside it.
  -->
  <div
    ref="frame"
    class="pointer-events-none relative w-full overflow-hidden bg-sunken"
    :style="{ aspectRatio: ratio }"
    aria-hidden="true"
  >
    <div
      v-if="live && sections.length"
      class="absolute left-0 top-0"
      :style="{ width: `${width}px`, zoom: scale, ...themeVars }"
    >
      <BlockRenderer :key="replayKey" :sections="sections" />
    </div>

    <!-- Not yet in view: a quiet placeholder rather than a jump when it fills. -->
    <div v-else-if="!sections.length" class="grid h-full w-full place-items-center">
      <span class="type-caption-12 text-faint">No sections</span>
    </div>

    <!--
      The crop always cuts a page off mid-flow. Fading the bottom edge says so,
      instead of letting a hard line read as the end of the design.
    -->
    <span
      v-if="live && sections.length"
      class="absolute inset-x-0 bottom-0 h-8"
      :style="{ background: `linear-gradient(to bottom, transparent, ${surface})` }"
    />
  </div>
</template>
