<script setup lang="ts">
withDefaults(
  defineProps<{
    heading?: string
    body?: string
    image?: string
    imageAlt?: string
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', body: '', image: '', imageAlt: '', headingLevel: 'h2' },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
    <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <MotionReveal as="div" :motion="{ preset: 'slide-right', trigger: 'viewport', once: true }">
        <component
          :is="headingLevel"
          class="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ heading }}</component>
        <p v-if="body" class="mt-5 text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]">{{ body }}</p>
      </MotionReveal>

      <MotionReveal as="div" :motion="{ preset: 'scale-in', trigger: 'viewport', once: true }">
        <div class="aspect-[4/5] overflow-hidden rounded-[calc(var(--site-radius)*2.5)] bg-[var(--site-surface-alt)] shadow-[0_30px_70px_-30px_rgb(0_0_0/0.35)]">
          <img
            v-if="image" :src="image" :alt="imageAlt"
            class="h-full w-full object-cover" width="800" height="1000" loading="lazy"
          />
          <div
            v-else
            class="h-full w-full bg-[radial-gradient(90%_70%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-25"
            aria-hidden="true"
          />
        </div>
      </MotionReveal>
    </div>
  </div>
</template>
