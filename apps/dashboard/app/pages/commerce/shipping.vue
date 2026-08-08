<script setup lang="ts">
import type { CommerceStatus, ShippingRate } from '@platform/schemas'

const api = useApi()

const { data: status } = await useAsyncData('commerce:shipping:status', () =>
  api.get<CommerceStatus>('/api/v1/commerce/status'),
)

const { data: rates } = await useAsyncData(
  'commerce:shipping:rates',
  () => api.get<ShippingRate[]>('/api/v1/commerce/shipping/rates'),
  { default: () => [] as ShippingRate[] },
)
</script>

<template>
  <div>
    <UiPageHeader
      title="Shipping"
      description="Flat rates, carriers, and pickup options for checkout."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton size="sm" to="/commerce/settings?panel=shipping">All store settings</UiButton>
      </template>
    </UiPageHeader>

    <SettingsCommerceShipping :status="status ?? null" :rates="rates ?? []" />
  </div>
</template>
