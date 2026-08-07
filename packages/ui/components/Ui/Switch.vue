<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
defineProps<{ id?: string; label?: string }>()
</script>

<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors duration-150"
    :class="model ? 'bg-brand' : 'bg-sunken'"
    @click="model = !model"
  >
    <span
      class="ml-0.5 inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200"
      :class="model ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>
