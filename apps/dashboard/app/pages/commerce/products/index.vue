<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProductStatus, ProductSummary } from '@platform/schemas'

const api = useApi()
const can = useCan()
const config = useRuntimeConfig()

const search = ref('')
const statusFilter = ref<'' | ProductStatus>('')

/**
 * Catalogue fetch is unfiltered by status so the KPI strip and status pills
 * share one source of truth. Status filtering is client-side on this page.
 */
const { data: catalogue, pending } = await useAsyncData(
  'commerce:products',
  () =>
    api.get<ProductSummary[]>('/api/v1/commerce/products', {
      limit: 100,
      search: search.value || undefined,
    }),
  { watch: [search], default: () => [] as ProductSummary[] },
)

const products = computed(() => {
  const rows = catalogue.value ?? []
  if (!statusFilter.value) return rows
  return rows.filter((product) => product.status === statusFilter.value)
})

function mediaSrc(url: string) {
  return url.startsWith('/') ? `${config.public.coreApiUrl}${url}` : url
}

const STATUS_TONE = { draft: 'neutral', active: 'positive', archived: 'warning' } as const

const counts = computed(() => {
  const rows = catalogue.value ?? []
  return {
    total: rows.length,
    active: rows.filter((p) => p.status === 'active').length,
    draft: rows.filter((p) => p.status === 'draft').length,
    archived: rows.filter((p) => p.status === 'archived').length,
    lowStock: rows.filter((p) => p.inventoryQuantity > 0 && p.inventoryQuantity <= 5).length,
    outOfStock: rows.filter((p) => p.inventoryQuantity <= 0).length,
  }
})

const showKpis = computed(() => !pending.value && counts.value.total > 0)

const STATUS_PILLS: { label: string; value: '' | ProductStatus; count: () => number }[] = [
  { label: 'All', value: '', count: () => counts.value.total },
  { label: 'Active', value: 'active', count: () => counts.value.active },
  { label: 'Draft', value: 'draft', count: () => counts.value.draft },
  { label: 'Archived', value: 'archived', count: () => counts.value.archived },
]

const countLabel = computed(() => {
  const n = products.value.length
  if (statusFilter.value) {
    return `${n} ${statusFilter.value} product${n === 1 ? '' : 's'}`
  }
  return `${n} product${n === 1 ? '' : 's'}`
})
</script>

<template>
  <div>
    <UiPageHeader title="Products" :description="countLabel">
      <template #actions>
        <UiButton v-if="can('commerce:write')" size="sm" variant="primary" to="/commerce/products/new">
          New product
        </UiButton>
      </template>
    </UiPageHeader>

    <section v-if="showKpis" class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStat label="Products" :value="counts.total" :hint="`${counts.active} active`" />
      <UiStat label="Drafts" :value="counts.draft" hint="Not visible in the store" />
      <UiStat
        label="Low stock"
        :value="counts.lowStock"
        hint="5 or fewer units"
      />
      <UiStat
        label="Out of stock"
        :value="counts.outOfStock"
        :hint="counts.archived ? `${counts.archived} archived` : 'Across all variants'"
      />
    </section>

    <div class="mb-3 flex flex-wrap items-center gap-2">
      <div class="min-w-56 max-w-sm flex-1">
        <UiInput v-model="search" placeholder="Search products" />
      </div>
      <div
        class="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-raised p-0.5"
        role="tablist"
        aria-label="Filter by status"
      >
        <button
          v-for="pill in STATUS_PILLS"
          :key="pill.value || 'all'"
          type="button"
          role="tab"
          :aria-selected="statusFilter === pill.value"
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors"
          :class="
            statusFilter === pill.value
              ? 'bg-sunken text-ink shadow-sm'
              : 'text-soft hover:bg-sunken/60 hover:text-ink'
          "
          @click="statusFilter = pill.value"
        >
          {{ pill.label }}
          <span
            class="tabular-nums"
            :class="statusFilter === pill.value ? 'text-faint' : 'text-faint/80'"
          >
            {{ pill.count() }}
          </span>
        </button>
      </div>
    </div>

    <UiEmptyState
      v-if="!pending && !catalogue?.length"
      title="No products yet"
      description="Open a product detail page to set title, media, pricing and collections."
    >
      <UiButton v-if="can('commerce:write')" variant="primary" to="/commerce/products/new">
        New product
      </UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="!pending && !products.length"
      title="No matching products"
      description="Try another status filter or clear the search."
    >
      <UiButton size="sm" @click="statusFilter = ''; search = ''">Clear filters</UiButton>
    </UiEmptyState>

    <UiCard v-else :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-line bg-sunken/40 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint">
              <th class="px-4 py-2.5 font-semibold">Product</th>
              <th class="px-3 py-2.5 font-semibold">Status</th>
              <th class="px-3 py-2.5 font-semibold text-right">Inventory</th>
              <th class="px-3 py-2.5 font-semibold text-right">Variants</th>
              <th class="px-4 py-2.5 font-semibold text-right">Price</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr
              v-for="product in products"
              :key="product.id"
              class="group transition-colors hover:bg-sunken/50"
            >
              <td class="px-4 py-2.5">
                <NuxtLink
                  :to="`/commerce/products/${product.id}`"
                  class="flex min-w-0 items-center gap-3 no-underline"
                >
                  <span
                    class="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-sunken"
                    aria-hidden="true"
                  >
                    <img
                      v-if="product.image"
                      :src="mediaSrc(product.image.url)"
                      :alt="product.image.alt"
                      class="h-full w-full object-cover"
                    />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-medium text-ink group-hover:underline">
                      {{ product.title }}
                    </span>
                    <span class="block truncate text-[0.8125rem] text-faint">
                      /{{ product.handle }}
                    </span>
                  </span>
                </NuxtLink>
              </td>
              <td class="px-3 py-2.5">
                <UiBadge :tone="STATUS_TONE[product.status]">{{ product.status }}</UiBadge>
              </td>
              <td
                class="px-3 py-2.5 text-right tabular-nums"
                :class="product.inventoryQuantity <= 0 ? 'text-danger' : 'text-ink'"
              >
                {{ product.inventoryQuantity }}
              </td>
              <td class="px-3 py-2.5 text-right tabular-nums text-soft">
                {{ product.variantCount }}
              </td>
              <td class="px-4 py-2.5 text-right tabular-nums text-ink">
                <span class="inline-flex items-center gap-2">
                  {{ product.priceFrom ? formatMoney(product.priceFrom) : '—' }}
                  <UiButton
                    size="sm"
                    class="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    :to="`/commerce/products/${product.id}`"
                  >
                    Edit
                  </UiButton>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>
