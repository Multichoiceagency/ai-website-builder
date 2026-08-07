<script setup lang="ts">
/**
 * The state a module is in before its phase ships.
 *
 * It says what the module will do, what it needs, and when — instead of a
 * broken link or, worse, a screen of fake charts. A dashboard that invents
 * numbers to look finished is the fastest way to lose a user's trust in the
 * numbers that *are* real.
 */
withDefaults(
  defineProps<{
    title: string
    phase: number
    summary: string
    capabilities: string[]
    requires?: string[]
  }>(),
  { requires: () => [] },
)
</script>

<template>
  <div>
    <UiPageHeader :title="title" :description="summary">
      <template #actions>
        <UiBadge tone="warning">Phase {{ phase }}</UiBadge>
      </template>
    </UiPageHeader>

    <div class="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <UiCard>
        <h2 class="mb-1 text-heading font-semibold text-ink">What this will do</h2>
        <p class="mb-4 text-[0.8125rem] text-soft">
          Designed and scoped. Not built yet — so nothing here is a placeholder pretending to work.
        </p>

        <ul class="flex flex-col gap-2.5">
          <li v-for="capability in capabilities" :key="capability" class="flex items-start gap-2.5">
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            <span class="text-[0.875rem] leading-relaxed text-ink">{{ capability }}</span>
          </li>
        </ul>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard v-if="requires.length">
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Needs first</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="requirement in requires" :key="requirement" class="text-[0.8125rem] leading-relaxed text-soft">
              • {{ requirement }}
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Available now</h2>
          <p class="mb-3 text-[0.8125rem] leading-relaxed text-soft">
            The website builder, the page editor and publishing are live today.
          </p>
          <UiButton size="sm" variant="primary" to="/onboarding" arrow>Build a website</UiButton>
        </UiCard>
      </div>
    </div>
  </div>
</template>
