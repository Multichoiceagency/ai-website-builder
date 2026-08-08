<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  STORE_BUILDER_DEV_THEME,
  STORE_BUILDER_THEME_PRESETS,
  type Site,
  type StoreBuildInput,
  type StoreBuildPlan,
  type StoreBuildResult,
} from '@platform/schemas'

/**
 * Ecommerce store builder — one prompt → full shop seed.
 * Dev chrome tokens from ui-ux-pro-max “OpenWA Store Builder”.
 * Capability map aligned with Medusa / Shopify / Payload ecommerce docs.
 */

const api = useApi()
const activeSiteId = useActiveSiteId()
const theme = STORE_BUILDER_DEV_THEME

const prompt = ref(
  'Build a modern essentials store for everyday home goods. Warm editorial look, bestsellers + new arrivals, EUR pricing, free shipping over €75.',
)
const currency = ref('EUR')
const productCount = ref(6)
const themePreset = ref<(typeof STORE_BUILDER_THEME_PRESETS)[number]>('editorial-ink')
const updateHome = ref(true)
const busy = ref(false)
const error = ref('')
const plan = ref<StoreBuildPlan | null>(null)
const result = ref<StoreBuildResult | null>(null)

const { data: sites } = await useAsyncData(
  'commerce-builder:sites',
  () => api.get<Site[]>('/api/v1/sites'),
  { default: () => [] as Site[] },
)

const siteId = computed(() => activeSiteId.value ?? sites.value?.[0]?.id ?? '')

const themeOptions = STORE_BUILDER_THEME_PRESETS.map((id) => ({
  value: id,
  label: id
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' '),
}))

const canBuild = computed(() => Boolean(siteId.value) && prompt.value.trim().length >= 12 && !busy.value)

