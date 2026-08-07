<script setup lang="ts">
interface Person {
  name: string
  role: string
  image: string
  imageAlt: string
}

withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Person[] }>(),
  { heading: '', intro: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-bold uppercase leading-[0.96] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <!-- Greyscale until hovered. `filter` is compositor work, so a twelve-person
         masthead does not cost twelve repaints when the pointer crosses it. -->
    <ul class="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      <li v-for="person in items" :key="person.name" class="group/person">
        <div class="aspect-[3/4] overflow-hidden bg-[var(--site-surface-alt)]">
          <img
            v-if="person.image"
            :src="person.image"
            :alt="person.imageAlt || person.name"
            class="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover/person:scale-[1.03] group-hover/person:grayscale-0 motion-reduce:transition-none"
            width="600"
            height="800"
            loading="lazy"
          />
          <div
            v-else
            class="h-full w-full bg-[linear-gradient(160deg,var(--site-surface-alt)_0%,color-mix(in_oklab,var(--site-primary)_18%,var(--site-surface-alt))_100%)]"
            aria-hidden="true"
          />
        </div>

        <p
          class="mt-4 border-t border-[var(--site-text)] pt-3 text-[1.0625rem] font-bold uppercase tracking-[-0.01em] text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ person.name }}</p>
        <p class="mt-0.5 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-muted)]">
          {{ person.role }}
        </p>
      </li>
    </ul>
  </div>
</template>
