<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from '@platform/schemas'
import type { ProductFormPayload } from '../../../components/commerce/product-form'

const route = useRoute()
const api = useApi()
const productId = computed(() => route.params.productId as string)

const busy = ref(false)
const error = ref('')

const { data: product, refresh, pending } = await useAsyncData(
  () => `commerce:product:${productId.value}`,
  () => api.get<Product>(`/api/v1/commerce/products/${productId.value}`),
  { watch: [productId] },
)

async function save(payload: ProductFormPayload) {
  const price = parseMoneyInput(payload.variant.price)
  if (!price) {
    error.value = 'Enter a price like 19,99.'
    return
  }

  const compareAtPrice = payload.variant.compareAtPrice
    ? parseMoneyInput(payload.variant.compareAtPrice)
    : null

  error.value = ''
  busy.value = true
  try {
    await api.patch<Product>(`/api/v1/commerce/products/${productId.value}`, {
      title: payload.title,
      handle: payload.handle || undefined,
      description: payload.description,
      status: payload.status,
      taxRateBps: payload.taxRateBps,
      images: payload.images,
      collectionIds: payload.collectionIds,
      variants: [
        {
          id: payload.variant.id,
          title: payload.variant.title,
          sku: payload.variant.sku || undefined,
          price,
          compareAtPrice,
          weightGrams: payload.variant.weightGrams,
        },
      ],
    })
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save the product.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!product.value) return
  busy.value = true
  error.value = ''
  try {
    await api.del(`/api/v1/commerce/products/${productId.value}`)
    await navigateTo('/commerce/products')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not delete the product.'
  } finally {
    busy.value = false
  }
}

function discard() {
  void navigateTo('/commerce/products')
}
</script>

<template>
  <div>
    <p v-if="pending" class="py-16 text-center type-caption-12 text-faint">Loading product…</p>
    <CommerceProductEditor
      v-else-if="product"
      :product="product"
      :busy="busy"
      :error="error"
      @save="save"
      @discard="discard"
      @remove="remove"
    />
    <UiEmptyState
      v-else
      title="Product not found"
      description="It may have been deleted, or the link is wrong."
    >
      <UiButton to="/commerce/products">Back to products</UiButton>
    </UiEmptyState>
  </div>
</template>
