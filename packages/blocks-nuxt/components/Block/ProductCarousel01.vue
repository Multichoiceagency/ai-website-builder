<script setup lang="ts">
import { ref } from 'vue'

interface ProductCard {
  image: string
  title: string
  price: string
  compareAt: string
  badge: string
  href: string
  meta: string
}

withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    subtitle?: string
    viewAllHref?: string
    viewAllLabel?: string
    products?: ProductCard[]
  }>(),
  {
    eyebrow: '',
    title: '',
    subtitle: '',
    viewAllHref: '/shop',
    viewAllLabel: 'Shop all',
    products: () => [],
  },
)

const scroller = ref<HTMLElement | null>(null)

function scrollBy(dir: -1 | 1) {
  const el = scroller.value
  if (!el) return
  el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.8), behavior: 'smooth' })
}
</script>

<template>
  <section class="w-full bg-[var(--site-surface-alt)] text-[var(--site-text)]">
    <div class="mx-auto w-full max-w-6xl px-5 py-12 lg:px-10 lg:py-16">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
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
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full border border-[var(--site-line)] bg-[var(--site-surface)] text-[var(--site-text)]"
            aria-label="Scroll products left"
            @click="scrollBy(-1)"
          >
            ←
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full border border-[var(--site-line)] bg-[var(--site-surface)] text-[var(--site-text)]"
            aria-label="Scroll products right"
            @click="scrollBy(1)"
          >
            →
          </button>
          <a
            v-if="viewAllHref"
            :href="viewAllHref"
            class="ml-2 text-[0.8125rem] font-semibold text-[var(--site-primary)] underline-offset-4 hover:underline"
          >
            {{ viewAllLabel || 'Shop all' }}
          </a>
        </div>
      </div>

      <div
        ref="scroller"
        class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <a
          v-for="(product, index) in products"
          :key="`${product.title}-${index}`"
          :href="product.href || '/shop'"
          class="group w-[min(72vw,260px)] shrink-0 snap-start overflow-hidden border border-[var(--site-line)] bg-[var(--site-surface)]"
          :style="{ borderRadius: 'var(--site-radius)' }"
        >
          <div class="relative aspect-[3/4] overflow-hidden bg-[var(--site-surface-sunken,var(--site-surface-alt))]">
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
              Cover
            </div>
            <span
              v-if="product.badge"
              class="absolute left-3 top-3 rounded-md bg-[var(--site-text)] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--site-surface)]"
            >
              {{ product.badge }}
            </span>
          </div>
          <div class="space-y-1 p-3">
            <h3 class="text-[0.875rem] font-semibold leading-snug">{{ product.title }}</h3>
            <p v-if="product.meta" class="text-[0.6875rem] text-[var(--site-text-muted)]">{{ product.meta }}</p>
            <p class="text-[0.8125rem] font-semibold tabular-nums">
              {{ product.price }}
              <span
                v-if="product.compareAt"
                class="ml-1 text-[0.6875rem] font-normal text-[var(--site-text-muted)] line-through"
              >
                {{ product.compareAt }}
              </span>
            </p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
