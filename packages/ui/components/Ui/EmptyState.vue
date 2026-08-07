<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string }>(), { description: '' })
</script>

<template>
  <div class="rounded-card border border-dashed border-line-strong bg-sunken/40 px-6 py-14 text-center">
    <div v-if="$slots.icon" class="mb-3 flex justify-center text-faint">
      <slot name="icon" />
    </div>
    <h2 class="text-[0.9375rem] font-semibold text-ink">{{ title }}</h2>
    <p v-if="description" class="mx-auto mt-1.5 max-w-sm text-sm text-soft">{{ description }}</p>
    <div v-if="$slots.default" class="mt-6 flex justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
