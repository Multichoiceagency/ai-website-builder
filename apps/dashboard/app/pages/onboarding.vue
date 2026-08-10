<script setup lang="ts">
/**
 * Legacy signup funnel — create now lives in /website/new (simple AI wizard).
 * Keep this file so old bookmarks do not 404; always send people to the easy path.
 */
await navigateTo({ path: '/website/new', query: { mode: 'ai' } }, { replace: true })
</script>

<template>
  <div class="grid min-h-[40vh] place-items-center text-[1rem] text-soft">
    Opening the website builder…
  </div>
</template>
