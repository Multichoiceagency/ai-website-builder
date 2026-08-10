<script setup lang="ts">
/**
 * Legacy Ambora one-prompt entry — redirected into the website create wizard (AI path).
 */
definePageMeta({ layout: 'default' })

await navigateTo({ path: '/website/new', query: { mode: 'ai' } }, { replace: true })
</script>

<template>
  <div class="px-4 py-10 text-sm text-soft">Opening the website wizard…</div>
</template>
