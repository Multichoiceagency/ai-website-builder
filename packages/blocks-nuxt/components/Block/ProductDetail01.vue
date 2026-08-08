<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isIconName, type IconName } from '@platform/blocks'

interface GalleryImage {
  image: string
  alt: string
}

interface FeatureTag {
  label: string
}

interface OptionGroup {
  label: string
  choices: string
}

interface PurchasePlan {
  title: string
  price: string
  compareAt: string
  badge: string
  description: string
}

interface TrustItem {
  icon: string
  label: string
}

interface Choice {
  label: string
  icon: IconName
  hint: string
}

const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title?: string
    subtitle?: string
    rating?: string
    ratingCount?: string
    priceLine?: string
    featureTags?: FeatureTag[]
    gallery?: GalleryImage[]
    galleryPanelColor?: string
    optionGroups?: OptionGroup[]
    purchasePlans?: PurchasePlan[]
    ctaLabel?: string
    ctaHref?: string
    trustItems?: TrustItem[]
    thickBorders?: boolean
  }>(),
  {
    eyebrow: '',
    title: '',
    subtitle: '',
    rating: '',
    ratingCount: '',
    priceLine: '',
    featureTags: () => [],
    gallery: () => [],
    galleryPanelColor: '',
    optionGroups: () => [],
    purchasePlans: () => [],
    ctaLabel: 'Add to bag',
    ctaHref: '#',
    trustItems: () => [],
    thickBorders: true,
  },
)

const activeImage = ref(0)
const selectedChoices = ref<Record<number, number>>({})
const selectedPlan = ref(0)

watch(
  () => props.optionGroups,
  (groups) => {
    const next: Record<number, number> = {}
    groups.forEach((_, index) => {
      next[index] = selectedChoices.value[index] ?? (index === 0 ? 1 : 0)
    })
    selectedChoices.value = next
  },
  { immediate: true },
)

watch(
  () => props.purchasePlans,
  (plans) => {
    const featured = plans.findIndex((plan) => plan.badge?.trim())
    selectedPlan.value = featured >= 0 ? featured : 0
  },
  { immediate: true },
)

const images = computed(() =>
  props.gallery.filter((entry) => entry.image?.trim() || entry.alt?.trim()),
)

const currentImage = computed(() => images.value[activeImage.value] ?? images.value[0] ?? null)

const panelStyle = computed(() => {
  const color = props.galleryPanelColor.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return { backgroundColor: color }
  return { backgroundColor: 'color-mix(in oklab, var(--site-accent) 35%, var(--site-surface-alt))' }
})

const borderClass = computed(() =>
  props.thickBorders
    ? 'border-2 border-[var(--site-text)]'
    : 'border border-[var(--site-line)]',
)

function parseChoices(raw: string): Choice[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', iconRaw = 'package', hint = ''] = line.split('|').map((part) => part.trim())
      const iconName = isIconName(iconRaw) ? iconRaw : 'package'
      return { label, icon: iconName, hint }
    })
    .filter((choice) => choice.label)
}

const starCount = computed(() => {
  const value = Number.parseFloat(props.rating)
  if (!Number.isFinite(value)) return 5
  return Math.min(5, Math.max(0, Math.round(value)))
})

const activeCtaPrice = computed(() => {
  const plan = props.purchasePlans[selectedPlan.value]
  return plan?.price?.trim() || ''
})

const ctaDisplay = computed(() => {
  const label = props.ctaLabel.trim()
  if (!activeCtaPrice.value || label.includes(activeCtaPrice.value)) return label
  return label.replace(/\$[\d.,]+/, activeCtaPrice.value)
})
</script>

