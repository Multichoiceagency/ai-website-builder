<script setup lang="ts">
import { ref } from 'vue'
import type { Customer, CustomerSummary } from '@platform/schemas'

const api = useApi()

const search = ref('')

const { data: customers, pending } = await useAsyncData(
  'commerce:customers',
  () =>
    api.get<CustomerSummary[]>('/api/v1/commerce/customers', {
      limit: 100,
      search: search.value || undefined,
    }),
  { watch: [search], default: () => [] as CustomerSummary[] },
)

const open = ref(false)
const current = ref<Customer | null>(null)

async function openCustomer(summary: CustomerSummary) {
  current.value = await api.get<Customer>(`/api/v1/commerce/customers/${summary.id}`)
  open.value = true
}

function displayName(customer: CustomerSummary): string {
  const name = `${customer.firstName} ${customer.lastName}`.trim()
  return name || customer.email
}

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
    <UiPageHeader
      title="Customers"
      description="Everyone who has ordered, with what they have been worth."
    />

    <div class="mb-4 max-w-md">
      <UiInput v-model="search" placeholder="Search by name or e-mail" />
    </div>

    <UiEmptyState
      v-if="!pending && !customers?.length"
      title="No customers yet"
      description="A customer record is created the first time someone completes a checkout."
    />

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="customer in customers" :key="customer.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-sunken/60"
            @click="openCustomer(customer)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-ink">{{ displayName(customer) }}</span>
              <span class="block truncate text-[0.8125rem] text-faint">{{ customer.email }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-4">
              <span class="hidden text-[0.8125rem] text-faint sm:inline">
                {{ customer.ordersCount }} order{{ customer.ordersCount === 1 ? '' : 's' }}
              </span>
              <!-- Lifetime value: net of refunds, computed from the orders. -->
              <span class="text-sm font-medium tabular-nums text-ink">
                {{ formatMoney(customer.lifetimeValue) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </UiCard>

    <UiDialog v-model:open="open" :title="current ? current.email : 'Customer'" wide>
      <div v-if="current" class="flex flex-col gap-6">
        <section class="grid gap-3 sm:grid-cols-3">
          <UiStat label="Lifetime value" :value="formatMoney(current.lifetimeValue)" />
          <UiStat label="Orders" :value="current.ordersCount" />
          <UiStat
            label="Last order"
            :value="current.lastOrderAt ? new Date(current.lastOrderAt).toLocaleDateString('nl-NL') : '—'"
          />
        </section>

        <section v-if="current.defaultAddress">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-faint">Address</h3>
          <address class="text-sm not-italic leading-relaxed text-soft">
            {{ current.defaultAddress.name }}<br />
            {{ current.defaultAddress.line1 }} {{ current.defaultAddress.line2 }}<br />
            {{ current.defaultAddress.postalCode }} {{ current.defaultAddress.city }}
          </address>
        </section>

        <section>
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-faint">Order history</h3>
          <ul v-if="current.orders.length" class="divide-y divide-line rounded-lg border border-line">
            <li v-for="order in current.orders" :key="order.id" class="flex justify-between gap-4 px-3 py-2.5">
              <span class="min-w-0">
                <span class="block text-sm text-ink">#{{ order.number }}</span>
                <span class="block text-[0.8125rem] text-faint">
                  {{ new Date(order.placedAt).toLocaleDateString('nl-NL') }}
                </span>
              </span>
              <span class="flex shrink-0 items-center gap-3">
                <span class="text-sm tabular-nums text-ink">{{ formatMoney(order.total) }}</span>
                <UiBadge :tone="STATUS_TONE[order.status]">{{ order.status }}</UiBadge>
              </span>
            </li>
          </ul>
          <p v-else class="text-sm text-faint">No orders recorded yet.</p>
        </section>
      </div>

      <template #footer>
        <UiButton @click="open = false">Close</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
