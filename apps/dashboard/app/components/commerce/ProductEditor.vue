<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Collection, Product, ProductStatus } from '@platform/schemas'
import type { ProductFormPayload } from './product-form'

/**
 * Shopify-style product detail form — title, media, pricing on the left;
 * status and organisation on the right. Used by /commerce/products/new and
 * /commerce/products/:id.
 */
const props = defineProps<{
  product?: Product | null
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  save: [payload: ProductFormPayload]
  discard: []
  remove: []
}>()

const api = useApi()
const can = useCan()
const config = useRuntimeConfig()

function mediaSrc(url: string) {
  return url.startsWith('/') ? `${config.public.coreApiUrl}${url}` : url
}

const title = ref('')
const handle = ref('')
const description = ref('')
const status = ref<ProductStatus>('draft')
const chargeTax = ref(false)
const taxPercent = ref('21')
const sku = ref('')
const price = ref('')
const compareAt = ref('')
const weightGrams = ref('0')
const images = ref<{ url: string; alt: string }[]>([])
const collectionIds = ref<string[]>([])
const mediaUrl = ref('')
const mediaAlt = ref('')

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

type CardTemplate = 'minimal' | 'commerce' | 'featured' | 'brutal'
const cardTemplate = ref<CardTemplate>('brutal')
const CARD_TEMPLATES: { label: string; value: CardTemplate }[] = [
  { label: 'Minimal', value: 'minimal' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Featured', value: 'featured' },
  { label: 'Brutal (DTC)', value: 'brutal' },
]

const previewImage = computed(() => {
  const url = images.value[0]?.url
  return url ? mediaSrc(url) : ''
})

const priceLabel = computed(() => (price.value.trim() ? `€ ${price.value.trim()}` : ''))
const compareAtLabel = computed(() => (compareAt.value.trim() ? `€ ${compareAt.value.trim()}` : ''))

const { data: collections } = await useAsyncData(
  'commerce:product-editor:collections',
  () => api.get<Collection[]>('/api/v1/commerce/collections', { limit: 100 }),
  { default: () => [] as Collection[] },
)

function hydrate(product: Product | null | undefined) {
  if (!product) {
    title.value = ''
    handle.value = ''
    description.value = ''
    status.value = 'draft'
    chargeTax.value = false
    taxPercent.value = '21'
    sku.value = ''
    price.value = ''
    compareAt.value = ''
    weightGrams.value = '0'
    images.value = []
    collectionIds.value = []
    return
  }

  const variant = product.variants[0]
  title.value = product.title
  handle.value = product.handle
  description.value = product.description
  status.value = product.status
  chargeTax.value = product.taxRateBps > 0
  taxPercent.value = product.taxRateBps > 0 ? (product.taxRateBps / 100).toFixed(0) : '21'
  sku.value = variant?.sku ?? ''
  price.value = variant ? (variant.price.amount / 100).toFixed(2).replace('.', ',') : ''
  compareAt.value = variant?.compareAtPrice
    ? (variant.compareAtPrice.amount / 100).toFixed(2).replace('.', ',')
    : ''
  weightGrams.value = String(variant?.weightGrams ?? 0)
  images.value = product.images.map((image) => ({ ...image }))
  collectionIds.value = [...product.collectionIds]
}

watch(
  () => props.product,
  (value) => hydrate(value),
  { immediate: true },
)

const priceValid = computed(() => !price.value || parseMoneyInput(price.value) !== null)
const compareValid = computed(() => !compareAt.value || parseMoneyInput(compareAt.value) !== null)
const canSave = computed(
  () =>
    can('commerce:write') &&
    title.value.trim().length > 0 &&
    parseMoneyInput(price.value) !== null &&
    compareValid.value,
)

const dirtyHint = computed(() => (props.product ? 'Editing product' : 'Unsaved product'))

function toggleCollection(id: string) {
  if (collectionIds.value.includes(id)) {
    collectionIds.value = collectionIds.value.filter((entry) => entry !== id)
    return
  }
  collectionIds.value = [...collectionIds.value, id]
}

function addMedia() {
  const url = mediaUrl.value.trim()
  if (!url) return
  images.value = [...images.value, { url, alt: mediaAlt.value.trim() }]
  mediaUrl.value = ''
  mediaAlt.value = ''
}

function removeMedia(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

function onSave() {
  if (!canSave.value) return
  const taxRateBps = chargeTax.value
    ? Math.round(Math.min(100, Math.max(0, Number(taxPercent.value) || 0)) * 100)
    : 0

  emit('save', {
    title: title.value.trim(),
    handle: handle.value.trim(),
    description: description.value,
    status: status.value,
    taxRateBps,
    images: images.value,
    collectionIds: collectionIds.value,
    variant: {
      id: props.product?.variants[0]?.id,
      title: props.product?.variants[0]?.title ?? 'Default',
      sku: sku.value.trim(),
      price: price.value,
      compareAtPrice: compareAt.value,
      weightGrams: Math.max(0, Number.parseInt(weightGrams.value, 10) || 0),
    },
  })
}
</script>

<template>
  <div class="pb-16">
    <div class="sticky top-0 z-20 -mx-6 mb-6 border-b border-line bg-paper/95 px-6 py-3 backdrop-blur">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <NuxtLink
            to="/commerce/products"
            class="type-button-10 inline-flex items-center gap-1 text-soft no-underline hover:text-ink"
          >
            ← Products
          </NuxtLink>
          <h1 class="type-heading truncate text-ink">
            {{ product ? product.title || 'Product' : 'Add product' }}
          </h1>
          <p class="type-caption-12 text-faint">{{ dirtyHint }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UiButton size="sm" @click="emit('discard')">Discard</UiButton>
          <UiButton
            v-if="product && can('commerce:write')"
            size="sm"
            variant="danger"
            :loading="busy"
            @click="emit('remove')"
          >
            Delete
          </UiButton>
          <UiButton size="sm" variant="primary" :loading="busy" :disabled="!canSave" @click="onSave">
            Save
          </UiButton>
        </div>
      </div>
    </div>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 type-caption-12 text-danger" role="alert">
      {{ error }}
    </p>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <!-- Primary column ------------------------------------------------ -->
      <div class="flex flex-col gap-4">
        <UiCard>
          <div class="flex flex-col gap-4 p-4">
            <UiField v-slot="{ id }" label="Title" required>
              <UiInput :id="id" v-model="title" placeholder="Short sleeve t-shirt" />
            </UiField>
            <UiField v-slot="{ id }" label="Description">
              <UiTextarea
                :id="id"
                v-model="description"
                :rows="8"
                placeholder="What it is, who it is for, what makes it different."
              />
            </UiField>
          </div>
        </UiCard>

        <UiCard>
          <div class="flex flex-col gap-3 p-4">
            <div class="flex items-center justify-between gap-2">
              <p class="type-button text-ink">Media</p>
              <p class="type-caption-12 text-faint">Images for the storefront</p>
            </div>

            <ul v-if="images.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <li
                v-for="(image, index) in images"
                :key="`${image.url}-${index}`"
                class="group relative overflow-hidden rounded-lg border border-line bg-sunken"
              >
                <img
                  :src="mediaSrc(image.url)"
                  :alt="image.alt || title"
                  class="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  class="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 type-button-10 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  @click="removeMedia(index)"
                >
                  Remove
                </button>
              </li>
            </ul>

            <div
              class="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-sunken/40 p-4"
            >
              <p class="type-caption-12 text-soft">
                Paste a media URL or pick from the library, then add it to the gallery.
              </p>
              <div class="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <UiInput v-model="mediaUrl" placeholder="/api/v1/content/public/media/…" />
                <UiInput v-model="mediaAlt" placeholder="Alt text" />
                <UiButton :disabled="!mediaUrl.trim()" @click="addMedia">Add</UiButton>
              </div>
              <UiField v-slot="{ id }" label="Or pick from library">
                <MediaField :id="id" v-model="mediaUrl" folder="products" />
              </UiField>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <div class="flex flex-col gap-4 p-4">
            <p class="type-button text-ink">Pricing</p>
            <div class="grid gap-4 sm:grid-cols-2">
              <UiField
                v-slot="{ id, describedBy }"
                label="Price"
                help="Including VAT when tax is charged"
                :error="price && !priceValid ? 'Use digits and at most two decimals.' : ''"
                required
              >
                <UiInput
                  :id="id"
                  v-model="price"
                  :described-by="describedBy"
                  :invalid="Boolean(price) && !priceValid"
                  placeholder="19,99"
                />
              </UiField>
              <UiField
                v-slot="{ id }"
                label="Compare-at price"
                help="Optional “was” price"
                :error="compareAt && !compareValid ? 'Use digits and at most two decimals.' : ''"
              >
                <UiInput
                  :id="id"
                  v-model="compareAt"
                  :invalid="Boolean(compareAt) && !compareValid"
                  placeholder="29,99"
                />
              </UiField>
            </div>

            <label class="flex items-center gap-2 type-caption-12 text-ink">
              <input v-model="chargeTax" type="checkbox" class="rounded border-line" />
              Charge tax on this product
            </label>
            <div v-if="chargeTax" class="max-w-[8rem]">
              <UiField v-slot="{ id }" label="Tax rate (%)">
                <UiInput :id="id" v-model="taxPercent" placeholder="21" />
              </UiField>
            </div>

            <div class="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <UiField v-slot="{ id }" label="SKU">
                <UiInput :id="id" v-model="sku" placeholder="TSHIRT-001" />
              </UiField>
              <UiField v-slot="{ id }" label="Weight (grams)">
                <UiInput :id="id" v-model="weightGrams" placeholder="250" />
              </UiField>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Sidebar -------------------------------------------------------- -->
      <div class="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <UiCard>
          <div class="flex flex-col gap-3 p-4">
            <div class="flex items-center justify-between gap-2">
              <p class="type-button text-ink">Live preview</p>
              <UiSelect v-model="cardTemplate" :options="CARD_TEMPLATES" aria-label="Card template" />
            </div>
            <CommerceProductCardPreview
              :title="title"
              :price-label="priceLabel"
              :compare-at-label="compareAtLabel"
              :image-url="previewImage"
              :status="status"
              :template="cardTemplate"
            />
          </div>
        </UiCard>

        <UiCard>
          <div class="flex flex-col gap-3 p-4">
            <p class="type-button text-ink">Status</p>
            <UiField v-slot="{ id }" label="Status">
              <UiSelect :id="id" v-model="status" :options="STATUS_OPTIONS" />
            </UiField>
            <p class="type-caption-12 text-soft">
              Draft stays hidden on the storefront. Active is sellable. Archived keeps history.
            </p>
          </div>
        </UiCard>

        <UiCard>
          <div class="flex flex-col gap-3 p-4">
            <p class="type-button text-ink">Product organisation</p>
            <UiField v-slot="{ id }" label="Handle" help="URL slug on the storefront">
              <UiInput :id="id" v-model="handle" placeholder="short-sleeve-t-shirt" />
            </UiField>

            <div v-if="collections?.length" class="flex flex-col gap-2">
              <p class="type-caption-12 font-medium text-ink">Collections</p>
              <label
                v-for="collection in collections"
                :key="collection.id"
                class="flex items-center gap-2 type-caption-12 text-soft"
              >
                <input
                  type="checkbox"
                  class="rounded border-line"
                  :checked="collectionIds.includes(collection.id)"
                  @change="toggleCollection(collection.id)"
                />
                {{ collection.title }}
              </label>
            </div>
            <p v-else class="type-caption-12 text-soft">
              No collections yet —
              <NuxtLink to="/commerce/collections" class="text-brand no-underline">create one</NuxtLink>.
            </p>

            <p
              v-if="product"
              class="border-t border-line pt-3 type-caption-12 text-soft"
            >
              {{ product.inventoryQuantity }} in stock · {{ product.variantCount }} variant{{
                product.variantCount === 1 ? '' : 's'
              }}
            </p>
          </div>
        </UiCard>

        <UiCard>
          <div class="flex flex-col gap-2 p-4">
            <p class="type-button text-ink">Store settings</p>
            <p class="type-caption-12 text-soft">Configure channels that affect this product.</p>
            <ul class="flex flex-col gap-1.5">
              <li>
                <NuxtLink
                  to="/commerce/settings?panel=inventory"
                  class="type-caption-12 text-brand no-underline hover:underline"
                >Inventory</NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/commerce/settings?panel=shipping"
                  class="type-caption-12 text-brand no-underline hover:underline"
                >Shipping</NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/commerce/settings?panel=payments"
                  class="type-caption-12 text-brand no-underline hover:underline"
                >Payments</NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/commerce/settings?panel=taxes"
                  class="type-caption-12 text-brand no-underline hover:underline"
                >Taxes</NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/commerce/collections"
                  class="type-caption-12 text-brand no-underline hover:underline"
                >Collections</NuxtLink>
              </li>
            </ul>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
