<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product, ProductStatus, ProductSummary } from '@platform/schemas'

const api = useApi()
const can = useCan()

const search = ref('')
const statusFilter = ref<'' | ProductStatus>('')

const { data: products, refresh, pending } = await useAsyncData(
  'commerce:products',
  () =>
    api.get<ProductSummary[]>('/api/v1/commerce/products', {
      limit: 100,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
    }),
  { watch: [search, statusFilter], default: () => [] as ProductSummary[] },
)

// region Editor

const editing = ref(false)
const busy = ref(false)
const error = ref('')

/** The product under the editor. `null` means "new". */
const current = ref<Product | null>(null)
const form = ref({ title: '', price: '', sku: '', status: 'draft' as ProductStatus, description: '' })

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Live', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

const FILTER_OPTIONS = [{ label: 'All products', value: '' }, ...STATUS_OPTIONS]

function openNew() {
  current.value = null
  form.value = { title: '', price: '', sku: '', status: 'draft', description: '' }
  error.value = ''
  editing.value = true
}

async function openExisting(summary: ProductSummary) {
  error.value = ''
  const product = await api.get<Product>(`/api/v1/commerce/products/${summary.id}`)
  current.value = product

  const variant = product.variants[0]
  form.value = {
    title: product.title,
    // Cents come back from the API; this is the one place they become a decimal.
    price: variant ? (variant.price.amount / 100).toFixed(2) : '',
    sku: variant?.sku ?? '',
    status: product.status,
    description: product.description,
  }
  editing.value = true
}

const priceValid = computed(() => parseMoneyInput(form.value.price) !== null)
const canSave = computed(() => form.value.title.trim().length > 0 && priceValid.value)

async function save() {
  const price = parseMoneyInput(form.value.price)
  if (!price) {
    error.value = 'Enter a price like 19,99.'
    return
  }

  error.value = ''
  busy.value = true

  // One variant per product in this editor. The API models many; the form
  // covers the case that is 90% of a small catalogue, and does not pretend the
  // rest does not exist — it simply keeps the variant it already has.
  const variant = {
    title: current.value?.variants[0]?.title ?? 'Default',
    sku: form.value.sku || undefined,
    price,
    ...(current.value?.variants[0] ? { id: current.value.variants[0].id } : {}),
  }

  try {
    if (current.value) {
      await api.patch<Product>(`/api/v1/commerce/products/${current.value.id}`, {
        title: form.value.title,
        description: form.value.description,
        status: form.value.status,
        variants: [variant],
      })
    } else {
      await api.post<Product>('/api/v1/commerce/products', {
        title: form.value.title,
        description: form.value.description,
        status: form.value.status,
        variants: [variant],
      })
    }

    editing.value = false
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save the product.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!current.value) return
  busy.value = true
  try {
    await api.del(`/api/v1/commerce/products/${current.value.id}`)
    editing.value = false
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not delete the product.'
  } finally {
    busy.value = false
  }
}

// endregion

const STATUS_TONE = { draft: 'neutral', active: 'positive', archived: 'warning' } as const
</script>

<template>
  <div>
    <UiPageHeader title="Products" :description="`${products?.length ?? 0} product(s) in the catalogue`">
      <template #actions>
        <UiButton v-if="can('commerce:write')" size="sm" variant="primary" @click="openNew">New product</UiButton>
      </template>
    </UiPageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="min-w-56 flex-1">
        <UiInput v-model="search" placeholder="Search by name or handle" />
      </div>
      <div class="w-44">
        <UiSelect v-model="statusFilter" :options="FILTER_OPTIONS" />
      </div>
    </div>

    <UiEmptyState
      v-if="!pending && !products?.length"
      title="No products yet"
      description="A product needs a name and a price. Variants, stock and collections come after."
    >
      <UiButton variant="primary" @click="openNew">New product</UiButton>
    </UiEmptyState>

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="product in products"
          :key="product.id"
          class="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60"
        >
          <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="openExisting(product)">
            <span
              class="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-sunken"
              aria-hidden="true"
            >
              <img v-if="product.image" :src="product.image.url" :alt="product.image.alt" class="h-full w-full object-cover" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-ink">{{ product.title }}</span>
              <span class="block truncate text-[0.8125rem] text-faint">
                /{{ product.handle }} · {{ product.variantCount }} variant{{ product.variantCount === 1 ? '' : 's' }}
              </span>
            </span>
          </button>

          <div class="flex shrink-0 items-center gap-3">
            <span class="text-sm tabular-nums text-ink">{{ formatMoney(product.priceFrom) }}</span>
            <span
              class="hidden text-[0.8125rem] tabular-nums sm:inline"
              :class="product.inventoryQuantity <= 0 ? 'text-danger' : 'text-faint'"
            >
              {{ product.inventoryQuantity }} in stock
            </span>
            <UiBadge :tone="STATUS_TONE[product.status]">{{ product.status }}</UiBadge>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiDialog v-model:open="editing" :title="current ? current.title : 'New product'" wide>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <UiField v-slot="{ id }" label="Product name" required>
          <UiInput :id="id" v-model="form.title" placeholder="Merino scarf" />
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField
            v-slot="{ id, describedBy }"
            label="Price"
            help="Including VAT, e.g. 19,99"
            :error="form.price && !priceValid ? 'Use digits and at most two decimals.' : ''"
            required
          >
            <UiInput :id="id" v-model="form.price" :described-by="describedBy" :invalid="Boolean(form.price) && !priceValid" placeholder="19,99" />
          </UiField>

          <UiField v-slot="{ id }" label="SKU">
            <UiInput :id="id" v-model="form.sku" placeholder="SCARF-001" />
          </UiField>
        </div>

        <UiField v-slot="{ id }" label="Status">
          <UiSelect :id="id" v-model="form.status" :options="STATUS_OPTIONS" />
        </UiField>

        <UiField v-slot="{ id }" label="Description">
          <UiTextarea :id="id" v-model="form.description" :rows="4" placeholder="What it is, who it is for." />
        </UiField>

        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ error }}
        </p>
      </form>

      <template #footer>
        <UiButton v-if="current && can('commerce:write')" variant="danger" :loading="busy" @click="remove">
          Delete
        </UiButton>
        <UiButton @click="editing = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!canSave" @click="save">
          {{ current ? 'Save' : 'Create' }}
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
