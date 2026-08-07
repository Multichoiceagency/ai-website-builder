<script setup lang="ts">
/**
 * Honest placeholder for master-plan destinations that are not shipped yet.
 * Linked from the sidebar with a “soon” badge — never a dead 404.
 */
const props = defineProps<{
  title: string
  description: string
  phase: number
}>()
</script>

<template>
  <div>
    <UiPageHeader :title="title" :description="description" />
    <UiEmptyState
      :title="`${title} arrives in phase ${phase}`"
      :description="`This screen is on the master plan roadmap. The sidebar link stays so you can see where it will live.`"
    />
  </div>
</template>
