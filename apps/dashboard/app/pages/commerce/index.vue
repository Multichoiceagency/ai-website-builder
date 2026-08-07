<script setup lang="ts">
import { computed } from 'vue'
import type { CommerceStatus, CustomerSummary, OrderSummary, ProductSummary } from '@platform/schemas'

const api = useApi()

const { data: status } = await useAsyncData('commerce:status', () =>
  api.get<CommerceStatus>('/api/v1/commerce/status'),
)

const { data: products } = await useAsyncData(
  'commerce:overview:products',
  () => api.get<ProductSummary[]>('/api/v1/commerce/products', { limit: 100 }),
  { default: () => [] as ProductSummary[] },
)

const { data: orders } = await useAsyncData(
  'commerce:overview:orders',
  () => api.get<OrderSummary[]>('/api/v1/commerce/orders', { limit: 50 }),
  { default: () => [] as OrderSummary[] },
)

const { data: customers } = await useAsyncData(
  'commerce:overview:customers',
  () => api.get<CustomerSummary[]>('/api/v1/commerce/customers', { limit: 100 }),
  { default: () => [] as CustomerSummary[] },
)

const currency = computed(() => orders.value?.[0]?.currency ?? 'EUR')

/** Revenue is net of refunds and excludes cancellations — the number a merchant acts on. */
const revenue = computed(() => ({
  amount: (orders.value ?? [])
    .filter((order) => order.status !== 'cancelled')
    .reduce((total, order) => total + order.total.amount - order.refundedTotal.amount, 0),
  currency: currency.value,
}))

const liveProducts = computed(() => (products.value ?? []).filter((product) => product.status === 'active').length)
const needsAttention = computed(() => (orders.value ?? []).filter((order) => order.status === 'pending'))

const STATUS_TONE = {
  pending: 'warning',
  paid: 'brand',
  fulfilled: 'positive',
  cancelled: 'neutral',
  refunded: 'danger',
} as const
</script>

<template>
  <div>
    <UiPageHeader title="Commerce" description="Catalogue, orders and customers for this workspace.">
      <template #actions>
        <UiButton size="sm" to="/commerce/products">Products</UiButton>
        <UiButton size="sm" variant="primary" to="/commerce/orders">Orders</UiButton>
      </template>
    </UiPageHeader>

    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStat label="Revenue" :value="formatMoney(revenue)" hint="Net of refunds" />
      <UiStat label="Orders" :value="orders?.length ?? 0" :hint="`${needsAttention.length} awaiting payment`" />
      <UiStat label="Products" :value="products?.length ?? 0" :hint="`${liveProducts} live`" />
      <UiStat label="Customers" :value="customers?.length ?? 0" hint="With at least one order" />
    </section>

    <!--
      Providers, stated rather than assumed. An unconfigured payment gateway is
      something a merchant should see here, not discover at checkout.
    -->
    <section v-if="status" class="mt-8">
      <h2 class="mb-3 text-[0.9375rem] font-semibold text-ink">Connections</h2>
      <UiCard :padded="false">
        <ul class="divide-y divide-line">
          <li class="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p class="text-sm font-medium text-ink">Commerce engine</p>
              <p class="text-[0.8125rem] text-faint">
                {{ status.commerce.reason ?? status.commerce.capabilities.slice(0, 4).join(' · ') }}
              </p>
            </div>
            <UiBadge :tone="status.commerce.configured ? 'positive' : 'neutral'">
              {{ status.commerce.id }}
            </UiBadge>
          </li>
          <li
            v-for="provider in [...status.payments, ...status.shipping]"
            :key="provider.id"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium capitalize text-ink">{{ provider.id }}</p>
              <p class="truncate text-[0.8125rem] text-faint">
                {{ provider.reason ?? provider.capabilities.join(' · ') }}
              </p>
            </div>
            <UiBadge :tone="provider.configured ? 'positive' : 'neutral'">
              {{ provider.configured ? 'Connected' : 'Not configured' }}
            </UiBadge>
          </li>
        </ul>
      </UiCard>
    </section>

    <section class="mt-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-[0.9375rem] font-semibold text-ink">Recent orders</h2>
        <NuxtLink to="/commerce/orders" class="text-[0.8125rem] text-soft no-underline hover:text-ink">
          All orders
        </NuxtLink>
      </div>

      <UiEmptyState
        v-if="!orders?.length"
        title="No orders yet"
        description="Add a product and place a test order to see it here."
      >
        <UiButton variant="primary" to="/commerce/products">Add a product</UiButton>
      </UiEmptyState>

      <UiCard v-else :padded="false">
        <ul class="divide-y divide-line">
          <li
            v-for="order in orders.slice(0, 8)"
            :key="order.id"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-ink">#{{ order.number }} · {{ order.email }}</p>
              <p class="text-[0.8125rem] text-faint">
                {{ order.itemCount }} item{{ order.itemCount === 1 ? '' : 's' }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="text-sm tabular-nums text-ink">{{ formatMoney(order.total) }}</span>
              <UiBadge :tone="STATUS_TONE[order.status]">{{ order.status }}</UiBadge>
            </div>
          </li>
        </ul>
      </UiCard>
    </section>
  </div>
</template>
