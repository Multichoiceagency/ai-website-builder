<script setup lang="ts">
interface CategoryTile {
  image: string
  title: string
  href: string
  meta: string
}

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    categories?: CategoryTile[]
  }>(),
  {
    title: '',
    subtitle: '',
    categories: () => [],
  },
)
</script>

<template>
  <section class="w-full bg-[var(--site-surface)] text-[var(--site-text)]">
    <div class="mx-auto w-full max-w-6xl px-5 py-12 lg:px-10 lg:py-16">
      <div class="mb-8 max-w-xl">
        <h2
          v-if="title"
          class="text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-semibold tracking-[-0.03em]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">
          {{ subtitle }}
        </p>
      </div>

      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="(category, index) in categories" :key="`${category.title}-${index}`">
          <a
            :href="category.href || '/shop'"
            class="group relative block aspect-[4/5] overflow-hidden"
            :style="{ borderRadius: 'calc(var(--site-radius) * 1.1)' }"
          >
            <img
              v-if="category.image"
              :src="category.image"
              :alt="category.title"
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <div
              v-else
              class="absolute inset-0 bg-[var(--site-surface-alt)]"
            />
            <div
              class="absolute inset-0"
              style="background: linear-gradient(to top, color-mix(in oklab, var(--site-text) 72%, transparent), transparent 55%)"
            />
            <div class="absolute inset-x-0 bottom-0 p-5 text-[var(--site-surface)]">
              <h3 class="text-[1.25rem] font-semibold tracking-[-0.02em]">{{ category.title }}</h3>
              <p v-if="category.meta" class="mt-1 text-[0.75rem] opacity-90">{{ category.meta }}</p>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
