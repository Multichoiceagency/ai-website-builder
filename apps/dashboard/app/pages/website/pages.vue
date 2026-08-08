<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Page, PageSummary } from '@platform/schemas'

const api = useApi()
const can = useCan()
const activeSiteId = useActiveSiteId()

const { data: pages, refresh } = await useAsyncData(
  () => `website:pages:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<PageSummary[]>(`/api/v1/sites/${activeSiteId.value}/pages`) : Promise.resolve([])),
  { watch: [activeSiteId], default: () => [] as PageSummary[] },
)

const creating = ref(false)
const title = ref('')
const path = ref('/')
const error = ref('')
const busy = ref(false)

async function createPage() {
  error.value = ''
  busy.value = true
  try {
    const page = await api.post<Page>(`/api/v1/sites/${activeSiteId.value}/pages`, {
      title: title.value,
      path: path.value.startsWith('/') ? path.value : `/${path.value}`,
    })
    creating.value = false
    await navigateTo(`/pages/${page.id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the page.'
  } finally {
    busy.value = false
  }
}

const needsPublishing = computed(() => (pages.value ?? []).filter((page) => page.hasUnpublishedChanges).length)
</script>

<template>
  <div>
    <UiPageHeader
      title="Pages"
      :description="`${pages?.length ?? 0} page(s)${needsPublishing ? ` · ${needsPublishing} with unpublished changes` : ''}`"
    >
      <template #actions>
        <UiButton size="sm" variant="primary" to="/onboarding" arrow>Build with AI</UiButton>
        <UiButton v-if="can('page:write')" size="sm" @click="creating = true">New page</UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Pick a site in the sidebar, open All websites, or let the builder make one."
    >
      <UiButton to="/sites">All websites</UiButton>
      <UiButton variant="primary" to="/onboarding">Build a website</UiButton>
    </UiEmptyState>

    <UiEmptyState v-else-if="!pages?.length" title="No pages yet" description="A website needs at least a home page.">
      <UiButton variant="primary" @click="creating = true">New page</UiButton>
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
        <UiButton variant="primary" :loading="busy" :disabled="!title.trim()" @click="createPage">Create</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
