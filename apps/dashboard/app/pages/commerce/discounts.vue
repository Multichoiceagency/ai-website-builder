<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Discount, DiscountType } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: discounts, refresh, pending } = await useAsyncData(
  'commerce:discounts',
  () => api.get<Discount[]>('/api/v1/commerce/discounts'),
  { default: () => [] as Discount[] },
)

const creating = ref(false)
const busy = ref(false)
const error = ref('')

const form = ref({
  code: '',
  type: 'percentage' as DiscountType,
  percentage: '10',
  amount: '',
  minimumSubtotal: '',
  stackable: false,
  usageLimit: '',
})

const TYPE_OPTIONS = [
  { label: 'Percentage off', value: 'percentage' },
  { label: 'Fixed amount off', value: 'fixed' },
  { label: 'Free shipping', value: 'free_shipping' },
]

function openNew() {
  form.value = {
    code: '',
    type: 'percentage',
    percentage: '10',
    amount: '',
    minimumSubtotal: '',
    stackable: false,
    usageLimit: '',
  }
  error.value = ''
  creating.value = true
}

const canSave = computed(() => {
  if (form.value.code.trim().length < 2) return false
  if (form.value.type === 'percentage') return Number(form.value.percentage) > 0
  if (form.value.type === 'fixed') return parseMoneyInput(form.value.amount) !== null
  return true
})

async function create() {
  error.value = ''
  busy.value = true

  try {
    await api.post<Discount>('/api/v1/commerce/discounts', {
      code: form.value.code.trim().toUpperCase(),
      type: form.value.type,
      // Basis points, so 12.5% survives the trip without becoming a float
      // problem: 1250, not 0.125.
      ...(form.value.type === 'percentage'
        ? { percentageBps: Math.round(Number(form.value.percentage) * 100) }
        : {}),
      ...(form.value.type === 'fixed' ? { amount: parseMoneyInput(form.value.amount) } : {}),
      ...(form.value.minimumSubtotal
        ? { minimumSubtotal: parseMoneyInput(form.value.minimumSubtotal) }
        : {}),
      stackable: form.value.stackable,
      ...(form.value.usageLimit ? { usageLimit: Number(form.value.usageLimit) } : {}),
    })

    creating.value = false
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the discount.'
  } finally {
    busy.value = false
  }
}

async function toggle(discount: Discount) {
  await api.patch(`/api/v1/commerce/discounts/${discount.id}`, { active: !discount.active })
  await refresh()
}

async function remove(discount: Discount) {
  await api.del(`/api/v1/commerce/discounts/${discount.id}`)
  await refresh()
}

function describe(discount: Discount): string {
  if (discount.type === 'percentage') return `${(discount.percentageBps ?? 0) / 100}% off`
  if (discount.type === 'fixed') return `${formatMoney(discount.amount)} off`
  return 'Free shipping'
}
</script>

<template>
  <div>
    <UiPageHeader title="Discounts" description="Codes shoppers enter at checkout.">
      <template #actions>
        <UiButton v-if="can('commerce:write')" size="sm" variant="primary" @click="openNew">New discount</UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!pending && !discounts?.length"
      title="No discount codes"
      description="A code can take a percentage, a fixed amount, or the shipping cost off a cart."
    >
      <UiButton variant="primary" @click="openNew">New discount</UiButton>
    </UiEmptyState>

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="discount in discounts"
          :key="discount.id"
          class="flex items-center justify-between gap-4 px-4 py-3.5"
        >
          <div class="min-w-0">
            <p class="flex items-center gap-2 text-sm font-medium text-ink">
              <span class="rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.8125rem]">{{ discount.code }}</span>
              {{ describe(discount) }}
            </p>
            <p class="mt-0.5 truncate text-[0.8125rem] text-faint">
              <!--
                Stacking is the rule shoppers argue about, so it is stated on
                the row rather than hidden in an edit screen.
              -->
              {{ discount.stackable ? 'Combines with other codes' : 'Cannot be combined' }}
              <template v-if="discount.minimumSubtotal">
                · from {{ formatMoney(discount.minimumSubtotal) }}
              </template>
              <template v-if="discount.usageLimit">
                · used {{ discount.usageCount }}/{{ discount.usageLimit }}
              </template>
              <template v-else-if="discount.usageCount"> · used {{ discount.usageCount }}× </template>
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <UiBadge :tone="discount.active ? 'positive' : 'neutral'">
              {{ discount.active ? 'Active' : 'Paused' }}
            </UiBadge>
            <UiButton v-if="can('commerce:write')" size="sm" @click="toggle(discount)">
              {{ discount.active ? 'Pause' : 'Activate' }}
            </UiButton>
            <UiButton v-if="can('commerce:write')" size="sm" variant="ghost" @click="remove(discount)">
              Delete
            </UiButton>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiDialog v-model:open="creating" title="New discount">
      <form class="flex flex-col gap-4" @submit.prevent="create">
        <UiField v-slot="{ id }" label="Code" help="Shoppers type this at checkout." required>
          <UiInput :id="id" v-model="form.code" placeholder="SUMMER25" />
        </UiField>

        <UiField v-slot="{ id }" label="Type">
          <UiSelect :id="id" v-model="form.type" :options="TYPE_OPTIONS" />
        </UiField>

        <UiField v-if="form.type === 'percentage'" v-slot="{ id }" label="Percentage off" required>
          <UiInput :id="id" v-model="form.percentage" placeholder="25" />
        </UiField>

        <UiField v-if="form.type === 'fixed'" v-slot="{ id }" label="Amount off" required>
          <UiInput :id="id" v-model="form.amount" placeholder="10,00" />
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField v-slot="{ id }" label="Minimum order" help="Leave empty for none.">
            <UiInput :id="id" v-model="form.minimumSubtotal" placeholder="50,00" />
          </UiField>

          <UiField v-slot="{ id }" label="Usage limit" help="Total redemptions.">
            <UiInput :id="id" v-model="form.usageLimit" placeholder="100" />
          </UiField>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <div>
            <p class="text-sm text-ink">Combine with other codes</p>
            <p class="text-[0.8125rem] text-faint">
              When off, this code applies alone and suppresses the rest.
            </p>
          </div>
          <UiSwitch v-model="form.stackable" label="Combine with other codes" />
        </div>

        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ error }}
        </p>
      </form>

      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!canSave" @click="create">Create</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
