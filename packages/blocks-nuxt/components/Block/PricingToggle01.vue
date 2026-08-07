<script setup lang="ts">
import { ref } from 'vue'

interface Plan {
  name: string
  monthlyPrice: string
  yearlyPrice: string
  period: string
  description: string
  featureList: string
  ctaLabel: string
  ctaHref: string
  featured: boolean
}

withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    monthlyLabel?: string
    yearlyLabel?: string
    yearlyNote?: string
    items?: Plan[]
  }>(),
  { heading: '', intro: '', monthlyLabel: 'Monthly', yearlyLabel: 'Yearly', yearlyNote: '', items: () => [] },
)

/**
 * A checkbox, styled. Switching billing period is a two-state control, which is
 * exactly what a checkbox is — so it gets keyboard operation, a real focus ring
 * and a correct announcement without any of that being reimplemented.
 */
const yearly = ref(false)

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="mx-auto max-w-2xl text-center">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      <label class="inline-flex cursor-pointer items-center gap-3 text-[0.9375rem] font-medium text-[var(--site-text)]">
        <span :class="yearly ? 'text-[var(--site-text-muted)]' : ''">{{ monthlyLabel }}</span>
        <input v-model="yearly" type="checkbox" class="peer sr-only" />
        <span
          class="relative h-7 w-12 rounded-full bg-[var(--site-line)] transition-colors duration-200 peer-checked:bg-[var(--site-primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--site-primary)]"
          aria-hidden="true"
        >
          <span
            class="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
            :class="yearly ? 'translate-x-5' : ''"
          />
        </span>
        <span :class="yearly ? '' : 'text-[var(--site-text-muted)]'">{{ yearlyLabel }}</span>
      </label>
      <span
        v-if="yearlyNote"
        class="rounded-full bg-[var(--site-accent)]/12 px-3 py-1 text-[0.75rem] font-semibold text-[var(--site-accent)]"
      >{{ yearlyNote }}</span>
    </div>

    <ul class="mt-12 grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="plan in items"
        :key="plan.name"
        class="flex h-full flex-col rounded-[calc(var(--site-radius)*1.75)] border p-8 transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
        :class="
          plan.featured
            ? 'border-[var(--site-primary)] bg-[var(--site-surface)] shadow-[0_28px_70px_-40px_rgb(0_0_0/0.5)]'
            : 'border-[var(--site-line)] bg-[var(--site-surface)]'
        "
      >
        <p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]">{{ plan.name }}</p>

        <!-- Both prices ship in the markup. Switching swaps which one is
             visible, so the card never changes size and nothing reflows. -->
        <p
          class="mt-4 grid text-[clamp(2rem,1.5rem+1.6vw,2.75rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          <span class="col-start-1 row-start-1 transition-opacity duration-200" :class="yearly ? 'opacity-0' : 'opacity-100'" :aria-hidden="yearly ? 'true' : undefined">
            {{ plan.monthlyPrice }}<span class="text-[0.9375rem] font-medium tracking-normal text-[var(--site-text-muted)]">{{ plan.period }}</span>
          </span>
          <span class="col-start-1 row-start-1 transition-opacity duration-200" :class="yearly ? 'opacity-100' : 'opacity-0'" :aria-hidden="yearly ? undefined : 'true'">
            {{ plan.yearlyPrice }}<span class="text-[0.9375rem] font-medium tracking-normal text-[var(--site-text-muted)]">{{ plan.period }}</span>
          </span>
        </p>

        <p v-if="plan.description" class="mt-3 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">
          {{ plan.description }}
        </p>

        <ul class="mt-6 space-y-2.5 text-[0.9375rem] text-[var(--site-text)]">
          <li v-for="line in lines(plan.featureList)" :key="line" class="flex items-start gap-2.5">
            <BlockIcon name="check" class="mt-1 h-4 w-4 shrink-0 text-[var(--site-primary)]" />
            <span>{{ line }}</span>
          </li>
        </ul>

        <a
          v-if="plan.ctaLabel"
          :href="plan.ctaHref"
          class="mt-8 inline-flex items-center justify-center rounded-[var(--site-radius)] px-6 py-3.5 text-[0.9375rem] font-semibold no-underline transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5"
          :class="
            plan.featured
              ? 'bg-[var(--site-primary)] text-[var(--site-primary-ink)] shadow-sm hover:bg-[var(--site-primary-hover)] hover:shadow-lg'
              : 'border border-[var(--site-line-strong)] text-[var(--site-text)] hover:bg-[var(--site-surface-alt)]'
          "
        >{{ plan.ctaLabel }}</a>
      </li>
    </ul>
  </div>
</template>
