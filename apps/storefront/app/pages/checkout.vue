<script setup lang="ts">
/**
 * Checkout stub — deliberately non-charging.
 * Complete-checkout on the API requires a tenant session and a real cart id.
 */
useHead({ title: 'Checkout' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">Checkout</h1>
      <p class="mt-2 max-w-lg text-sm text-soft">
        Payment capture is not available on this storefront surface yet. This
        page will not create orders or charge cards.
      </p>
    </header>

    <UiEmptyState
      title="Checkout unavailable"
      description="There is no public checkout endpoint by host. Use the dashboard commerce tools for order testing until Wave 1 public commerce lands."
    >
      <UiButton to="/cart" size="sm">Back to cart</UiButton>
      <UiButton to="/shop" size="sm">Browse shop</UiButton>
    </UiEmptyState>
  </div>
</template>
