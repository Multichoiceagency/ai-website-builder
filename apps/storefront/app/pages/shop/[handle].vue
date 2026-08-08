<script setup lang="ts">
/**
 * Product detail stub. Handle is reserved for Wave 1 public product-by-handle.
 */
const route = useRoute()
const handle = computed(() => String(route.params.handle ?? ''))

useHead(() => ({ title: handle.value ? `${handle.value} · Shop` : 'Product · Shop' }))
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <p class="text-sm font-medium text-faint">
      <NuxtLink to="/shop" class="text-soft no-underline hover:text-ink">Shop</NuxtLink>
      <span class="mx-1.5 text-faint">/</span>
      <span class="text-ink">{{ handle || 'product' }}</span>
    </p>

    <UiEmptyState
      class="mt-8"
      title="Product not available"
      :description="`Public product lookup for “${handle || '…'}” is not ready. The authenticated catalogue API exists in the dashboard; the storefront host route does not.`"
    >
      <UiButton to="/shop" size="sm">Back to shop</UiButton>
    </UiEmptyState>
  </div>
</template>
