<script setup lang="ts">
import { computed } from 'vue'

interface ProductCard {
  image: string
  title: string
  price: string
  compareAt: string
  badge: string
  href: string
  meta: string
}

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    subtitle?: string
    viewAllHref?: string
    viewAllLabel?: string
    columns?: string
    products?: ProductCard[]
  }>(),
  {
    eyebrow: '',
    title: '',
    subtitle: '',
    viewAllHref: '/shop',
    viewAllLabel: 'View all',
    columns: '3',
    products: () => [],
  },
)

const gridClass = computed(() => {
  const cols = props.columns.trim()
  if (cols === '2') return 'sm:grid-cols-2'
  if (cols === '4') return 'sm:grid-cols-2 lg:grid-cols-4'
  return 'sm:grid-cols-2 lg:grid-cols-3'
})
</script>

<template>
  <section class="w-full bg-[var(--site-surface)] text-[var(--site-text)]">
    <div class="mx-auto w-full max-w-6xl px-5 py-12 lg:px-10 lg:py-16">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-xl">
          <p
            v-if="eyebrow"
            class="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[var(--site-primary)]"
          >
            {{ eyebrow }}
          </p>
          <h2
            v-if="title"
            class="mt-2 text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-semibold tracking-[-0.03em]"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >
            {{ title }}
          </h2>
          <p v-if="subtitle" class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">
            {{ subtitle }}
          </p>
        </div>
        <a
          v-if="viewAllHref"
          :href="viewAllHref"
          class="text-[0.8125rem] font-semibold text-[var(--site-primary)] underline-offset-4 hover:underline"
        >
          {{ viewAllLabel || 'View all' }}
        </a>
      </div>

      <ul class="grid grid-cols-1 gap-5" :class="gridClass">
        <li v-for="(product, index) in products" :key="`${product.title}-${index}`">
          <a
            :href="product.href || '/shop'"
            class="group flex h-full flex-col overflow-hidden border border-[var(--site-line)] bg-[var(--site-surface-alt)] transition-colors hover:border-[var(--site-primary)]"
            :style="{ borderRadius: 'var(--site-radius)' }"
          >
            <div class="relative aspect-[4/5] overflow-hidden bg-[var(--site-surface-sunken,var(--site-surface))]">
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.title"
                class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div
                v-else
                class="absolute inset-0 grid place-items-center text-[0.75rem] text-[var(--site-text-muted)]"
              >
                Product image
              </div>
              <span
                v-if="product.badge"
                class="absolute left-3 top-3 rounded-md bg-[var(--site-primary)] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--site-primary-ink,#fff)]"
              >
                {{ product.badge }}
              </span>
            </div>
            <div class="flex flex-1 flex-col gap-1 p-4">
              <h3 class="text-[0.9375rem] font-semibold leading-snug">{{ product.title }}</h3>
              <p v-if="product.meta" class="text-[0.75rem] text-[var(--site-text-muted)]">{{ product.meta }}</p>
              <p class="mt-auto pt-2 text-[0.875rem] font-semibold tabular-nums">
                <span>{{ product.price }}</span>
                <span
                  v-if="product.compareAt"
                  class="ml-2 text-[0.75rem] font-normal text-[var(--site-text-muted)] line-through"
                >
                  {{ product.compareAt }}
                </span>
              </p>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
