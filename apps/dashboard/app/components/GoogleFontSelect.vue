<script setup lang="ts">
import { computed, watch } from 'vue'
import { ensureGoogleFont, GOOGLE_FONT_OPTIONS } from '../composables/useGoogleFont'

/**
 * Heading/body font control backed by a curated Google Fonts list.
 *
 * Selecting a face loads it into the document immediately so the theme preview
 * (and any Peek type specimens) update without a reload.
 */
const model = defineModel<string>({ default: 'Figtree' })

withDefaults(
  defineProps<{
    id?: string
    describedBy?: string
    disabled?: boolean
  }>(),
  { id: undefined, describedBy: undefined, disabled: false },
)

const options = computed(() => {
  const known = new Set(GOOGLE_FONT_OPTIONS.map((entry) => entry.value))
  if (model.value && !known.has(model.value as (typeof GOOGLE_FONT_OPTIONS)[number]['value'])) {
    return [{ label: model.value, value: model.value }, ...GOOGLE_FONT_OPTIONS]
  }
  return [...GOOGLE_FONT_OPTIONS]
})

watch(
  model,
  (family) => {
    if (family) ensureGoogleFont(family)
  },
  { immediate: true },
)

const sampleStyle = computed(() => ({
  fontFamily: `"${model.value}", ui-sans-serif, system-ui, sans-serif`,
}))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <UiSelect
      :id="id"
      v-model="model"
      :options="options"
      :described-by="describedBy"
      :disabled="disabled"
    />
    <p class="truncate text-[0.9375rem] text-ink" :style="sampleStyle" aria-hidden="true">
      The quick brown fox — Aa 123
    </p>
  </div>
</template>
