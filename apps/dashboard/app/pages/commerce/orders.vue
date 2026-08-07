<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Order, OrderStatus, OrderSummary } from '@platform/schemas'

const api = useApi()
const can = useCan()

const statusFilter = ref<'' | OrderStatus>('')
const search = ref('')

const { data: orders, refresh, pending } = await useAsyncData(
  'commerce:orders',
  () =>
    api.get<OrderSummary[]>('/api/v1/commerce/orders', {
      limit: 100,
      status: statusFilter.value || undefined,
      search: search.value || undefined,
    }),
  { watch: [statusFilter, search], default: () => [] as OrderSummary[] },
)

const FILTER_OPTIONS = [
  { label: 'All orders', value: '' },
  { label: 'Awaiting payment', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
]

const STATUS_TONE = {
  pending: 'warning',
  paid: 'brand',
  fulfilled: 'positive',
  cancelled: 'neutral',
  refunded: 'danger',
} as const

/**
 * The same status graph the API enforces. Showing only the legal moves is
 * kinder than offering all five and rejecting four — the server still decides.
 */
const TRANSITIONS: Record<OrderStatus, { label: string; status: OrderStatus }[]> = {
  pending: [
    { label: 'Mark as paid', status: 'paid' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  paid: [
    { label: 'Mark as fulfilled', status: 'fulfilled' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  fulfilled: [],
  cancelled: [],
  refunded: [],
}

const open = ref(false)
const busy = ref(false)
const error = ref('')
const current = ref<Order | null>(null)
const refundAmount = ref('')
const refundReason = ref('')

async function openOrder(summary: OrderSummary) {
  error.value = ''
  refundAmount.value = ''
  refundReason.value = ''
  current.value = await api.get<Order>(`/api/v1/commerce/orders/${summary.id}`)
  open.value = true
}

async function run(work: () => Promise<unknown>, fallback: string) {
  error.value = ''
  busy.value = true
  try {
    await work()
    if (current.value) current.value = await api.get<Order>(`/api/v1/commerce/orders/${current.value.id}`)
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : fallback
  } finally {
    busy.value = false
  }
}

function transition(status: OrderStatus) {
  const order = current.value
  if (!order) return
  return run(
    () => api.post(`/api/v1/commerce/orders/${order.id}/transition`, { status }),
    'Could not change the order status.',
  )
}

function capture() {
  const order = current.value
  if (!order) return
  return run(() => api.post(`/api/v1/commerce/orders/${order.id}/capture`), 'Could not capture the payment.')
}

const refundable = computed(() => {
  if (!current.value) return null
  return {
    amount: current.value.total.amount - current.value.refundedTotal.amount,
    currency: current.value.currency,
  }
})

function refund() {
  const order = current.value
  if (!order) return

  const amount = parseMoneyInput(refundAmount.value, order.currency)
  if (!amount) {
    error.value = 'Enter a refund amount like 12,50.'
    return
  }

  return run(
    () =>
      api.post(`/api/v1/commerce/orders/${order.id}/refunds`, {
        amount,
        reason: refundReason.value || undefined,
      }),
    'Could not create the refund.',
  )
}
</script>

<template>
  <div>
    <UiPageHeader title="Orders" :description="`${orders?.length ?? 0} order(s)`" />

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="min-w-56 flex-1">
        <UiInput v-model="search" placeholder="Search by e-mail or order number" />
      </div>
      <div class="w-52">
        <UiSelect v-model="statusFilter" :options="FILTER_OPTIONS" />
      </div>
    </div>

    <UiEmptyState
      v-if="!pending && !orders?.length"
      title="No orders yet"
      description="Orders placed through the storefront or the API appear here with their full history."
    />

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="order in orders" :key="order.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-sunken/60"
            @click="openOrder(order)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-ink">
                #{{ order.number }} · {{ order.email }}
              </span>
              <span class="block text-[0.8125rem] text-faint">
                {{ new Date(order.placedAt).toLocaleDateString('nl-NL') }} ·
                {{ order.itemCount }} item{{ order.itemCount === 1 ? '' : 's' }}
              </span>
            </span>
            <span class="flex shrink-0 items-center gap-3">
              <span class="text-sm tabular-nums text-ink">{{ formatMoney(order.total) }}</span>
              <UiBadge :tone="STATUS_TONE[order.status]">{{ order.status }}</UiBadge>
            </span>
          </button>
        </li>
      </ul>
    </UiCard>

    <UiDialog v-model:open="open" :title="current ? `Order #${current.number}` : 'Order'" wide>
      <div v-if="current" class="flex flex-col gap-6">
        <section>
          <ul class="divide-y divide-line rounded-lg border border-line">
            <li v-for="item in current.items" :key="item.id" class="flex justify-between gap-4 px-3 py-2.5">
              <span class="min-w-0">
                <span class="block truncate text-sm text-ink">{{ item.title }}</span>
                <span class="block text-[0.8125rem] text-faint">
                  {{ item.quantity }} × {{ formatMoney(item.unitPrice) }}
                </span>
              </span>
              <span class="shrink-0 text-sm tabular-nums text-ink">{{ formatMoney(item.lineTotal) }}</span>
            </li>
          </ul>

          <dl class="mt-3 flex flex-col gap-1 text-sm">
            <div class="flex justify-between text-soft">
              <dt>Subtotal</dt>
              <dd class="tabular-nums">{{ formatMoney(current.totals.subtotal) }}</dd>
            </div>
            <div v-if="current.totals.discountTotal.amount" class="flex justify-between text-soft">
              <dt>Discount</dt>
              <dd class="tabular-nums">−{{ formatMoney(current.totals.discountTotal) }}</dd>
            </div>
            <div class="flex justify-between text-soft">
              <dt>Shipping</dt>
              <dd class="tabular-nums">{{ formatMoney(current.totals.shippingTotal) }}</dd>
            </div>
            <div class="flex justify-between border-t border-line pt-1 font-semibold text-ink">
              <dt>Total</dt>
              <dd class="tabular-nums">{{ formatMoney(current.totals.total) }}</dd>
            </div>
            <div v-if="current.refundedTotal.amount" class="flex justify-between text-danger">
              <dt>Refunded</dt>
              <dd class="tabular-nums">−{{ formatMoney(current.refundedTotal) }}</dd>
            </div>
            <p class="mt-1 text-[0.8125rem] text-faint">
              Includes {{ formatMoney(current.totals.taxTotal) }} VAT.
            </p>
          </dl>
        </section>

        <!-- The timeline is the order's evidence: append-only, server-written. -->
        <section>
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-faint">History</h3>
          <ol class="flex flex-col gap-2">
            <li v-for="entry in current.timeline" :key="entry.id" class="flex items-start gap-3">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span class="min-w-0">
                <span class="block text-sm text-ink">{{ entry.note || entry.status }}</span>
                <span class="block text-[0.8125rem] text-faint">
                  {{ new Date(entry.createdAt).toLocaleString('nl-NL') }} · {{ entry.actorLabel }}
                </span>
              </span>
            </li>
          </ol>
        </section>

        <section v-if="can('order:write') && refundable && refundable.amount > 0">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-faint">
            Refund (up to {{ formatMoney(refundable) }})
          </h3>
          <div class="flex flex-wrap items-end gap-2">
            <div class="w-32">
              <UiField v-slot="{ id }" label="Amount">
                <UiInput :id="id" v-model="refundAmount" placeholder="12,50" />
              </UiField>
            </div>
            <div class="min-w-48 flex-1">
              <UiField v-slot="{ id }" label="Reason">
                <UiInput :id="id" v-model="refundReason" placeholder="Returned damaged" />
              </UiField>
            </div>
            <UiButton :loading="busy" :disabled="!refundAmount" @click="refund">Refund</UiButton>
          </div>
        </section>

        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ error }}
        </p>
      </div>

      <template #footer>
        <UiButton @click="open = false">Close</UiButton>
        <UiButton
          v-if="current && can('order:write') && current.paymentStatus !== 'captured' && current.status === 'pending'"
          :loading="busy"
          @click="capture"
        >
          Capture payment
        </UiButton>
        <UiButton
          v-for="move in current ? TRANSITIONS[current.status] : []"
          :key="move.status"
          :variant="move.status === 'cancelled' ? 'secondary' : 'primary'"
          :loading="busy"
          :disabled="!can('order:write')"
          @click="transition(move.status)"
        >
          {{ move.label }}
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
