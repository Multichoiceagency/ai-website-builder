<script setup lang="ts">
import type { CommerceStatus } from '@platform/schemas'

const api = useApi()

const { data: status, refresh } = await useAsyncData('commerce:payments:status', () =>
  api.get<CommerceStatus>('/api/v1/commerce/status'),
)

onMounted(() => {
  if (import.meta.client && window.location.hash === '#credentials') {
    document.getElementById('credentials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Payments"
      description="Connect Mollie or Stripe, or take orders with manual bank transfer. Credentials stay encrypted."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton size="sm" to="/settings/integrations">Integrations</UiButton>
        <UiButton size="sm" to="/commerce/settings?panel=payments">All store settings</UiButton>
      </template>
    </UiPageHeader>

    <SettingsCommercePayments :status="status ?? null" @status-changed="refresh()" />
  </div>
</template>
