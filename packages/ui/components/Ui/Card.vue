<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean; as?: string }>(), { padded: true, as: 'div' })
</script>

<template>
  <component
    :is="as"
    class="rounded-card border border-line bg-raised shadow-card"
    :class="padded ? 'p-5' : ''"
  >
    <slot />
  </component>
</template>
