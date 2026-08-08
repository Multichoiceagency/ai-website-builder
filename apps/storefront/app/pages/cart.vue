<script setup lang="ts">
/**
 * Cart stub — no line items, no create-cart call.
 * Tenant cart routes require auth (`order:write`); public guest carts are Wave 1.
 */
useHead({ title: 'Cart' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-ink">Your cart</h1>
      <p class="mt-2 max-w-lg text-sm text-soft">
        Guest carts are not enabled on the storefront yet. Nothing here creates
        a cart or charges a payment method.
      </p>
    </header>

    <UiEmptyState
      title="Cart is empty"
      description="Add-to-cart will talk to a public commerce API once it exists. Until then this page is a placeholder."
    >
      <UiButton to="/shop" size="sm" variant="primary">Browse shop</UiButton>
      <UiButton to="/checkout" size="sm">Checkout</UiButton>
    </UiEmptyState>
  </div>
</template>
