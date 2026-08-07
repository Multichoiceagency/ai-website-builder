<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string | number; hint?: string }>(), { hint: '' })
</script>

<template>
  <div class="rounded-card border border-line bg-raised px-5 py-4">
    <p class="text-label font-semibold uppercase text-faint">{{ label }}</p>
    <p class="mt-2 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">
      {{ value }}
    </p>
    <p v-if="hint" class="mt-1.5 text-[0.8125rem] text-soft">{{ hint }}</p>
  </div>
</template>