<template>
  <div class="w-full bg-[var(--site-surface)] text-[var(--site-text)]">
    <div class="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-14">
      <!-- Gallery -->
      <div class="flex flex-col gap-3">
        <div
          class="relative aspect-[4/5] overflow-hidden"
          :class="borderClass"
          :style="{ ...panelStyle, borderRadius: 'calc(var(--site-radius) * 1.25)' }"
        >
          <img
            v-if="currentImage?.image"
            :src="currentImage.image"
            :alt="currentImage.alt || title"
            class="absolute inset-0 h-full w-full object-contain p-6 sm:p-10"
          />
          <div
            v-else
            class="absolute inset-0 grid place-items-center px-6 text-center text-[0.9375rem] text-[var(--site-text-muted)]"
          >
            Add product photos in the section settings
          </div>
        </div>

        <ul v-if="images.length > 1" class="grid grid-cols-4 gap-2 sm:grid-cols-5">
          <li v-for="(image, index) in images" :key="`${image.image}-${index}`">
            <button
              type="button"
              class="relative aspect-square w-full overflow-hidden bg-[var(--site-surface-alt)] transition-[box-shadow,border-color]"
              :class="[
                borderClass,
                activeImage === index
                  ? 'ring-2 ring-[var(--site-primary)] ring-offset-2 ring-offset-[var(--site-surface)]'
                  : '',
              ]"
              :style="{ borderRadius: 'calc(var(--site-radius) * 0.85)' }"
              :aria-label="`Show image ${index + 1}`"
              :aria-pressed="activeImage === index"
              @click="activeImage = index"
            >
              <img
                v-if="image.image"
                :src="image.image"
                :alt="image.alt || ''"
                class="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          </li>
        </ul>
      </div>

      <!-- Buy box -->
      <div class="flex flex-col">
        <div v-if="rating || ratingCount" class="flex flex-wrap items-center gap-2">
          <span class="flex items-center gap-0.5 text-[var(--site-primary)]" aria-hidden="true">
            <BlockIcon
              v-for="n in 5"
              :key="n"
              name="star"
              class="h-3.5 w-3.5"
              :class="n <= starCount ? 'opacity-100' : 'opacity-25'"
            />
          </span>
          <span v-if="rating" class="text-[0.875rem] font-semibold tabular-nums">{{ rating }}</span>
          <span v-if="ratingCount" class="text-[0.8125rem] text-[var(--site-text-muted)]">
            {{ ratingCount }}
          </span>
        </div>

        <p
          v-if="eyebrow"
          class="mt-4 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[var(--site-primary)]"
        >
          {{ eyebrow }}
        </p>

        <h1
          v-if="title"
          class="mt-2 text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ title }}
        </h1>

        <p
          v-if="subtitle"
          class="mt-2 text-[1.0625rem] italic leading-relaxed text-[var(--site-text-muted)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ subtitle }}
        </p>

        <ul v-if="featureTags.length" class="mt-5 flex flex-wrap gap-2">
          <li
            v-for="(tag, index) in featureTags"
            :key="`${tag.label}-${index}`"
            class="rounded-md bg-[var(--site-surface)] px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
            :class="borderClass"
          >
            {{ tag.label }}
          </li>
        </ul>

        <p v-if="priceLine" class="mt-5 text-[0.9375rem] font-medium text-[var(--site-text)]">
          {{ priceLine }}
        </p>

        <div
          v-for="(group, groupIndex) in optionGroups"
          :key="`${group.label}-${groupIndex}`"
          class="mt-5 overflow-hidden bg-[var(--site-surface)]"
          :class="borderClass"
          :style="{ borderRadius: 'calc(var(--site-radius) * 1.1)' }"
        >
          <p
            class="border-b px-3 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em]"
            :class="thickBorders ? 'border-[var(--site-text)]' : 'border-[var(--site-line)]'"
          >
            {{ group.label }}
          </p>
          <div class="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
            <button
              v-for="(choice, choiceIndex) in parseChoices(group.choices)"
              :key="`${choice.label}-${choiceIndex}`"
              type="button"
              class="flex flex-col items-center gap-1 rounded-md px-2 py-3 text-center transition-colors"
              :class="[
                borderClass,
                selectedChoices[groupIndex] === choiceIndex
                  ? 'bg-[var(--site-primary)] text-white'
                  : 'bg-[var(--site-surface-alt)] text-[var(--site-text)] hover:bg-[var(--site-surface)]',
              ]"
              :aria-pressed="selectedChoices[groupIndex] === choiceIndex"
              @click="selectedChoices[groupIndex] = choiceIndex"
            >
              <BlockIcon :name="choice.icon" class="h-5 w-5" />
              <span class="text-[0.75rem] font-semibold leading-tight">{{ choice.label }}</span>
              <span
                v-if="choice.hint"
                class="text-[0.625rem] leading-tight opacity-80"
              >{{ choice.hint }}</span>
            </button>
          </div>
        </div>

        <fieldset v-if="purchasePlans.length" class="mt-5 flex flex-col gap-2 border-0 p-0">
          <legend class="sr-only">Purchase options</legend>
          <label
            v-for="(plan, index) in purchasePlans"
            :key="`${plan.title}-${index}`"
            class="relative flex cursor-pointer items-start gap-3 bg-[var(--site-surface)] px-3 py-3 transition-[border-color,box-shadow]"
            :class="[
              borderClass,
              selectedPlan === index ? 'ring-2 ring-[var(--site-primary)] ring-offset-2 ring-offset-[var(--site-surface)]' : '',
            ]"
            :style="{ borderRadius: 'calc(var(--site-radius) * 1.1)' }"
          >
            <input
              v-model="selectedPlan"
              type="radio"
              class="mt-1 accent-[var(--site-primary)]"
              :value="index"
              :name="'product-plan'"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="font-semibold">{{ plan.title }}</span>
                <span
                  v-if="plan.badge"
                  class="rounded-sm bg-[var(--site-primary)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white"
                >{{ plan.badge }}</span>
              </span>
              <span v-if="plan.description" class="mt-0.5 block text-[0.8125rem] text-[var(--site-text-muted)]">
                {{ plan.description }}
              </span>
            </span>
            <span class="shrink-0 text-right">
              <span class="block font-semibold tabular-nums">{{ plan.price }}</span>
              <span
                v-if="plan.compareAt"
                class="block text-[0.8125rem] text-[var(--site-text-muted)] line-through"
              >{{ plan.compareAt }}</span>
            </span>
          </label>
        </fieldset>

        <a
          :href="ctaHref"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[var(--site-text)] px-5 py-4 text-center text-[0.9375rem] font-bold uppercase tracking-[0.04em] text-[var(--site-surface)] transition-opacity hover:opacity-90"
          :class="borderClass"
          :style="{ borderRadius: 'calc(var(--site-radius) * 1.1)' }"
        >
          <BlockIcon name="shopping-cart" class="h-4 w-4" />
          {{ ctaDisplay }}
        </a>

        <ul
          v-if="trustItems.length"
          class="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3"
          :class="thickBorders ? 'border-[var(--site-text)]/20' : 'border-[var(--site-line)]'"
        >
          <li
            v-for="(item, index) in trustItems"
            :key="`${item.label}-${index}`"
            class="flex items-start gap-2.5 text-[0.75rem] leading-snug text-[var(--site-text-muted)]"
          >
            <BlockIcon
              :name="isIconName(item.icon) ? item.icon : 'shield'"
              class="mt-0.5 h-4 w-4 shrink-0 text-[var(--site-text)]"
            />
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
