<script setup lang="ts">
withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    links?: { label: string; href: string }[]
  }>(),
  { heading: 'Partner sites', intro: '', links: () => [] },
)
</script>

<template>
  <aside
    v-if="links.length"
    class="border-t border-[var(--site-line)] bg-[var(--site-surface)]"
    aria-label="Partner network"
  >
    <div class="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
      <p
        class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-muted)]"
      >
        {{ heading }}
      </p>
      <p
        v-if="intro"
        class="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]"
      >
        {{ intro }}
      </p>
      <ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2">
        <li v-for="link in links" :key="link.href + link.label">
          <a
            :href="link.href"
            class="text-[0.9375rem] text-[var(--site-text)] underline-offset-4 hover:underline"
            rel="noopener"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </div>
  </aside>
</template>
