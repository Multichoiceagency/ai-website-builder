<script setup lang="ts">
const { cart, refresh, busy } = useStorefrontCart()

onMounted(() => {
  void refresh()
})

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}

useHead({ title: 'Cart' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <header class="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Your cart</h1>
        <p class="mt-2 text-sm text-soft">Guest cart for this storefront host.</p>
      </div>
      <UiButton to="/shop" size="sm">Continue shopping</UiButton>
    </header>

    <p v-if="busy" class="text-sm text-soft">Updating…</p>

    <UiEmptyState
      v-if="!cart?.items?.length"
      title="Cart is empty"
      description="Add a product from the shop to continue to checkout."
    >
      <UiButton to="/shop" size="sm" variant="primary">Browse shop</UiButton>
    </UiEmptyState>

    <div v-else class="space-y-4">
      <ul class="divide-y divide-line rounded-xl border border-line bg-raised">
        <li v-for="item in cart.items" :key="item.id" class="flex items-start justify-between gap-4 px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-ink">{{ item.title }}</p>
            <p class="text-xs text-faint">Qty {{ item.quantity }}</p>
          </div>
          <p class="text-sm text-soft">
            {{ formatMoney(item.lineTotal.amount, item.lineTotal.currency) }}
          </p>
        </li>
      </ul>
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-ink">
          Total {{ formatMoney(cart.totals.total.amount, cart.currency) }}
        </p>
        <UiButton to="/checkout" variant="primary" size="lg">Checkout</UiButton>
      </div>
    </div>
  </div>
</template>
