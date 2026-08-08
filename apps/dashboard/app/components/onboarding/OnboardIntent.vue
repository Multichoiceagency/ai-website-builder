<script setup lang="ts">
import type { ProductIntent } from '@platform/schemas'
import { Globe, ShoppingBag, Layers } from '@lucide/vue'

/**
 * Step 2 — Website / Store / Both. Gates later commerce (§85) branches.
 */

const model = defineModel<ProductIntent | null>({ default: null })

const emit = defineEmits<{
  continue: [intent: ProductIntent]
}>()

const OPTIONS: {
  value: ProductIntent
  title: string
  description: string
  icon: typeof Globe
}[] = [
  {
    value: 'website',
    title: 'Website',
    description: 'Pages, SEO and growth — no store checkout yet.',
    icon: Globe,
  },
  {
    value: 'store',
    title: 'Online store',
    description: 'Products, cart and payments as the primary goal.',
    icon: ShoppingBag,
  },
  {
    value: 'both',
    title: 'Both',
    description: 'Marketing site plus a shop on the same workspace.',
    icon: Layers,
  },
]

function select(intent: ProductIntent) {
  model.value = intent
}

function submit() {
  if (!model.value) return
  emit('continue', model.value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        class="flex flex-col items-start gap-3 rounded-xl border bg-raised p-5 text-left transition-colors"
        :class="
          model === option.value
            ? 'border-brand ring-2 ring-brand/30'
            : 'border-line hover:border-brand/40'
        "
        @click="select(option.value)"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-lg"
          :class="model === option.value ? 'bg-brand/10 text-brand' : 'bg-sunken text-soft'"
        >
          <component :is="option.icon" class="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span class="block text-[0.9375rem] font-semibold text-ink">{{ option.title }}</span>
          <span class="mt-1 block text-[0.8125rem] leading-relaxed text-soft">
            {{ option.description }}
          </span>
        </span>
      </button>
    </div>

    <UiButton
      variant="primary"
      size="lg"
      class="self-start"
      arrow
      :disabled="!model"
      @click="submit"
    >
      Continue
    </UiButton>
  </div>
</template>
