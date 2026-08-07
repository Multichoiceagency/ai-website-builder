<script setup lang="ts">
interface Service {
  title: string
  description: string
  href: string
  linkLabel: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Service[] }>(),
  { heading: '', intro: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-28">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-bold uppercase leading-[0.96] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <!--
      An index, not a card grid: full-width rows separated by rules. The detail
      is always in the document — hovering only changes its opacity and offset,
      so touch devices, keyboard users and search engines all get the same
      content without a second layout.
    -->
    <ol class="mt-14 border-t border-[var(--site-text)]">
      <li v-for="(item, index) in items" :key="item.title" class="group/row border-b border-[var(--site-text)]">
        <component
          :is="item.href ? 'a' : 'div'"
          :href="item.href || undefined"
          class="grid gap-3 py-8 no-underline sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-8"
        >
          <span class="text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
            {{ String(index + 1).padStart(2, '0') }}
          </span>

          <div>
            <h3
              class="text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] font-bold uppercase leading-[1] tracking-[-0.035em] text-[var(--site-text)] transition-transform duration-300 ease-out group-hover/row:translate-x-2 motion-reduce:transition-none"
              :style="{ fontFamily: 'var(--site-font-heading)' }"
            >{{ item.title }}</h3>
            <p
              class="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)] opacity-70 transition-opacity duration-300 group-hover/row:opacity-100"
            >{{ item.description }}</p>
          </div>

          <span
            v-if="item.href"
            class="text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-[var(--site-text)] transition-transform duration-300 group-hover/row:translate-x-1 motion-reduce:transition-none"
          >
            {{ item.linkLabel }} <span aria-hidden="true">→</span>
          </span>
        </component>
      </li>
    </ol>
  </div>
</template>
