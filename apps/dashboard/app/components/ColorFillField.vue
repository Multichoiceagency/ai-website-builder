<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * One theme colour: solid hex, or a two-stop linear gradient.
 *
 * Stacked vertically on purpose — Primary / Background / Surface each get a
 * full row so they can be tuned independently (including gradient mode).
 */
const hex = defineModel<string>('hex', { required: true })
const gradient = defineModel<string | null>('gradient', { default: null })

const props = defineProps<{
  label: string
  id?: string
}>()

const HEX = /^#[0-9a-fA-F]{6}$/

const useGradient = ref(Boolean(gradient.value))

watch(gradient, (value) => {
  if (value) useGradient.value = true
})

watch(useGradient, (on) => {
  if (!on) {
    gradient.value = null
    return
  }
  if (!gradient.value) {
    const mid = shade(hex.value, -12)
    gradient.value = `linear-gradient(135deg, ${hex.value} 0%, ${mid} 100%)`
  }
})

const stopA = ref(hex.value)
const stopB = ref(shade(hex.value, -12))

watch(
  () => gradient.value,
  (value) => {
    const parsed = parseStops(value)
    if (parsed) {
      stopA.value = parsed[0]!
      stopB.value = parsed[1]!
    }
  },
  { immediate: true },
)

watch([stopA, stopB, useGradient], () => {
  if (!useGradient.value) return
  if (!HEX.test(stopA.value) || !HEX.test(stopB.value)) return
  gradient.value = `linear-gradient(135deg, ${stopA.value} 0%, ${stopB.value} 100%)`
})

const preview = computed(() =>
  useGradient.value && gradient.value ? { backgroundImage: gradient.value } : { backgroundColor: hex.value },
)

function shade(input: string, amount: number): string {
  if (!HEX.test(input)) return '#000000'
  const n = Number.parseInt(input.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amount))
  const b = Math.min(255, Math.max(0, (n & 255) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function parseStops(value: string | null | undefined): [string, string] | null {
  if (!value) return null
  const matches = value.match(/#[0-9a-fA-F]{6}/g)
  if (!matches || matches.length < 2) return null
  return [matches[0]!, matches[1]!]
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-line bg-raised px-3 py-3">
    <div class="flex items-center justify-between gap-3">
      <p class="type-small-body text-ink">{{ label }}</p>
      <span class="h-8 w-8 shrink-0 rounded-full border border-line" :style="preview" aria-hidden="true" />
    </div>

    <label class="flex items-center gap-2 text-[0.75rem] text-soft">
      <input v-model="useGradient" type="checkbox" class="h-4 w-4 accent-brand" />
      Gradient
    </label>

    <div v-if="!useGradient" class="flex items-center gap-2">
      <input
        :id="id"
        v-model="hex"
        type="color"
        class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-raised p-1"
      />
      <UiInput v-model="hex" class="font-mono" />
    </div>

    <div v-else class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <input v-model="stopA" type="color" class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-raised p-1" />
        <UiInput v-model="stopA" class="font-mono" :aria-label="`${label} gradient start`" />
      </div>
      <div class="flex items-center gap-2">
        <input v-model="stopB" type="color" class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-raised p-1" />
        <UiInput v-model="stopB" class="font-mono" :aria-label="`${label} gradient end`" />
      </div>
      <p class="text-[0.6875rem] text-faint">Solid {{ label.toLowerCase() }} still uses the first stop for contrast checks.</p>
    </div>
  </div>
</template>
