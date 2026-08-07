<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { createSection } from '@platform/blocks'
import { resolveLightTokens, siteColorVariables, siteShapeVariables } from '@platform/theming'
import { sectionMotionSchema, themeSchema, type Section, type Theme } from '@platform/schemas'

/**
 * Fullscreen live preview for the insert panel.
 *
 * One composition: the section fills the viewport; chrome stays thin. Actions
 * live once in the header — a second CTA stack in a sidebar only competed with
 * the preview and left a tall empty column beside the render.
 *
 * Entrance motion plays once on open (`trigger: 'load'`), then the settled
 * design stays visible — judging layout matters more than looping animation.
 */
const props = defineProps<{
  title: string
  description?: string
  blockIds: string[]
  theme?: Theme | null
  performanceLabel?: string
  metaLines?: string[]
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  insert: []
  duplicate: []
}>()

const DEFAULT_THEME: Theme = themeSchema.parse({})
const theme = computed(() => props.theme ?? DEFAULT_THEME)

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

onBeforeUnmount(() => {
  motionQuery?.removeEventListener('change', syncReducedMotion)
})

/** Remount when the dialog opens so MotionReveal can play the entrance again. */
const replayKey = ref(0)

const sections = computed<Section[]>(() =>
  props.blockIds.flatMap((blockId) => {
    try {
      const section = createSection(blockId)
      const play = open.value && !reducedMotion.value
      return [
        {
          ...section,
          motion: sectionMotionSchema.parse(
            play
              ? { ...section.motion, trigger: section.motion?.preset === 'none' ? 'none' : 'load' }
              : { ...section.motion, preset: 'none', trigger: 'none' },
          ),
        },
      ]
    } catch {
      return []
    }
  }),
)

const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(): HTMLElement[] {
  return panel.value ? [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    open.value = false
    return
  }

  if (event.key !== 'Tab' || !panel.value) return

  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    return
  }

  const first = elements[0]!
  const last = elements[elements.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown, true)
    replayKey.value += 1
    await nextTick()
    ;(focusableElements()[0] ?? panel.value)?.focus()
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown, true)
    previouslyFocused?.focus()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-canvas outline-none"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="`Live preview: ${title}`"
    >
      <!-- Single chrome row — actions appear once -->
      <header
        class="relative z-20 flex shrink-0 items-center gap-3 border-b border-line bg-raised/95 px-3 py-2.5 backdrop-blur-md sm:px-5"
      >
        <button
          type="button"
          class="-ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Close preview"
          @click="open = false"
        >&times;</button>

        <div class="min-w-0 flex-1">
          <p class="type-button truncate text-ink">{{ title }}</p>
          <p class="truncate type-caption-12 text-faint">
            <span v-if="performanceLabel">{{ performanceLabel }}</span>
            <span v-if="performanceLabel && description"> · </span>
            <span v-if="description">{{ description }}</span>
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <UiButton size="sm" variant="ghost" @click="emit('duplicate')">Duplicate</UiButton>
          <UiButton size="sm" variant="primary" @click="emit('insert')">Add section</UiButton>
        </div>
      </header>

      <!-- Preview owns the viewport -->
      <div class="relative min-h-0 flex-1 overflow-y-auto overscroll-contain" :style="themeVars">
        <BlockRenderer v-if="sections.length" :key="replayKey" :sections="sections" />
        <div v-else class="grid h-full min-h-64 place-items-center type-caption-12 text-faint">
          Nothing to preview.
        </div>
      </div>

      <!-- Compact meta strip — no second CTA stack, no tall empty rail -->
      <footer
        v-if="metaLines?.length"
        class="shrink-0 border-t border-line bg-raised/95 px-3 py-2.5 backdrop-blur-md sm:px-5"
      >
        <ul class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <li
            v-for="line in metaLines"
            :key="line"
            class="type-caption-12 text-faint"
          >{{ line }}</li>
          <li class="type-caption-12 text-faint/80">
            Theme live · motion plays once
          </li>
        </ul>
      </footer>
      <footer
        v-else
        class="shrink-0 border-t border-line bg-raised/90 px-3 py-2 type-caption-12 text-faint sm:px-5"
      >
        Live preview in this site's theme — entrance motion plays once.
      </footer>
    </div>
  </Teleport>
</template>
