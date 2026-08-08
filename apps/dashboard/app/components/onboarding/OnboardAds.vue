<script setup lang="ts">
/**
 * §84 — Ads connect / analyze only (no live campaign mutations).
 */

const emit = defineEmits<{
  continue: []
  skip: []
}>()
</script>

<template>
  <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
    <h2 class="text-heading font-semibold text-ink">Ads (optional)</h2>
    <p class="mt-2 text-[0.8125rem] leading-relaxed text-soft">
      Connect Google Ads or Meta to review performance. We never change a live campaign without your say.
    </p>
    <div class="mt-5 flex flex-wrap gap-2">
      <UiButton to="/growth/google-ads">Google Ads</UiButton>
      <UiButton to="/growth/meta-ads">Meta Ads</UiButton>
      <UiButton variant="primary" @click="emit('continue')">Continue</UiButton>
      <UiButton variant="ghost" @click="emit('skip')">Do this later</UiButton>
    </div>
  </div>
</template>
