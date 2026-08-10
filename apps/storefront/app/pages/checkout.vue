<script setup lang="ts">
import type { Checkout, Order } from '@platform/schemas'

const { cart, cartId, refresh, hostOf } = useStorefrontCart()
const email = ref('')
const name = ref('')
const line1 = ref('')
const city = ref('')
const postalCode = ref('')
const busy = ref(false)
const error = ref('')
const order = ref<Order | null>(null)
const checkout = ref<Checkout | null>(null)

onMounted(() => {
  void refresh()
})

async function unwrap<T>(promise: Promise<{ data?: T } | T>): Promise<T> {
  const result = await promise
  if (result && typeof result === 'object' && 'data' in result && (result as { data?: T }).data !== undefined) {
    return (result as { data: T }).data
  }
  return result as T
}

async function placeOrder() {
  error.value = ''
  if (!cartId.value) {
    error.value = 'Your cart is empty.'
    return
  }
  busy.value = true
  try {
    checkout.value = await unwrap<Checkout>(
      $fetch(`/public/commerce/carts/${cartId.value}/checkout`, {
        method: 'POST',
        query: { host: hostOf() },
        body: {
          email: email.value.trim(),
          shippingAddress: {
            name: name.value.trim(),
            line1: line1.value.trim(),
            city: city.value.trim(),
            postalCode: postalCode.value.trim(),
            country: 'NL',
          },
        },
      }),
    )
    order.value = await unwrap<Order>(
      $fetch(`/public/commerce/carts/${cartId.value}/complete`, {
        method: 'POST',
        query: { host: hostOf() },
        body: {
          email: email.value.trim(),
          paymentSessionId: checkout.value.payment?.id,
        },
      }),
    )
    cartId.value = null
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Checkout failed.'
  } finally {
    busy.value = false
  }
}

useHead({ title: 'Checkout' })
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl px-4 py-16">
    <h1 class="text-2xl font-semibold tracking-tight text-ink">Checkout</h1>

    <div v-if="order" class="mt-8 rounded-xl border border-line bg-raised p-6">
      <h2 class="text-lg font-semibold text-ink">Order placed</h2>
      <p class="mt-2 text-sm text-soft">Order {{ order.number }} — thank you.</p>
      <UiButton to="/shop" class="mt-4" size="sm">Back to shop</UiButton>
    </div>

    <form v-else class="mt-8 flex flex-col gap-4" @submit.prevent="placeOrder">
      <p v-if="!cart?.items?.length" class="text-sm text-soft">
        Cart is empty.
        <NuxtLink to="/shop" class="text-brand underline-offset-2 hover:underline">Browse products</NuxtLink>
      </p>

      <UiField v-slot="{ id }" label="Email">
        <UiInput :id="id" v-model="email" type="email" required />
      </UiField>
      <UiField v-slot="{ id }" label="Name">
        <UiInput :id="id" v-model="name" required />
      </UiField>
      <UiField v-slot="{ id }" label="Address">
        <UiInput :id="id" v-model="line1" required />
      </UiField>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-slot="{ id }" label="Postal code">
          <UiInput :id="id" v-model="postalCode" required />
        </UiField>
        <UiField v-slot="{ id }" label="City">
          <UiInput :id="id" v-model="city" required />
        </UiField>
      </div>

      <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
      <p v-else-if="checkout && !checkout.paymentConfigured" class="text-xs text-faint">
        No payment provider configured — order will complete without charging a card.
      </p>

      <UiButton
        type="submit"
        variant="primary"
        size="lg"
        class="self-start"
        :disabled="busy || !cart?.items?.length"
      >
        {{ busy ? 'Placing order…' : 'Place order' }}
      </UiButton>
    </form>
  </div>
</template>
