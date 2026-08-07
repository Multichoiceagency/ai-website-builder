<script setup lang="ts">
withDefaults(
  defineProps<{
    heading?: string
    items?: { quote: string; author: string; role: string; rating: number }[]
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  { heading: '', items: () => [], headingLevel: 'h2' },
)
</script>

<template>
  <div class="bg-[var(--site-surface-alt)]">
    <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
      <component
        v-if="heading"
        :is="headingLevel"
        class="max-w-2xl text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ heading }}
      </component>

      <ul class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="item in items"
          :key="item.author + item.quote"
          class="flex flex-col rounded-[calc(var(--site-radius)*1.5)] bg-[var(--site-surface)] p-7 shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
        >
          <div v-if="item.rating > 0" class="mb-4 flex gap-0.5 text-[var(--site-accent)]" :aria-label="`${item.rating} van 5`">
            <BlockIcon v-for="star in Math.round(item.rating)" :key="star" name="star" class="h-4 w-4 fill-current" />
          </div>
          <blockquote class="grow text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text)]">
            &ldquo;{{ item.quote }}&rdquo;
          </blockquote>
          <figcaption class="mt-5 text-sm text-[var(--site-text-muted)]">
            <span class="font-semibold text-[var(--site-text)]">{{ item.author }}</span>
            <span v-if="item.role"> &middot; {{ item.role }}</span>
          </figcaption>
        </li>
      </ul>
    </div>
  </div>
</template>
