<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    heading?: string
    intro?: string
    phone?: string
    email?: string
    street?: string
    postalCode?: string
    city?: string
    hours?: string
    showMap?: boolean
    /** Heading rank, so the section fits the page outline where it is placed. */
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4'
  }>(),
  {
    heading: '', intro: '', phone: '', email: '',
    street: '', postalCode: '', city: '', hours: '', showMap: true,
    headingLevel: 'h2',
  },
)

const hourLines = computed(() => props.hours.split('\n').map((line) => line.trim()).filter(Boolean))
const hasAddress = computed(() => Boolean(props.street && props.city))
const mapQuery = computed(() =>
  encodeURIComponent([props.street, props.postalCode, props.city].filter(Boolean).join(', ')),
)

/** LocalBusiness data is only emitted when there is a real address to describe. */
const localBusinessSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    telephone: props.phone || undefined,
    email: props.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: props.street,
      postalCode: props.postalCode,
      addressLocality: props.city,
    },
  }),
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <component
          v-if="heading"
          :is="headingLevel"
          class="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ heading }}
        </component>
        <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>

        <dl class="mt-8 space-y-5">
          <div v-if="phone" class="flex items-start gap-3.5">
            <BlockIcon name="phone" class="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-primary)]" />
            <div>
              <dt class="sr-only">Telefoon</dt>
              <dd>
                <a :href="`tel:${phone.replace(/\s/g, '')}`" class="text-[1.0625rem] font-semibold text-[var(--site-text)] no-underline hover:underline">
                  {{ phone }}
                </a>
              </dd>
            </div>
          </div>

          <div v-if="email" class="flex items-start gap-3.5">
            <BlockIcon name="mail" class="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-primary)]" />
            <div>
              <dt class="sr-only">E-mail</dt>
              <dd>
                <a :href="`mailto:${email}`" class="text-[1.0625rem] text-[var(--site-text)] no-underline hover:underline">{{ email }}</a>
              </dd>
            </div>
          </div>

          <div v-if="hasAddress" class="flex items-start gap-3.5">
            <BlockIcon name="pin" class="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-primary)]" />
            <div>
              <dt class="sr-only">Adres</dt>
              <dd class="text-[1.0625rem] leading-relaxed text-[var(--site-text)]">
                {{ street }}<br />{{ postalCode }} {{ city }}
                <a
                  v-if="showMap"
                  :href="`https://www.openstreetmap.org/search?query=${mapQuery}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 block text-[0.9375rem] font-semibold text-[var(--site-primary)] no-underline hover:underline"
                >Bekijk op de kaart</a>
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div v-if="hourLines.length" class="rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-surface-alt)] p-8">
        <h3 class="flex items-center gap-2.5 text-[1.0625rem] font-semibold tracking-[-0.015em] text-[var(--site-text)]">
          <BlockIcon name="clock" class="h-4.5 w-4.5 text-[var(--site-primary)]" />
          Openingstijden
        </h3>
        <ul class="mt-5 space-y-2.5">
          <li v-for="line in hourLines" :key="line" class="text-[0.9375rem] text-[var(--site-text-muted)]">{{ line }}</li>
        </ul>
      </div>
    </div>

    <component :is="'script'" v-if="hasAddress" type="application/ld+json" v-html="localBusinessSchema" />
  </div>
</template>
