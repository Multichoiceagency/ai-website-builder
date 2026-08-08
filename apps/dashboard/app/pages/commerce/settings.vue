<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CommerceStatus, ShippingRate } from '@platform/schemas'

/**
 * Store settings (§13, §75, §76).
 *
 * Its own area rather than a section of platform settings: a merchant lives in
 * these seven screens, and burying tax rates under "Settings → Commerce →
 * Taxes" makes the store feel like a plugin.
 *
 * One panel at a time. A single scrolling page of all seven is where merchants
 * lose the setting they came for.
 */
type Panel = 'connection' | 'payments' | 'shipping' | 'taxes' | 'checkout' | 'inventory' | 'currencies' | 'email'

const PANELS: { key: Panel; label: string }[] = [
  { key: 'connection', label: 'Connection' },
  { key: 'payments', label: 'Payments' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'taxes', label: 'Taxes' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'email', label: 'Store e-mail' },
]

const api = useApi()
const route = useRoute()
const router = useRouter()

function panelFromQuery(value: unknown): Panel {
  return PANELS.some((entry) => entry.key === value) ? (value as Panel) : 'connection'
}

const panel = ref<Panel>(panelFromQuery(route.query.panel))

watch(
  () => route.query.panel,
  (value) => {
    panel.value = panelFromQuery(value)
  },
)

function selectPanel(next: Panel) {
  panel.value = next
  void router.replace({ query: { ...route.query, panel: next } })
}

// Provider status and flat rates are read once here and passed down, so the
// panels that need them do not each open their own request.
const { data: status, refresh: refreshStatus } = await useAsyncData('commerce:settings:status', () =>
  api.get<CommerceStatus>('/api/v1/commerce/status'),
)

const { data: rates } = await useAsyncData(
  'commerce:settings:rates',
  () => api.get<ShippingRate[]>('/api/v1/commerce/shipping/rates'),
  { default: () => [] as ShippingRate[] },
)
</script>

<template>
  <div class="editor-chrome">
    <UiPageHeader
      title="Store settings"
      description="Connect Shopify / WooCommerce / Medusa, then payments, shipping, tax and checkout."
      back="/commerce"
      back-label="Commerce"
    />

    <nav class="-mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Store settings">
      <button
        v-for="entry in PANELS"
        :key="entry.key"
        type="button"
        class="type-button-12 shrink-0 rounded-lg border px-3 py-2 transition-colors"
        :class="
          panel === entry.key
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-line text-soft hover:border-line-strong hover:text-ink'
        "
        :aria-current="panel === entry.key ? 'page' : undefined"
        @click="selectPanel(entry.key)"
      >
        {{ entry.label }}
      </button>
    </nav>

    <SettingsCommerceEngine
      v-if="panel === 'connection'"
      :status="status ?? null"
      @status-changed="refreshStatus()"
    />
    <SettingsCommercePayments
      v-else-if="panel === 'payments'"
      :status="status ?? null"
      @status-changed="refreshStatus()"
    />
    <SettingsCommerceShipping
      v-else-if="panel === 'shipping'"
      :status="status ?? null"
      :rates="rates ?? []"
    />
    <SettingsCommerceTaxes v-else-if="panel === 'taxes'" />
    <SettingsCommerceCheckout v-else-if="panel === 'checkout'" />
    <SettingsCommerceInventory v-else-if="panel === 'inventory'" />
    <SettingsCommerceCurrencies v-else-if="panel === 'currencies'" />
    <SettingsCommerceEmail v-else />
  </div>
</template>
