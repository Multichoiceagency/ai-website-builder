<script setup lang="ts">
interface Article {
  title: string
  excerpt: string
  category: string
  date: string
  readingTime: string
  image: string
  imageAlt: string
  href: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Article[] }>(),
  { heading: '', intro: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <ul class="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in items" :key="item.title" class="group/article">
        <component :is="item.href ? 'a' : 'div'" :href="item.href || undefined" class="block no-underline">
          <div class="aspect-[16/10] overflow-hidden rounded-[calc(var(--site-radius)*1.5)] bg-[var(--site-surface-alt)]">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.imageAlt"
              class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/article:scale-[1.04] motion-reduce:transition-none"
              width="640"
              height="400"
              loading="lazy"
            />
            <div
              v-else
              class="h-full w-full bg-[radial-gradient(100%_80%_at_30%_20%,var(--site-primary)_0%,transparent_70%)] opacity-20"
              aria-hidden="true"
            />
          </div>

          <p v-if="item.category" class="mt-4 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">
            {{ item.category }}
          </p>
          <h3
            class="mt-2 text-[1.125rem] font-semibold leading-snug tracking-[-0.02em] text-[var(--site-text)] underline decoration-transparent decoration-2 underline-offset-4 transition-[text-decoration-color] duration-200 group-hover/article:decoration-[var(--site-primary)]"
          >{{ item.title }}</h3>
          <p v-if="item.excerpt" class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">
            {{ item.excerpt }}
          </p>

          <p
            v-if="item.date || item.readingTime"
            class="mt-3 text-[0.8125rem] text-[var(--site-text-muted)]"
          >
            <span v-if="item.date">{{ item.date }}</span>
            <span v-if="item.date && item.readingTime"> · </span>
            <span v-if="item.readingTime">{{ item.readingTime }}</span>
          </p>
        </component>
      </li>
    </ul>
  </div>
</template>
