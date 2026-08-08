<script setup lang="ts">
import { computed } from 'vue'

/**
 * Live storefront-card preview for the product editor.
 * Templates are local chrome only — not CMS blocks (ADR-0003).
 */
const props = withDefaults(
  defineProps<{
    title: string
    priceLabel: string
    compareAtLabel?: string
    imageUrl?: string
    status: string
    template?: 'minimal' | 'commerce' | 'featured' | 'brutal'
  }>(),
  { template: 'commerce', compareAtLabel: '', imageUrl: '' },
)

const displayTitle = computed(() => props.title.trim() || 'Product title')
const isBrutal = computed(() => props.template === 'brutal')
</script>

<template>
  <div
    class="overflow-hidden bg-raised"
    :class="{
      'rounded-xl border border-line shadow-card': !isBrutal,
      'rounded-lg border-2 border-ink shadow-none': isBrutal,
      'ring-1 ring-brand/30': template === 'featured',
    }"
  >
    <div
      class="relative"
      :class="[
        template === 'featured' ? 'aspect-[4/5]' : 'aspect-square',
        isBrutal ? 'bg-[#F4A99A]' : 'bg-sunken',
      ]"
    >
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="displayTitle"
        class="h-full w-full object-cover"
        :class="isBrutal ? 'object-contain p-4' : ''"
      />
      <div
        v-else
        class="grid h-full place-items-center type-caption-12 text-soft"
      >
        No image yet
      </div>
      <span
        v-if="template === 'featured'"
        class="absolute left-2 top-2 rounded-md bg-ink/80 px-2 py-0.5 type-button-10 text-white"
      >
        Featured
      </span>
      <span
        v-if="isBrutal"
        class="absolute left-2 top-2 border-2 border-ink bg-brand px-1.5 py-0.5 type-button-10 font-bold uppercase tracking-wide text-white"
      >
        New
      </span>
      <span
        class="absolute right-2 top-2 capitalize"
        :class="
          isBrutal
            ? 'border-2 border-ink bg-raised px-1.5 py-0.5 type-button-10 font-bold'
            : 'rounded-md bg-raised/95 px-1.5 py-0.5 type-button-10 text-soft'
        "
      >
        {{ status }}
      </span>
    </div>

    <div
      class="flex flex-col gap-1"
      :class="[
        isBrutal ? 'border-t-2 border-ink p-3' : 'p-3',
        template === 'minimal' ? 'items-start' : '',
      ]"
    >
      <p
        class="text-ink"
        :class="{
          'type-button': template === 'featured' || isBrutal,
          'type-caption-12 font-medium': template !== 'featured' && !isBrutal,
          'font-semibold tracking-tight': isBrutal,
        }"
      >
        {{ displayTitle }}
      </p>
      <div class="flex flex-wrap items-baseline gap-2">
        <p class="type-button text-ink" :class="isBrutal ? 'font-bold' : ''">
          {{ priceLabel || '—' }}
        </p>
        <p
          v-if="compareAtLabel"
          class="type-caption-12 text-soft line-through"
        >
          {{ compareAtLabel }}
        </p>
      </div>
      <button
        v-if="template !== 'minimal'"
        type="button"
        tabindex="-1"
        class="mt-2 w-full cursor-default px-3 py-2 type-button-10"
        :class="
          isBrutal
            ? 'border-2 border-ink bg-ink font-bold uppercase tracking-wide text-white'
            : 'rounded-md bg-brand text-white'
        "
      >
        {{ isBrutal ? 'Add to bag' : 'Add to cart' }}
      </button>
    </div>
  </div>
</template>
