<script setup lang="ts">
/**
 * §83 — connect Search Console / Analytics / GBP (connect only).
 */

const emit = defineEmits<{
  continue: []
  skip: []
}>()
</script>

<template>
  <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
    <h2 class="text-heading font-semibold text-ink">SEO connections</h2>
    <p class="mt-2 text-[0.8125rem] leading-relaxed text-soft">
      Confirm search basics and connect Google tools when you are ready. You can skip and do this later.
    </p>
    <ul class="mt-4 flex flex-col gap-1.5">
      <li class="text-[0.8125rem] text-soft">• Titles and meta descriptions on every page</li>
      <li class="text-[0.8125rem] text-soft">• Sitemap and crawlability</li>
      <li class="text-[0.8125rem] text-soft">• Search Console, Analytics and Business Profile</li>
    </ul>
    <div class="mt-5 flex flex-wrap gap-2">
      <UiButton variant="primary" to="/growth/seo" arrow>Open SEO</UiButton>
      <UiButton to="/growth/google-business">Google Business</UiButton>
      <UiButton to="/settings/integrations">Integrations</UiButton>
      <UiButton @click="emit('continue')">Continue</UiButton>
      <UiButton variant="ghost" @click="emit('skip')">Do this later</UiButton>
    </div>
  </div>
</template>
