<script setup lang="ts">
const route = useRoute()
const handle = computed(() => String(route.params.handle || ''))
const { getProduct } = useStorefrontCatalog()
const { addVariant, busy, error: cartError } = useStorefrontCart()

const { data: product, error, pending } = await useAsyncData(
  () => `shop-product:${handle.value}`,
  () => getProduct(handle.value),
  { watch: [handle] },
)

const selectedVariantId = ref('')
watch(
  product,
  (value) => {
    selectedVariantId.value = value?.variants[0]?.id ?? ''
  },
  { immediate: true },
)

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`
  }
}

async function addToCart() {
  if (!selectedVariantId.value) return
  await addVariant(selectedVariantId.value, 1)
  await navigateTo('/cart')
}

useHead(() => ({ title: product.value?.title || 'Product' }))
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <p v-if="pending" class="text-sm text-soft">Loading…</p>
    <p v-else-if="error || !product" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
      Product not found.
    </p>
    <template v-else>
      <NuxtLink to="/shop" class="text-sm text-soft hover:text-ink">← Shop</NuxtLink>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight text-ink">{{ product.title }}</h1>
      <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-soft">{{ product.description }}</p>

      <div class="mt-6">
        <label class="block text-xs font-semibold uppercase tracking-[0.06em] text-faint">Variant</label>
        <select
          v-model="selectedVariantId"
          class="mt-2 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm"
        >
          <option v-for="variant in product.variants" :key="variant.id" :value="variant.id">
            {{ variant.title }}
            —
            {{ formatMoney(variant.price.amount, variant.price.currency) }}
          </option>
        </select>
      </div>

      <p v-if="cartError" class="mt-4 text-sm text-danger" role="alert">{{ cartError }}</p>

      <div class="mt-6 flex flex-wrap gap-3">
        <UiButton variant="primary" size="lg" :disabled="busy || !selectedVariantId" @click="addToCart">
          Add to cart
        </UiButton>
        <UiButton to="/cart" size="lg">View cart</UiButton>
      </div>
    </template>
  </div>
</template>
