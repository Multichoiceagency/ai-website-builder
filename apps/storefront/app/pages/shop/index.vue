<script setup lang="ts">
import type { ProductSummary } from '@platform/schemas'

const { listProducts } = useStorefrontCatalog()

const { data, error, pending } = await useAsyncData('shop-products', () => listProducts(1))

const items = computed(() => data.value?.items ?? ([] as ProductSummary[]))

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}

useHead({ title: 'Shop' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-5xl px-4 py-16">
    <header class="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-faint">Shop</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-ink">Products</h1>
      </div>
      <UiButton to="/cart" size="sm">Cart</UiButton>
    </header>

    <p v-if="pending" class="text-sm text-soft">Loading products…</p>
    <p v-else-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
      Could not load the catalogue for this host.
    </p>
    <UiEmptyState
      v-else-if="!items.length"
      title="No products yet"
      description="Publish products in the dashboard commerce catalog to show them here."
    />
    <ul v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="product in items" :key="product.id">
        <NuxtLink
          :to="`/shop/${product.handle}`"
          class="block rounded-xl border border-line bg-raised p-4 transition-colors hover:border-brand/40"
        >
          <h2 class="text-base font-semibold text-ink">{{ product.title }}</h2>
          <p v-if="product.priceFrom" class="mt-2 text-sm text-soft">
            From {{ formatMoney(product.priceFrom.amount, product.priceFrom.currency) }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
