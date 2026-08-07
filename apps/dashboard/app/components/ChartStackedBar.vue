<script setup lang="ts">
import { computed } from 'vue'

/**
 * One destination's outcome, as a single stacked bar.
 *
 * The segments add up to the events we recorded, which is the whole point of
 * the discrepancy view (§26): every event we hold is either accepted by the
 * destination or accounted for by a named reason. There is no remainder, and
 * therefore nothing to guess about.
 */

export interface ChartStackedSegment {
  key: string
  label: string
  value: number
  /** A design token, e.g. `var(--positive)`. Colour carries meaning here. */
  color: string
}

const props = withDefaults(
  defineProps<{
    label: string
    segments: ChartStackedSegment[]
    /** The denominator. Usually the events we recorded in the window. */
    total: number
    format?: (value: number) => string
  }>(),
  { format: (value: number) => String(value) },
)

const denominator = computed(() => Math.max(1, props.total, props.segments.reduce((sum, s) => sum + s.value, 0)))

const drawn = computed(() => {
  let offset = 0
  return props.segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const width = (segment.value / denominator.value) * 100
      const x = offset
      offset += width
      return { ...segment, x, width }
    })
})

/** The bar is decoration; this sentence is what the assistive layer reads. */
const textAlternative = computed(() => {
  const present = props.segments.filter((segment) => segment.value > 0)
  if (!present.length) return `${props.label}: nothing recorded in this window.`
  return `${props.label}, ${props.format(props.total)} events recorded: ${present
    .map((segment) => `${props.format(segment.value)} ${segment.label}`)
    .join(', ')}.`
})
</script>

<template>
  <div>
    <svg
      class="block h-2.5 w-full"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      role="img"
      :aria-label="textAlternative"
    >
      <title>{{ label }}</title>
      <rect x="0" y="0" width="100" height="10" rx="2" fill="var(--paper-sunken)" />
      <rect
        v-for="segment in drawn"
        :key="segment.key"
        :x="segment.x"
        y="0"
        :width="segment.width"
        height="10"
        :fill="segment.color"
      />
    </svg>

    <ul class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
      <li
        v-for="segment in segments"
        :key="segment.key"
        class="flex items-center gap-1.5 text-[0.75rem]"
        :class="segment.value > 0 ? 'text-soft' : 'text-faint'"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-[2px]"
          :style="{ backgroundColor: segment.color, opacity: segment.value > 0 ? 1 : 0.35 }"
          aria-hidden="true"
        />
        <span class="tabular-nums">{{ format(segment.value) }}</span>
        {{ segment.label }}
      </li>
    </ul>
  </div>
</template>
