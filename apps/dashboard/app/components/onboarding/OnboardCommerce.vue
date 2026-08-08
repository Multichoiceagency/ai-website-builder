<script setup lang="ts">
/**
 * §85 — Commerce branch for Store / Both intents.
 * Product import and “create with AI” deep-link into existing commerce UI (stub actions).
 */

const emit = defineEmits<{
  continue: []
  skip: []
}>()
</script>

<template>
  <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
    <h2 class="text-heading font-semibold text-ink">Set up your store</h2>
    <p class="mt-2 text-[0.8125rem] leading-relaxed text-soft">
      Import products or create them with AI. Payments and shipping can wait until after go-live.
    </p>
    <div class="mt-5 flex flex-wrap gap-2">
      <UiButton variant="primary" to="/commerce/products/new" arrow>Create with AI</UiButton>
      <UiButton to="/commerce/settings">Commerce settings</UiButton>
      <UiButton to="/commerce/products">Import / manage products</UiButton>
      <UiButton @click="emit('continue')">Continue</UiButton>
      <UiButton variant="ghost" @click="emit('skip')">Do this later</UiButton>
    </div>
  </div>
</template>
