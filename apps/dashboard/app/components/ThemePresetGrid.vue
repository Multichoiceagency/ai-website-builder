<script setup lang="ts">
import { computed } from 'vue'
import { THEME_PRESETS, toSiteTokens } from '@platform/theming'
import type { ThemePreset } from '@platform/schemas'

/**
 * The preset picker: 21 shadcn base themes, each shown as what it actually
 * produces rather than as a name and a dot.
 *
 * Every card is a miniature of the real thing — a heading, a line of muted
 * copy, a filled button using the theme's own on-primary ink — painted in the
 * mode currently being edited. Choosing a theme from a swatch is choosing
 * blind; this is the same decision made with the evidence in front of you.
 */
const props = withDefaults(
  defineProps<{ selected: string | null; mode?: 'light' | 'dark' }>(),
  { mode: 'light' },
)

const emit = defineEmits<{ select: [id: string] }>()

interface Card {
  preset: ThemePreset
  surface: string
  surfaceAlt: string
  text: string
  textMuted: string
  primary: string
  primaryInk: string
  accent: string
  line: string
}

const cards = computed<Card[]>(() =>
  THEME_PRESETS.map((preset) => {
    const tokens = toSiteTokens(preset, props.mode)
    return {
      preset,
      surface: tokens.surface,
      surfaceAlt: tokens.surfaceAlt,
      text: tokens.text,
      textMuted: tokens.textMuted,
      primary: tokens.primary,
      primaryInk: tokens.primaryInk,
      accent: tokens.accent,
      line: tokens.line,
    }
  }),
)

const neutrals = computed(() => cards.value.filter((card) => card.preset.family === 'neutral'))
const colours = computed(() => cards.value.filter((card) => card.preset.family === 'colour'))
</script>

<template>
  <div class="flex flex-col gap-6">
    <section v-for="group in [
      { key: 'neutral', title: 'Neutral', hint: 'Greyscale, with the near-black end as the primary.', items: neutrals },
      { key: 'colour', title: 'Colour', hint: 'Zinc neutrals with a coloured primary.', items: colours },
    ]" :key="group.key">
      <div class="mb-2.5 flex items-baseline gap-2">
        <h3 class="text-label font-semibold uppercase text-faint">{{ group.title }}</h3>
        <p class="text-[0.75rem] text-faint">{{ group.hint }}</p>
      </div>

      <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="card in group.items"
          :key="card.preset.id"
          type="button"
          class="group relative overflow-hidden rounded-card border text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px"
          :class="
            selected === card.preset.id
              ? 'border-brand shadow-raised ring-1 ring-brand'
              : 'border-line hover:border-line-strong hover:shadow-card'
          "
          :aria-pressed="selected === card.preset.id"
          @click="emit('select', card.preset.id)"
        >
          <!-- The miniature. Real tokens, real ink, no approximation. -->
          <div class="px-3.5 pb-3.5 pt-3" :style="{ backgroundColor: card.surface }">
            <p class="text-[0.8125rem] font-semibold leading-tight" :style="{ color: card.text }">
              Headline sample
            </p>
            <p class="mt-1 text-[0.6875rem] leading-snug" :style="{ color: card.textMuted }">
              Supporting copy in muted text.
            </p>

            <div class="mt-2.5 flex flex-col items-stretch gap-1.5">
              <span
                class="inline-flex justify-center rounded px-2 py-1.5 text-[0.6875rem] font-semibold"
                :style="{ backgroundColor: card.primary, color: card.primaryInk }"
              >
                Get a quote
              </span>
              <span
                class="inline-flex justify-center rounded border px-2 py-1.5 text-[0.6875rem] font-semibold"
                :style="{ borderColor: card.line, color: card.text }"
              >
                Learn more
              </span>
            </div>
          </div>

          <div
            class="flex items-center justify-between gap-2 border-t px-3.5 py-2"
            :style="{ backgroundColor: card.surfaceAlt, borderColor: card.line }"
          >
            <span class="text-[0.75rem] font-medium" :style="{ color: card.text }">
              {{ card.preset.label }}
            </span>
            <span class="flex gap-1" aria-hidden="true">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: card.primary }" />
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: card.accent }" />
            </span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>