async function buildShop() {
  if (!canBuild.value || !siteId.value) return
  busy.value = true
  error.value = ''
  plan.value = null
  result.value = null
  try {
    const body: StoreBuildInput = {
      prompt: prompt.value.trim(),
      siteId: siteId.value,
      currency: currency.value,
      locale: 'en',
      productCount: productCount.value,
      themePreset: themePreset.value,
      updateHome: updateHome.value,
    }
    const response = await api.post<{ plan: StoreBuildPlan; result: StoreBuildResult }>(
      '/api/v1/commerce/store/build',
      body,
    )
    plan.value = response.plan
    result.value = response.result
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Store build failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    class="store-builder -mx-1 min-h-[70vh] rounded-2xl px-1 pb-8"
    :style="{
      '--sb-primary': theme.primary,
      '--sb-cta': theme.cta,
      '--sb-bg': theme.background,
      '--sb-surface': theme.surface,
      '--sb-text': theme.text,
      '--sb-muted': theme.textMuted,
      '--sb-line': theme.line,
      background: `linear-gradient(165deg, ${theme.background} 0%, #ECFEFF 48%, ${theme.background} 100%)`,
      color: theme.text,
      fontFamily: `${theme.fontBody}, ui-sans-serif, system-ui, sans-serif`,
    }"
  >
    <UiPageHeader
      title="Ecommerce builder"
      description="One prompt builds a full shop: theme, collections, variants, shipping, discount, and /shop pages — Medusa / Shopify / Payload shaped."
      back="/commerce"
      back-label="Commerce"
    />

    <div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section
        class="rounded-2xl border p-5 shadow-sm"
        :style="{ background: theme.surface, borderColor: theme.line }"
      >
        <p
          class="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
          :style="{ color: theme.primary }"
        >
          Store builder agent
        </p>
        <h2 class="mt-2 text-[1.35rem] font-semibold tracking-tight" :style="{ fontFamily: theme.fontHeading }">
          Describe the shop. We seed everything.
        </h2>
        <p class="mt-2 text-[0.875rem] leading-relaxed" :style="{ color: theme.textMuted }">
          Same surfaces merchants expect from Shopify Online Store, Medusa Admin, and Payload ecommerce:
          products with variants, collections, inventory location, shipping rates, promo code, theme tokens, and a shop page.
        </p>

        <label class="mt-5 block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }" for="shop-prompt">
          Prompt
        </label>
        <textarea
          id="shop-prompt"
          v-model="prompt"
          rows="6"
          class="mt-1.5 w-full resize-y rounded-xl border px-3.5 py-3 text-[0.9375rem] leading-relaxed outline-none transition-colors duration-200 focus:border-[var(--sb-primary)]"
          :style="{ borderColor: theme.line, color: theme.text, background: theme.background }"
          placeholder="e.g. Minimal skincare DTC brand in EUR — clean teal theme, 8 products, bestsellers + new arrivals…"
        />

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <label class="block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }">
            Theme
            <select
              v-model="themePreset"
              class="mt-1.5 w-full cursor-pointer rounded-lg border px-3 py-2 text-[0.875rem]"
              :style="{ borderColor: theme.line, background: theme.surface }"
            >
              <option v-for="option in themeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }">
            Products
            <input
              v-model.number="productCount"
              type="number"
              min="2"
              max="24"
              class="mt-1.5 w-full rounded-lg border px-3 py-2 text-[0.875rem]"
              :style="{ borderColor: theme.line, background: theme.surface }"
            />
          </label>
          <label class="block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }">
            Currency
            <input
              v-model="currency"
              maxlength="3"
              class="mt-1.5 w-full rounded-lg border px-3 py-2 text-[0.875rem] uppercase"
              :style="{ borderColor: theme.line, background: theme.surface }"
            />
          </label>
        </div>

        <label class="mt-4 flex cursor-pointer items-center gap-2 text-[0.8125rem]" :style="{ color: theme.textMuted }">
          <input v-model="updateHome" type="checkbox" class="accent-[var(--sb-primary)]" />
          Also add announcement bar to the site home page
        </label>

        <p v-if="!siteId" class="mt-3 text-[0.8125rem] text-red-700">
          Select or create a site first under Website → Sites.
        </p>
        <p v-if="error" class="mt-3 text-[0.8125rem] text-red-700">{{ error }}</p>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiButton
            size="sm"
            variant="primary"
            class="cursor-pointer"
            :disabled="!canBuild"
            :loading="busy"
            @click="buildShop"
          >
            {{ busy ? 'Building shop…' : 'Build full shop' }}
          </UiButton>
          <UiButton size="sm" to="/commerce/products" class="cursor-pointer">Products</UiButton>
          <UiButton size="sm" to="/commerce/payments" class="cursor-pointer">Payments</UiButton>
          <UiButton size="sm" to="/commerce/feeds" class="cursor-pointer">Feeds</UiButton>
        </div>
      </section>

      <aside class="space-y-4">
        <section
          class="rounded-2xl border p-4"
          :style="{ background: theme.surface, borderColor: theme.line }"
        >
          <h3 class="text-[0.8125rem] font-semibold uppercase tracking-[0.08em]" :style="{ color: theme.primary }">
            What one run creates
          </h3>
          <ul class="mt-3 space-y-2 text-[0.8125rem] leading-snug" :style="{ color: theme.textMuted }">
            <li>Theme tokens (Rubik / Nunito Sans · teal/ink presets)</li>
            <li>Collections + products with variants & inventory</li>
            <li>Standard shipping + WELCOME10 discount</li>
            <li><code class="text-[0.75rem]">/shop</code> page with announcement, hero, PDP, CTA</li>
            <li>Ready for carts / checkout / orders via CommerceProvider</li>
          </ul>
        </section>

        <section
          v-if="result"
          class="rounded-2xl border p-4"
          :style="{ background: theme.surface, borderColor: theme.line }"
        >
          <h3 class="text-[0.9375rem] font-semibold" :style="{ fontFamily: theme.fontHeading }">
            {{ result.shopName }}
          </h3>
          <p class="mt-1 text-[0.75rem]" :style="{ color: theme.textMuted }">
            {{ result.productIds.length }} products · {{ result.collectionIds.length }} collections · theme
            {{ result.themePreset }}
          </p>
          <ol class="mt-3 space-y-1.5">
            <li
              v-for="step in result.steps"
              :key="step.id"
              class="flex items-start justify-between gap-2 text-[0.8125rem]"
            >
              <span>{{ step.label }}</span>
              <UiBadge
                :tone="step.status === 'done' ? 'positive' : step.status === 'failed' ? 'danger' : 'neutral'"
              >
                {{ step.status }}
              </UiBadge>
            </li>
          </ol>
          <div class="mt-4 flex flex-wrap gap-2">
            <UiButton size="sm" variant="primary" to="/website/pages" class="cursor-pointer">Pages</UiButton>
            <UiButton size="sm" to="/commerce/products" class="cursor-pointer">Edit products</UiButton>
          </div>
        </section>

        <section
          v-if="plan"
          class="rounded-2xl border p-4"
          :style="{ background: theme.surface, borderColor: theme.line }"
        >
          <h3 class="text-[0.8125rem] font-semibold">Plan preview</h3>
          <p class="mt-1 text-[0.8125rem]" :style="{ color: theme.textMuted }">{{ plan.tagline }}</p>
          <ul class="mt-2 list-disc space-y-1 pl-4 text-[0.8125rem]">
            <li v-for="collection in plan.collections" :key="collection.title">{{ collection.title }}</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
