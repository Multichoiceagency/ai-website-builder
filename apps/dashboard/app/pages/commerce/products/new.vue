<script setup lang="ts">
import { ref } from 'vue'
import type { Product } from '@platform/schemas'
import type { ProductFormPayload } from '../../../components/commerce/product-form'

const api = useApi()
const busy = ref(false)
const error = ref('')

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
    const product = await api.post<Product>('/api/v1/commerce/products', {
      title: payload.title,
      handle: payload.handle || undefined,
      description: payload.description,
      status: payload.status,
      taxRateBps: payload.taxRateBps,
      images: payload.images,
      collectionIds: payload.collectionIds,
      variants: [
        {
          title: payload.variant.title,
          sku: payload.variant.sku || undefined,
          price,
          compareAtPrice,
          weightGrams: payload.variant.weightGrams,
        },
      ],
    })
    await navigateTo(`/commerce/products/${product.id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the product.'
  } finally {
    busy.value = false
  }
}

function discard() {
  void navigateTo('/commerce/products')
}
</script>

<template>
  <CommerceProductEditor :busy="busy" :error="error" @save="save" @discard="discard" />
</template>
