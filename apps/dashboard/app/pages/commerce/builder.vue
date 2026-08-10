<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  STORE_BUILDER_DEV_THEME,
  STORE_BUILDER_THEME_PRESETS,
  type Site,
  type StoreBuildInput,
  type StoreBuildPlan,
  type StoreBuildResult,
} from '@platform/schemas'

/**
 * Ecommerce store builder — product URL or prompt → full shop seed.
 * Distinct from Website → Generate (brochure pages only).
 */

definePageMeta({ layout: 'default' })

const api = useApi()
const activeSiteId = useActiveSiteId()
const theme = STORE_BUILDER_DEV_THEME

type BuildMode = 'url' | 'prompt'

const mode = ref<BuildMode>('url')
const sourceUrl = ref('')
const prompt = ref(
  'Build a modern essentials store for everyday home goods. Warm editorial look, bestsellers + new arrivals, EUR pricing, free shipping over €75.',
)
const currency = ref('EUR')
const productCount = ref(6)
const themePreset = ref<(typeof STORE_BUILDER_THEME_PRESETS)[number]>('editorial-ink')
const updateHome = ref(true)
const publish = ref(true)
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

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const sourceUrlValid = computed(() => isValidHttpUrl(sourceUrl.value))
const promptReady = computed(() => prompt.value.trim().length >= 12)

const canBuild = computed(() => {
  if (!siteId.value || busy.value) return false
  if (mode.value === 'url') return sourceUrlValid.value || promptReady.value
  return promptReady.value
})

watch(mode, (next) => {
  if (next === 'prompt' && !prompt.value.trim()) {
    prompt.value =
      'Build a modern essentials store for everyday home goods. Warm editorial look, bestsellers + new arrivals, EUR pricing, free shipping over €75.'
  }
})

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
      publish: publish.value,
      ...(mode.value === 'url' && sourceUrlValid.value ? { sourceUrl: sourceUrl.value.trim() } : {}),
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
      description="Builds a full shop — products, collections, shipping, discount, and home + /shop pages. Not the same as Website → Generate (brochure sites)."
      back="/commerce"
      back-label="Commerce"
    />

    <p class="mx-auto mb-5 max-w-5xl text-[0.875rem] leading-relaxed" :style="{ color: theme.textMuted }">
      Need a marketing / brochure site instead?
      <NuxtLink to="/website/generate" class="font-medium underline-offset-2 hover:underline" :style="{ color: theme.cta }">
        Website → Generate
      </NuxtLink>
    </p>

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
          Seed a complete online shop
        </h2>
        <p class="mt-2 text-[0.875rem] leading-relaxed" :style="{ color: theme.textMuted }">
          Paste an Amazon or AliExpress product URL, or describe the brand. One run creates catalog,
          collections, inventory location, shipping, a welcome discount, theme tokens, and shop pages —
          ready for carts and checkout via CommerceProvider.
        </p>

        <div class="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Build mode">
          <button
            type="button"
            role="tab"
            class="cursor-pointer rounded-lg border px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors"
            :aria-selected="mode === 'url'"
            :style="{
              borderColor: mode === 'url' ? theme.primary : theme.line,
              background: mode === 'url' ? theme.primary : theme.background,
              color: mode === 'url' ? '#fff' : theme.text,
            }"
            @click="mode = 'url'"
          >
            From product URL
          </button>
          <button
            type="button"
            role="tab"
            class="cursor-pointer rounded-lg border px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors"
            :aria-selected="mode === 'prompt'"
            :style="{
              borderColor: mode === 'prompt' ? theme.primary : theme.line,
              background: mode === 'prompt' ? theme.primary : theme.background,
              color: mode === 'prompt' ? '#fff' : theme.text,
            }"
            @click="mode = 'prompt'"
          >
            From prompt
          </button>
        </div>

        <template v-if="mode === 'url'">
          <label class="mt-5 block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }" for="shop-url">
            Product URL
          </label>
          <input
            id="shop-url"
            v-model="sourceUrl"
            type="url"
            class="mt-1.5 w-full rounded-xl border px-3.5 py-3 text-[0.9375rem] outline-none transition-colors duration-200 focus:border-[var(--sb-primary)]"
            :style="{ borderColor: theme.line, color: theme.text, background: theme.background }"
            placeholder="https://www.amazon.com/… or https://www.aliexpress.com/…"
          />
          <p v-if="sourceUrl.trim() && !sourceUrlValid" class="mt-1.5 text-[0.75rem] text-red-700">
            Enter a valid http(s) URL.
          </p>
          <label class="mt-4 block text-[0.75rem] font-semibold" :style="{ color: theme.textMuted }" for="shop-prompt-url">
            Extra brief <span class="font-normal">(optional if URL is set)</span>
          </label>
          <textarea
            id="shop-prompt-url"
            v-model="prompt"
            rows="3"
            class="mt-1.5 w-full resize-y rounded-xl border px-3.5 py-3 text-[0.9375rem] leading-relaxed outline-none transition-colors duration-200 focus:border-[var(--sb-primary)]"
            :style="{ borderColor: theme.line, color: theme.text, background: theme.background }"
            placeholder="Tone, audience, currency hints…"
          />
        </template>

        <template v-else>
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
        </template>

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
          Also rewrite the site home page as a shop landing
        </label>
        <label class="mt-2 flex cursor-pointer items-center gap-2 text-[0.8125rem]" :style="{ color: theme.textMuted }">
          <input v-model="publish" type="checkbox" class="accent-[var(--sb-primary)]" />
          Publish shop (and home) pages after seed
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
            <li>Site kind set to <code class="text-[0.75rem]">ecommerce</code></li>
            <li>Theme tokens + collections + products with variants &amp; inventory</li>
            <li>Standard shipping + WELCOME10 discount</li>
            <li><code class="text-[0.75rem]">/shop</code> (+ optional home) with announcement, hero, PDP, CTA</li>
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
