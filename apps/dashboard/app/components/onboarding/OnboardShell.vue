<script setup lang="ts">
import type { OnboardingFunnelStep } from '@platform/schemas'

/**
 * Blank-layout chrome for the §80–85 funnel: brand mark, numbered rail,
 * title, and a single primary content slot. One job per step.
 */

const props = withDefaults(
  defineProps<{
    step: OnboardingFunnelStep
    title: string
    description?: string
    error?: string
    /** Steps shown on the rail (early funnel + build). */
    rail?: OnboardingFunnelStep[]
    showBack?: boolean
    showSkip?: boolean
    skipLabel?: string
  }>(),
  {
    description: '',
    error: '',
    rail: () => ['account', 'intent', 'connect', 'scan', 'style', 'generate'] as OnboardingFunnelStep[],
    showBack: false,
    showSkip: false,
    skipLabel: 'Do this later',
  },
)

const emit = defineEmits<{
  back: []
  skip: []
}>()

const RAIL_LABELS: Partial<Record<OnboardingFunnelStep, string>> = {
  account: 'Account',
  intent: 'Intent',
  connect: 'Connect',
  select: 'Business',
  scan: 'Scan',
  style: 'Style',
  generate: 'Build',
  preview: 'Preview',
  domain: 'Domain',
  go_live: 'Go live',
  seo: 'SEO',
  ads: 'Ads',
  commerce: 'Store',
  complete: 'Done',
}

const activeIndex = computed(() => {
  const idx = props.rail.indexOf(props.step)
  if (idx >= 0) return idx
  // Map late build steps onto the closest rail entry.
  if (props.step === 'select' || props.step === 'commerce') {
    const scan = props.rail.indexOf('scan')
    return scan >= 0 ? scan : Math.max(0, props.rail.length - 1)
  }
  if (['preview', 'domain', 'go_live', 'seo', 'ads', 'complete'].includes(props.step)) {
    return Math.max(0, props.rail.length - 1)
  }
  return Math.max(0, props.rail.length - 1)
})
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-10 sm:px-8">
    <header class="mb-8 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-brand" aria-hidden="true" />
        <span class="text-[0.8125rem] font-semibold tracking-[-0.02em] text-ink">MultichoiceCMS</span>
      </div>
      <NuxtLink
        to="/"
        class="text-[0.8125rem] font-medium text-soft no-underline transition-colors hover:text-ink"
      >
        Skip to dashboard
      </NuxtLink>
    </header>

    <nav class="mb-8" aria-label="Onboarding progress">
      <ol class="flex flex-wrap items-center gap-2">
        <li
          v-for="(entry, index) in rail"
          :key="entry"
          class="flex items-center gap-2"
        >
          <span
            class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[0.75rem] font-semibold tabular-nums"
            :class="
              index < activeIndex
                ? 'bg-brand text-white'
                : index === activeIndex
                  ? 'bg-ink text-white'
                  : 'bg-raised text-faint ring-1 ring-line'
            "
            :aria-current="index === activeIndex ? 'step' : undefined"
          >
            {{ index + 1 }}
          </span>
          <span
            class="hidden text-[0.75rem] font-medium sm:inline"
            :class="index === activeIndex ? 'text-ink' : 'text-faint'"
          >
            {{ RAIL_LABELS[entry] ?? entry }}
          </span>
          <span
            v-if="index < rail.length - 1"
            class="mx-1 hidden h-px w-4 bg-line sm:block"
            aria-hidden="true"
          />
        </li>
      </ol>
    </nav>

    <div class="mb-6">
      <h1 class="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2rem]">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 max-w-xl text-sm leading-relaxed text-soft">
        {{ description }}
      </p>
    </div>

    <p
      v-if="error"
      class="mb-5 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="flex-1">
      <slot />
    </div>

    <footer v-if="showBack || showSkip" class="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
      <UiButton v-if="showBack" type="button" variant="secondary" @click="emit('back')">Back</UiButton>
      <span v-else />
      <UiButton v-if="showSkip" type="button" variant="ghost" @click="emit('skip')">
        {{ skipLabel }}
      </UiButton>
    </footer>
  </div>
</template>
