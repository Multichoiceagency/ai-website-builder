<script setup lang="ts">
import { ref } from 'vue'
import type { Collection } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: collections, refresh, status } = await useAsyncData(
  'commerce:collections',
  () => api.get<Collection[]>('/api/v1/commerce/collections'),
  { default: () => [] as Collection[] },
)

const creating = ref(false)
const title = ref('')
const handle = ref('')
const description = ref('')
const error = ref('')
const busy = ref(false)

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function createCollection() {
  error.value = ''
  const name = title.value.trim()
  if (!name) {
    error.value = 'Title is required.'
    return
  }
  busy.value = true
  try {
    await api.post('/api/v1/commerce/collections', {
      title: name,
      handle: handle.value.trim() || slugify(name) || undefined,
      description: description.value.trim() || undefined,
    })
    creating.value = false
    title.value = ''
    handle.value = ''
    description.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not create the collection.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Collections"
      description="Group products for storefront merchandising and navigation."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton v-if="can('commerce:write')" size="sm" variant="primary" @click="creating = true">
          New collection
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="status === 'pending'" class="type-body-12 text-soft">Loading collections…</p>

    <UiEmptyState
      v-else-if="!collections?.length"
      title="No collections yet"
      description="Create a collection like “Summer” or “Bestsellers”, then attach products from the product editor."
    >
      <UiButton v-if="can('commerce:write')" variant="primary" @click="creating = true">New collection</UiButton>
    </UiEmptyState>

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="entry in collections"
          :key="entry.id"
          class="flex items-center justify-between gap-4 px-4 py-3.5"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-ink">{{ entry.title }}</p>
            <p class="truncate text-[0.8125rem] text-faint">
              /{{ entry.handle }} · {{ entry.productCount }} product{{ entry.productCount === 1 ? '' : 's' }}
            </p>
            <p v-if="entry.description" class="mt-1 line-clamp-2 text-[0.75rem] text-soft">
              {{ entry.description }}
            </p>
          </div>
          <UiButton size="sm" to="/commerce/products">Products</UiButton>
        </li>
      </ul>
    </UiCard>

    <UiDialog
      :open="creating"
      title="New collection"
      description="Collections organise products on the storefront without changing stock."
      @update:open="creating = $event"
    >
      <div class="flex flex-col gap-3">
        <UiField label="Title">
          <template #default="{ id }">
            <UiInput
              :id="id"
              v-model="title"
              placeholder="Summer essentials"
              @update:model-value="(value: string) => { if (!handle) handle = slugify(String(value)) }"
            />
          </template>
        </UiField>
        <UiField label="Handle" help="URL slug for the storefront.">
          <template #default="{ id }">
            <UiInput :id="id" v-model="handle" placeholder="summer-essentials" />
          </template>
        </UiField>
        <UiField label="Description">
          <template #default="{ id }">
            <UiInput :id="id" v-model="description" placeholder="Optional short blurb" />
          </template>
        </UiField>
        <p v-if="error" class="text-[0.8125rem] text-danger" role="alert">{{ error }}</p>
      </div>
      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" @click="createCollection">Create</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
