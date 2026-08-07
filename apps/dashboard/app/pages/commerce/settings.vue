<script setup lang="ts">
import { ref } from 'vue'
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
type Panel = 'payments' | 'shipping' | 'taxes' | 'checkout' | 'inventory' | 'currencies' | 'email'

const PANELS: { key: Panel; label: string }[] = [
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

const panel = ref<Panel>(
  PANELS.some((entry) => entry.key === route.query.panel) ? (route.query.panel as Panel) : 'payments',
)

// Provider status and flat rates are read once here and passed down, so the
// panels that need them do not each open their own request.
const { data: status } = await useAsyncData('commerce:settings:status', () =>
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
      description="Payments, shipping, tax, checkout, stock and store e-mail."
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
        @click="panel = entry.key"
      >
        {{ entry.label }}
      </button>
    </nav>

    <SettingsCommercePayments v-if="panel === 'payments'" :status="status ?? null" />
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
