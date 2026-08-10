<script setup lang="ts">
/**
 * Commerce branch — builder + payments checklist before style / after ads.
 */

const emit = defineEmits<{
  continue: []
  skip: []
}>()

const api = useApi()
const { data: status } = await useAsyncData(
  'onboard-commerce-status',
  () =>
    api
      .get<{
        commerce?: { configured?: boolean; providerId?: string }
        payments?: { configured?: boolean; providers?: { id: string; configured: boolean }[] }
      }>('/api/v1/commerce/status')
      .catch(() => null),
  { lazy: true, default: () => null },
)

const paymentsReady = computed(() =>
  Boolean(status.value?.payments?.configured || status.value?.payments?.providers?.some((p) => p.configured)),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
      <h2 class="text-heading font-semibold text-ink">Set up your store</h2>
      <p class="mt-2 text-[0.8125rem] leading-relaxed text-soft">
        Seed products with the store builder, then confirm payments. Guests can buy on the public shop once products are
        active.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <UiButton variant="primary" to="/commerce/builder" arrow>Store builder</UiButton>
        <UiButton to="/commerce/products">Manage products</UiButton>
        <UiButton to="/commerce/settings">Commerce settings</UiButton>
        <UiButton to="/commerce/payments">Payments</UiButton>
      </div>
    </div>

    <div class="rounded-xl border border-line bg-raised p-5">
      <h3 class="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Checklist</h3>
      <ul class="mt-3 space-y-2 text-sm text-soft">
        <li>{{ status?.commerce?.configured ? '✓' : '○' }} Commerce engine ready</li>
        <li>{{ paymentsReady ? '✓' : '○' }} Payments connected (Mollie / Stripe)</li>
        <li>○ At least one active product</li>
        <li>○ Shipping rate (optional for digital)</li>
      </ul>
      <div class="mt-5 flex flex-wrap gap-2">
        <UiButton variant="primary" @click="emit('continue')">Continue</UiButton>
        <UiButton variant="ghost" @click="emit('skip')">Do this later</UiButton>
      </div>
    </div>
  </div>
</template>
