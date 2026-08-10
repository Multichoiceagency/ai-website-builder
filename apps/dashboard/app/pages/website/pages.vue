<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Page, PageSummary, Site } from '@platform/schemas'

const api = useApi()
const can = useCan()
const activeSiteId = useActiveSiteId()

const { data: sites, refresh: refreshSites } = await useAsyncData(
  'website:pages:sites',
  () => api.get<Site[]>('/api/v1/sites'),
  { default: () => [] as Site[] },
)

syncActiveSiteId(sites.value, { preferKind: 'website' })
watch(sites, (list) => syncActiveSiteId(list, { preferKind: 'website' }), { deep: true })

const websiteSites = computed(() =>
  (sites.value ?? []).filter((site) => (site.kind ?? 'website') === 'website'),
)

const { data: pages, refresh } = await useAsyncData(
  () => `website:pages:${activeSiteId.value}`,
  () =>
    activeSiteId.value && websiteSites.value.some((site) => site.id === activeSiteId.value)
      ? api.get<PageSummary[]>(`/api/v1/sites/${activeSiteId.value}/pages`)
      : Promise.resolve([]),
  { watch: [activeSiteId], default: () => [] as PageSummary[] },
)

const creating = ref(false)
const title = ref('')
const path = ref('/')
const error = ref('')
const busy = ref(false)

function openCreatePage() {
  error.value = ''
  if (!activeSiteId.value) {
    void navigateTo('/website/new')
    return
  }
  creating.value = true
}

async function createPage() {
  error.value = ''
  if (!activeSiteId.value || !/^[0-9a-f-]{36}$/i.test(activeSiteId.value)) {
    error.value = 'Select or create a website first.'
    return
  }
  busy.value = true
  try {
    const page = await api.post<Page>(`/api/v1/sites/${activeSiteId.value}/pages`, {
      title: title.value,
      path: path.value.startsWith('/') ? path.value : `/${path.value}`,
    })
    creating.value = false
    await refresh()
    await navigateTo(`/pages/${page.id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the page.'
  } finally {
    busy.value = false
  }
}

const needsPublishing = computed(() => (pages.value ?? []).filter((page) => page.hasUnpublishedChanges).length)
const hasSites = computed(() => websiteSites.value.length > 0)

async function ensureSites() {
  await refreshSites()
  syncActiveSiteId(sites.value, { preferKind: 'website' })
}
onMounted(() => {
  void ensureSites()
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Pages"
      :description="
        hasSites
          ? `${pages?.length ?? 0} page(s)${needsPublishing ? ` · ${needsPublishing} not published yet` : ''}`
          : 'Your website pages will show here.'
      "
    >
      <template #actions>
        <UiButton size="sm" variant="primary" to="/website/new?mode=ai" arrow>Make website with AI</UiButton>
        <UiButton
          v-if="can('page:write')"
          size="sm"
          :disabled="!hasSites"
          @click="openCreatePage"
        >
          New page
        </UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!hasSites"
      title="No website yet"
      description="First make a website. Then you can add more pages."
    >
      <UiButton variant="primary" to="/website/new?mode=ai" arrow>Make website with AI</UiButton>
      <UiButton to="/sites">All websites</UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="!activeSiteId"
      title="Pick a website"
      description="Choose a website in the menu on the left."
    >
      <UiButton to="/sites">All websites</UiButton>
      <UiButton variant="primary" to="/website/new?mode=ai">Make website with AI</UiButton>
    </UiEmptyState>

    <UiEmptyState v-else-if="!pages?.length" title="No pages yet" description="Every website needs a home page.">
      <UiButton variant="primary" @click="openCreatePage">Make home page</UiButton>
    </UiEmptyState>

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="page in pages"
          :key="page.id"
          class="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60"
        >
          <NuxtLink
            :to="`/pages/${page.id}`"
            class="min-w-0 flex-1 no-underline"
          >
            <p class="truncate text-sm font-medium text-ink">{{ page.title }}</p>
            <p class="truncate text-[0.8125rem] text-faint">
              {{ page.path }} · {{ page.sectionCount }} section{{ page.sectionCount === 1 ? '' : 's' }}
            </p>
          </NuxtLink>
          <div class="flex shrink-0 items-center gap-2">
            <UiBadge v-if="page.status === 'published' && !page.hasUnpublishedChanges" tone="positive">Live</UiBadge>
            <UiBadge v-else-if="page.status === 'published'" tone="warning">Edited</UiBadge>
            <UiBadge v-else>Draft</UiBadge>
            <UiButton size="sm" variant="primary" :to="`/pages/${page.id}`">Edit page</UiButton>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiDialog v-model:open="creating" title="New page">
      <form class="flex flex-col gap-4" @submit.prevent="createPage">
        <UiField v-slot="{ id }" label="Page title" required>
          <UiInput :id="id" v-model="title" placeholder="Services" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Address" help="Use / for the home page." required>
          <UiInput :id="id" v-model="path" :described-by="describedBy" placeholder="/services" />
        </UiField>
        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">{{ error }}</p>
      </form>
      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!title.trim() || !activeSiteId" @click="createPage">
          Create
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
