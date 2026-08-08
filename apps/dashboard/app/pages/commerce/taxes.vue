<script setup lang="ts">
</script>

<template>
  <div>
    <UiPageHeader
      title="Taxes"
      description="VAT/GST inclusion, tax number, and regional rates (basis points — no float drift)."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton size="sm" to="/commerce/settings?panel=taxes">All store settings</UiButton>
      </template>
    </UiPageHeader>

    <SettingsCommerceTaxes />
  </div>
</template>
