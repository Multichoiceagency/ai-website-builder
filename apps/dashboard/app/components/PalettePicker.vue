<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PALETTE_STEPS, type Palette } from '@platform/schemas'
import { contrastRatio, generateThemeTokens, nearestStep } from '@platform/theming'

/**
 * Seed colour in, whole palette out.
 *
 * The ramp is shown before it is applied, with the step the seed itself maps
 * to marked — so it is visible that picking `#3b82f6` does not mean every
 * surface becomes `#3b82f6`, it means the palette is built around that hue.
 * The preview updates as the colour input is dragged; nothing is written to
 * the theme until Apply.
 */
const props = defineProps<{ seed: string; palette: Palette | null }>()
const emit = defineEmits<{ apply: [seed: string] }>()

const HEX = /^#[0-9a-fA-F]{6}$/

const draft = ref(props.seed)
watch(
  () => props.seed,
  (value) => {
    draft.value = value
  },
)

const valid = computed(() => HEX.test(draft.value))

/** Recomputed on every keystroke; the whole generation is well under a frame. */
const generated = computed(() => (valid.value ? generateThemeTokens(draft.value.toLowerCase()) : null))

const steps = PALETTE_STEPS

const seedStep = computed(() => (generated.value ? nearestStep(generated.value.palette.brand, draft.value) : null))

const changed = computed(() => valid.value && draft.value.toLowerCase() !== props.seed.toLowerCase())

/**
 * The one number that decides whether this palette is usable: can a label be
 * read on the button it generates.
 */
const buttonRatio = computed(() => {
  if (!generated.value) return null
  const { primary, primaryInk } = generated.value.light
  return Math.round(contrastRatio(primaryInk, primary) * 100) / 100
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end gap-3">
      <UiField v-slot="{ id }" label="Seed colour" help="Everything else is derived from this one hue.">
        <div class="flex items-center gap-2">
          <input
            :id="id"
            v-model="draft"
            type="color"
            class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-raised p-1"
          />
          <UiInput v-model="draft" class="w-32 font-mono" />
        </div>
      </UiField>

      <UiButton variant="primary" :disabled="!changed" @click="emit('apply', draft.toLowerCase())">
        Generate palette
      </UiButton>

      <p v-if="!valid" class="pb-2.5 text-[0.8125rem] text-danger">Enter a colour as #rrggbb.</p>
    </div>

    <template v-if="generated">
      <div>
        <div class="mb-1.5 flex items-baseline justify-between gap-3">
          <h4 class="text-label font-semibold uppercase text-faint">Brand ramp</h4>
          <p class="text-[0.75rem] text-faint">
            Even lightness steps in OKLCH — {{ seedStep }} is where your seed lands.
          </p>
        </div>
        <div class="flex overflow-hidden rounded-lg border border-line">
          <div
            v-for="step in steps"
            :key="step"
            class="relative flex-1"
            :title="`${step} · ${generated.palette.brand[String(step) as '500']}`"
          >
            <div class="h-11" :style="{ backgroundColor: generated.palette.brand[String(step) as '500'] }" />
            <div
              class="border-t border-line py-1 text-center text-[0.625rem] tabular-nums"
              :class="step === seedStep ? 'bg-brand-soft font-semibold text-brand' : 'text-faint'"
            >
              {{ step }}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="mb-1.5 text-label font-semibold uppercase text-faint">Neutral ramp</h4>
        <div class="flex overflow-hidden rounded-lg border border-line">
          <div
            v-for="step in steps"
            :key="step"
            class="h-8 flex-1"
            :style="{ backgroundColor: generated.palette.neutral[String(step) as '500'] }"
            :title="`${step} · ${generated.palette.neutral[String(step) as '500']}`"
          />
        </div>
        <p class="mt-1.5 text-[0.75rem] text-faint">
          Carries a trace of the brand hue, so greys do not read as tinted the opposite way.
        </p>
      </div>

      <!-- Two miniatures side by side: this palette has a dark half, and it is
           not an inversion, so it has to be shown rather than assumed. -->
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="preview in [
            { key: 'light', label: 'Light', tokens: generated.light },
            { key: 'dark', label: 'Dark', tokens: generated.dark },
          ]"
          :key="preview.key"
          class="overflow-hidden rounded-lg border border-line"
        >
          <div class="px-4 py-4" :style="{ backgroundColor: preview.tokens.surface }">
            <p class="text-[0.9375rem] font-semibold" :style="{ color: preview.tokens.text }">
              {{ preview.label }}
            </p>
            <p class="mt-1 text-[0.8125rem]" :style="{ color: preview.tokens.textMuted }">
              Muted supporting copy.
            </p>
            <div class="mt-3 flex flex-col items-stretch gap-2">
              <span
                class="inline-flex justify-center rounded px-3 py-1.5 text-[0.8125rem] font-semibold"
                :style="{ backgroundColor: preview.tokens.primary, color: preview.tokens.primaryInk }"
              >Primary</span>
              <span
                class="inline-flex justify-center rounded px-3 py-1.5 text-[0.8125rem] font-semibold"
                :style="{ backgroundColor: preview.tokens.accent, color: preview.tokens.accentInk }"
              >Accent</span>
              <span
                class="inline-flex justify-center rounded border px-3 py-1.5 text-[0.8125rem] font-semibold"
                :style="{ borderColor: preview.tokens.lineStrong, color: preview.tokens.text }"
              >Outline</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3 text-[0.75rem]">
              <span :style="{ color: preview.tokens.positive }">Saved</span>
              <span :style="{ color: preview.tokens.warning }">Needs review</span>
              <span :style="{ color: preview.tokens.danger }">Failed</span>
            </div>
          </div>
        </div>
      </div>

      <p class="text-[0.8125rem] text-soft">
        Every pair above was contrast-checked while it was generated — the button label sits at
        <strong class="tabular-nums">{{ buttonRatio?.toFixed(2) }}:1</strong> on its fill.
      </p>
    </template>
  </div>
</template>
