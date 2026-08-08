<script setup lang="ts">
/**
 * Shop catalogue stub (Wave 1).
 *
 * Auth commerce lives at `/api/v1/commerce/*` (tenant session). There is no
 * public-by-host catalogue yet (`/public/v1/commerce/...`), so this page is
 * an empty state — not a fake product grid.
 */
useHead({ title: 'Shop' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <header class="mb-8">
      <p class="text-sm font-medium text-faint">Shop</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-ink">Products</h1>
      <p class="mt-2 max-w-lg text-sm text-soft">
        The public storefront catalogue is not wired yet. Products you manage in
        the dashboard will appear here once the host-based commerce API ships.
      </p>
    </header>

    <UiEmptyState
      title="Catalogue unavailable"
      description="No public commerce API is registered for this host. Checkout and cart stay disabled until that lands — nothing here charges a card."
    >
      <UiButton to="/cart" size="sm">View cart</UiButton>
    </UiEmptyState>
  </div>
</template>
