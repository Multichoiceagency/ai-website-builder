<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; back?: string; backLabel?: string }>(), {
  description: '', back: '', backLabel: 'Terug',
})
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4 pb-6">
    <div class="min-w-0">
      <NuxtLink
        v-if="back"
        :to="back"
        class="mb-1.5 inline-flex items-center gap-1 text-[0.8125rem] text-soft no-underline transition-colors hover:text-ink"
      >
        <span aria-hidden="true">&larr;</span> {{ backLabel }}
      </NuxtLink>
      <h1 class="truncate text-title font-semibold text-ink">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-sm text-soft">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
