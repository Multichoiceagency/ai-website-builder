<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'brand' }>(), {
  tone: 'neutral',
})

const TONES = {
  neutral: 'bg-sunken text-soft',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-brand-soft text-brand',
} as const
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-medium whitespace-nowrap"
    :class="TONES[tone]"
  >
    <slot />
  </span>
</template>
