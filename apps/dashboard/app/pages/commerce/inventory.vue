<script setup lang="ts">
</script>

<template>
  <div>
    <UiPageHeader
      title="Inventory"
      description="Stock policy, low-stock alerts, and locations for fulfilment."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton size="sm" to="/commerce/products">Products</UiButton>
        <UiButton size="sm" to="/commerce/settings?panel=inventory">All store settings</UiButton>
      </template>
    </UiPageHeader>

    <SettingsCommerceInventory />
  </div>
</template>
