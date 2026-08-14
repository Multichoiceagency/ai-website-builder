<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CmsCollection, CmsEntry } from '@platform/schemas'
import { Database } from '@lucide/vue'

/**
 * First-party CMS collections for layout-canvas data binding.
 * Frappe / WordPress connections live under Settings → CMS.
 */
const api = useApi()
const can = useCan()
const activeSiteId = useActiveSiteId()

const error = ref('')
const busy = ref(false)
const selectedCollectionId = ref<string | null>(null)

const { data: collections, refresh: refreshCollections } = await useAsyncData(
  () => `cms:collections:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<{ collections: CmsCollection[] }>(`/api/v1/sites/${activeSiteId.value}/cms/collections`)
      : Promise.resolve({ collections: [] as CmsCollection[] }),
  { watch: [activeSiteId] },
)

const collectionList = computed(() => collections.value?.collections ?? [])

const { data: entries, refresh: refreshEntries } = await useAsyncData(
  () => `cms:entries:${selectedCollectionId.value}`,
  () =>
    selectedCollectionId.value
      ? api.get<{ entries: CmsEntry[] }>(`/api/v1/cms/collections/${selectedCollectionId.value}/entries`)
      : Promise.resolve({ entries: [] as CmsEntry[] }),
  { watch: [selectedCollectionId] },
)

const entryList = computed(() => entries.value?.entries ?? [])
const selectedCollection = computed(
  () => collectionList.value.find((item) => item.id === selectedCollectionId.value) ?? null,
)

const draftName = ref('')
const draftSlug = ref('')
const entryTitle = ref('')
const entrySlug = ref('')
const entryBody = ref('')
const entryPublished = ref(false)

watch(collectionList, (list) => {
  if (!selectedCollectionId.value && list[0]) selectedCollectionId.value = list[0].id
})

async function createCollection() {
  if (!activeSiteId.value || !can('page:write')) return
  busy.value = true
  error.value = ''
  try {
    const created = await api.post<{ collection: CmsCollection }>(
      `/api/v1/sites/${activeSiteId.value}/cms/collections`,
      { name: draftName.value.trim() || 'Articles', slug: draftSlug.value.trim() || 'articles' },
    )
    draftName.value = ''
    draftSlug.value = ''
    await refreshCollections()
    selectedCollectionId.value = created.collection.id
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not create the collection.'
  } finally {
    busy.value = false
  }
}

async function createEntry() {
  if (!selectedCollectionId.value || !can('page:write')) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/api/v1/cms/collections/${selectedCollectionId.value}/entries`, {
      title: entryTitle.value.trim() || 'Untitled',
      slug: entrySlug.value.trim() || 'untitled',
      data: { body: entryBody.value },
      published: entryPublished.value,
    })
    entryTitle.value = ''
    entrySlug.value = ''
    entryBody.value = ''
    entryPublished.value = false
    await refreshEntries()
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not create the entry.'
  } finally {
    busy.value = false
  }
}

async function togglePublished(entry: CmsEntry) {
  if (!can('page:write')) return
  await api.patch(`/api/v1/cms/entries/${entry.id}`, { published: !entry.published })
  await refreshEntries()
}
</script>

<template>
  <div class="editor-chrome">
    <UiPageHeader
      title="CMS"
      description="Collections pages can bind to. Connect Frappe or WordPress under Settings → CMS."
    >
      <template #actions>
        <UiButton size="sm" to="/settings/cms">CMS connections</UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Pick a website in the sidebar first."
    >
      <UiButton variant="primary" to="/sites">All websites</UiButton>
    </UiEmptyState>

    <div v-else class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <section class="rounded-card border border-line bg-raised">
        <header class="border-b border-line px-4 py-3">
          <h2 class="type-button text-ink">Collections</h2>
        </header>
        <ul class="flex flex-col">
          <li v-for="collection in collectionList" :key="collection.id">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
              :class="selectedCollectionId === collection.id ? 'bg-sunken text-ink' : 'text-soft hover:bg-sunken/60'"
              @click="selectedCollectionId = collection.id"
            >
              <Database class="h-3.5 w-3.5 shrink-0" :stroke-width="1.75" aria-hidden="true" />
              <span class="min-w-0 truncate type-button-12">{{ collection.name }}</span>
            </button>
          </li>
        </ul>
        <form class="flex flex-col gap-2 border-t border-line p-4" @submit.prevent="createCollection">
          <UiInput v-model="draftName" placeholder="Name" :disabled="!can('page:write')" />
          <UiInput v-model="draftSlug" placeholder="slug" :disabled="!can('page:write')" />
          <UiButton size="sm" variant="primary" :loading="busy" :disabled="!can('page:write')" type="submit">
            Add collection
          </UiButton>
        </form>
      </section>

      <section class="rounded-card border border-line bg-raised">
        <header class="border-b border-line px-5 py-4">
          <h2 class="type-button text-ink">{{ selectedCollection?.name ?? 'Entries' }}</h2>
          <p class="type-caption-12 mt-1 text-soft">
            Bind a text or image node to <code>collection/slug</code> in the page inspector.
          </p>
        </header>

        <p v-if="error" class="px-5 pt-4 type-caption-12 text-danger" role="alert">{{ error }}</p>

        <ul class="divide-y divide-line">
          <li v-for="entry in entryList" :key="entry.id" class="flex items-center justify-between gap-3 px-5 py-3">
            <div class="min-w-0">
              <p class="type-button-12 text-ink">{{ entry.title }}</p>
              <p class="type-caption-12 text-faint">{{ selectedCollection?.slug }}/{{ entry.slug }}</p>
            </div>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" @click="togglePublished(entry)">
              {{ entry.published ? 'Unpublish' : 'Publish' }}
            </UiButton>
          </li>
        </ul>

        <form class="flex flex-col gap-3 border-t border-line p-5" @submit.prevent="createEntry">
          <div class="grid gap-3 sm:grid-cols-2">
            <UiInput v-model="entryTitle" placeholder="Title" :disabled="!can('page:write')" />
            <UiInput v-model="entrySlug" placeholder="slug" :disabled="!can('page:write')" />
          </div>
          <UiTextarea v-model="entryBody" :rows="4" placeholder="Body" :disabled="!can('page:write')" />
          <label class="flex items-center gap-2 type-caption-12 text-soft">
            <input v-model="entryPublished" type="checkbox" class="rounded border-line" :disabled="!can('page:write')" />
            Published
          </label>
          <UiButton size="sm" variant="primary" :loading="busy" :disabled="!can('page:write') || !selectedCollectionId" type="submit">
            Add entry
          </UiButton>
        </form>
      </section>
    </div>
  </div>
</template>
