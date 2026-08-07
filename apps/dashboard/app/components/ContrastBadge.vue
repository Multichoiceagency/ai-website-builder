<script setup lang="ts">
import { computed } from 'vue'
import { contrastRatio } from '@platform/theming'

/**
 * The contrast ratio of one foreground/background pair, stated plainly.
 *
 * It shows the number whether it passes or not. A pass is quiet; a failure
 * says what it needed. There is deliberately no way to configure this into a
 * silent state — a token pair that fails is the one thing the theme editor
 * must never let someone save without seeing.
 */
const props = withDefaults(
  defineProps<{
    foreground: string
    background: string
    /** 4.5 for body text, 3 for large text and control boundaries. */
    minimum?: number
    /** Shown before the ratio, e.g. "Muted text". */
    label?: string
    size?: 'sm' | 'md'
  }>(),
  { minimum: 4.5, label: '', size: 'md' },
)

const HEX = /^#[0-9a-fA-F]{6}$/
const usable = computed(() => HEX.test(props.foreground) && HEX.test(props.background))

const ratio = computed(() =>
  usable.value ? Math.round(contrastRatio(props.foreground, props.background) * 100) / 100 : null,
)
const passes = computed(() => ratio.value !== null && ratio.value >= props.minimum)

const description = computed(() => {
  if (ratio.value === null) return 'Contrast cannot be measured until both colours are valid.'
  const subject = props.label || 'This pair'
  return passes.value
    ? `${subject}: ${ratio.value.toFixed(2)} to 1, clears the ${props.minimum} to 1 minimum.`
    : `${subject}: ${ratio.value.toFixed(2)} to 1, below the ${props.minimum} to 1 minimum.`
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium whitespace-nowrap tabular-nums"
    :class="[
      size === 'sm' ? 'text-[0.6875rem]' : 'text-[0.75rem]',
      passes ? 'border-transparent bg-positive-soft text-positive' : 'border-danger/30 bg-danger-soft text-danger',
    ]"
    :title="description"
  >
    <!-- A swatch of the actual pair. The number says it; the swatch shows it. -->
    <span
      class="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[0.5625rem] font-bold"
      :style="{ backgroundColor: background, color: foreground }"
      aria-hidden="true"
    >Aa</span>

    <span v-if="label" class="font-normal opacity-80">{{ label }}</span>

    <template v-if="ratio !== null">
      <span>{{ ratio.toFixed(2) }}:1</span>
      <span v-if="!passes" class="opacity-80">· needs {{ minimum }}</span>
    </template>
    <span v-else>—</span>

    <span class="sr-only">{{ description }}</span>
  </span>
</template>
