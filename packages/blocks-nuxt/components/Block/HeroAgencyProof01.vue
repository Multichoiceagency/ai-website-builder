<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    headline?: string
    headlineAccent?: string
    subheadline?: string
    primaryLabel?: string
    primaryHref?: string
    trustLabel?: string
    ratingLabel?: string
    avatars?: { name: string; image: string }[]
    logos?: { name: string; image: string }[]
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    eyebrow: '',
    headline: '',
    headlineAccent: '',
    subheadline: '',
    primaryLabel: '',
    primaryHref: '',
    trustLabel: '',
    ratingLabel: '',
    avatars: () => [],
    logos: () => [],
    headingLevel: 'h1',
  },
)
</script>

<template>
  <div class="relative isolate overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_10%_0%,color-mix(in_oklab,var(--site-primary)_22%,transparent),transparent_55%),radial-gradient(70%_60%_at_90%_10%,color-mix(in_oklab,var(--site-accent)_18%,transparent),transparent_50%),linear-gradient(180deg,var(--site-surface)_0%,var(--site-surface-alt)_100%)]"
      aria-hidden="true"
    />

    <div class="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-20 text-center lg:px-10 lg:pb-20 lg:pt-28">
      <p
        v-if="eyebrow"
        class="mb-5 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-primary)]"
      >
        {{ eyebrow }}
      </p>

      <component
        :is="headingLevel"
        class="text-[clamp(2.25rem,1.2rem+4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        <span class="block">{{ headline }}</span>
        <span
          v-if="headlineAccent"
          class="mt-1 block font-normal italic text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-display, var(--site-font-heading))' }"
        >{{ headlineAccent }}</span>
      </component>

      <p
        v-if="subheadline"
        class="mx-auto mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-pretty text-[var(--site-text-muted)]"
      >
        {{ subheadline }}
      </p>

      <div
        v-if="primaryLabel || avatars.length || trustLabel"
        class="mt-10 flex flex-wrap items-center justify-center gap-5"
      >
        <a
          v-if="primaryLabel"
          :href="primaryHref"
          class="inline-flex items-center rounded-full bg-[var(--site-text)] px-7 py-3.5 text-[0.9375rem] font-semibold text-[var(--site-surface)] no-underline transition-[transform,opacity] duration-150 hover:-translate-y-0.5 hover:opacity-90"
        >{{ primaryLabel }}</a>

        <div v-if="avatars.length || trustLabel" class="flex items-center gap-3">
          <ul v-if="avatars.length" class="flex -space-x-2" aria-hidden="true">
            <li
              v-for="(person, index) in avatars.slice(0, 5)"
              :key="`${person.name}-${index}`"
              class="grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-[var(--site-surface)] bg-[var(--site-primary)] text-[0.6875rem] font-semibold text-[var(--site-primary-ink)]"
            >
              <img
                v-if="person.image"
                :src="person.image"
                :alt="person.name"
                class="h-full w-full object-cover"
                width="36"
                height="36"
                loading="lazy"
              />
              <span v-else>{{ (person.name || '?').charAt(0).toUpperCase() }}</span>
            </li>
          </ul>
          <div class="text-left">
            <p v-if="ratingLabel" class="flex items-center gap-1 text-[0.75rem] font-semibold text-[var(--site-text)]">
              <span aria-hidden="true">★★★★★</span>
              <span>{{ ratingLabel }}</span>
            </p>
            <p v-if="trustLabel" class="text-[0.75rem] text-[var(--site-text-muted)]">{{ trustLabel }}</p>
          </div>
        </div>
      </div>

      <ul
        v-if="logos.length"
        class="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 border-t border-[var(--site-line)] pt-10"
      >
        <li
          v-for="logo in logos"
          :key="logo.name"
          class="opacity-55 transition-opacity duration-150 hover:opacity-100"
        >
          <img
            v-if="logo.image"
            :src="logo.image"
            :alt="logo.name"
            class="h-7 w-auto"
            height="28"
            loading="lazy"
          />
          <span
            v-else
            class="text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--site-text-muted)]"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >{{ logo.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
