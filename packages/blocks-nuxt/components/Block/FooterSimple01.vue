<script setup lang="ts">
withDefaults(
  defineProps<{
    brand?: string
    tagline?: string
    phone?: string
    email?: string
    address?: string
    links?: { label: string; href: string }[]
    legal?: string
  }>(),
  { brand: '', tagline: '', phone: '', email: '', address: '', links: () => [], legal: '' },
)
</script>

<template>
  <footer class="border-t border-[var(--site-line)] bg-[var(--site-surface-alt)]">
    <div class="mx-auto w-full max-w-6xl px-6 py-14 lg:px-10">
      <div class="flex flex-col gap-10 md:flex-row md:justify-between">
        <div class="max-w-sm">
          <p
            class="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >
            {{ brand }}
          </p>
          <p v-if="tagline" class="mt-2 text-[0.9375rem] leading-relaxed text-[var(--site-text-muted)]">{{ tagline }}</p>
        </div>

        <div class="grid gap-10 sm:grid-cols-2">
          <div v-if="phone || email || address">
            <p class="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-muted)]">Contact</p>
            <ul class="space-y-1.5 text-[0.9375rem] text-[var(--site-text-muted)]">
              <li v-if="phone">
                <a :href="`tel:${phone.replace(/\s/g, '')}`" class="no-underline hover:text-[var(--site-text)]">{{ phone }}</a>
              </li>
              <li v-if="email">
                <a :href="`mailto:${email}`" class="no-underline hover:text-[var(--site-text)]">{{ email }}</a>
              </li>
              <li v-if="address">{{ address }}</li>
            </ul>
          </div>

          <div v-if="links.length">
            <p class="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-muted)]">Meer</p>
            <ul class="space-y-1.5 text-[0.9375rem]">
              <li v-for="link in links" :key="link.href + link.label">
                <a :href="link.href" class="text-[var(--site-text-muted)] no-underline transition-colors hover:text-[var(--site-text)]">
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p v-if="legal" class="mt-12 border-t border-[var(--site-line)] pt-6 text-[0.8125rem] text-[var(--site-text-muted)]">
        {{ legal }}
      </p>
    </div>
  </footer>
</template>
