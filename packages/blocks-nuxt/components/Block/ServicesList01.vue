<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    heading?: string
    intro?: string
    items?: { title: string; description: string; href: string; linkLabel: string }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { eyebrow: '', heading: '', intro: '', items: () => [], headingLevel: 'h2' },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <p v-if="eyebrow" class="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">
        {{ eyebrow }}
      </p>
      <component
        v-if="heading"
        :is="headingLevel"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ heading }}
      </component>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ul class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="item in items"
        :key="item.title"
        class="group flex flex-col rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-surface)] p-7 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.25)]"
      >
        <h3 class="text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]">{{ item.title }}</h3>
        <p class="mt-2.5 grow text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ item.description }}</p>
        <a
          v-if="item.href"
          :href="item.href"
          class="mt-5 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[var(--site-primary)] no-underline"
        >
          {{ item.linkLabel }}
          <span class="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
        </a>
      </li>
    </ul>
  </div>
</template>
