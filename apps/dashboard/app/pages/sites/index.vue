<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Site, SiteKind } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: sites, pending } = await useAsyncData('sites', () => api.get<Site[]>('/api/v1/sites'))

const creating = ref(false)
const name = ref('')
const kind = ref<SiteKind>('website')
const error = ref('')
const busy = ref(false)
const kindFilter = ref<'all' | SiteKind>('all')

const KIND_OPTIONS: { label: string; value: SiteKind }[] = [
  { label: 'Website', value: 'website' },
  { label: 'Ecommerce', value: 'ecommerce' },
]

const FILTER_TABS: { label: string; value: 'all' | SiteKind }[] = [
  { label: 'All', value: 'all' },
  { label: 'Website', value: 'website' },
  { label: 'Ecommerce', value: 'ecommerce' },
]

const totalCount = computed(() => sites.value?.length ?? 0)

const filteredSites = computed(() => {
  const list = sites.value ?? []
  if (kindFilter.value === 'all') return list
  return list.filter((site) => site.kind === kindFilter.value)
})

function kindLabel(value: SiteKind): string {
  return value === 'ecommerce' ? 'Ecommerce' : 'Website'
}

/** Slug is derived, not asked for — one less decision at creation time. */
function slugFor(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'website'
  )
}

async function createSite() {
  error.value = ''
  busy.value = true
  try {
    const site = await api.post<Site>('/api/v1/sites', {
      name: name.value,
      slug: slugFor(name.value),
      kind: kind.value,
    })
    creating.value = false
    name.value = ''
    kind.value = 'website'
    await navigateTo(`/sites/${site.id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the website.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Websites"
      description="Each website has its own pages, theme and domain. One workspace can own several sites. Commerce (products and orders) lives in its own section."
    >
      <template #actions>
        <UiButton v-if="can('site:write')" size="sm" variant="primary" @click="creating = true">
          New website
        </UiButton>
      </template>
    </UiPageHeader>

    <div
      v-if="!pending && sites?.length"
      class="mb-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p class="type-caption-12 text-soft tabular-nums">{{ totalCount }} site{{ totalCount === 1 ? '' : 's' }}</p>
      <div
        class="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-raised p-0.5"
        role="tablist"
        aria-label="Filter by kind"
      >
        <button
          v-for="tab in FILTER_TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="kindFilter === tab.value"
          class="rounded-md px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors"
          :class="
            kindFilter === tab.value
              ? 'bg-sunken text-ink shadow-sm'
              : 'text-soft hover:bg-sunken/60 hover:text-ink'
          "
          @click="kindFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <UiEmptyState
      v-if="!pending && !sites?.length"
      title="No websites yet"
      description="Create one to start adding pages."
    >
      <UiButton variant="primary" @click="creating = true">New website</UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="!pending && sites?.length && !filteredSites.length"
      title="No sites in this filter"
      description="Try All, or create a site of this kind."
    />

    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="site in filteredSites" :key="site.id">
        <NuxtLink
          :to="`/sites/${site.id}`"
          class="group block rounded-card border border-line bg-raised p-5 no-underline transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink">{{ site.name }}</p>
              <p class="mt-0.5 truncate text-[0.8125rem] text-faint">
                {{ site.primaryHostname ?? `${site.slug}.platform.local` }}
              </p>
            </div>
            <span
              class="h-8 w-8 shrink-0 rounded-md border border-line"
              :style="{ backgroundColor: site.theme.colorPrimary }"
              aria-hidden="true"
            />
          </div>
          <div class="mt-4 flex items-center gap-2">
            <UiBadge>{{ kindLabel(site.kind) }}</UiBadge>
            <UiBadge>{{ site.locale }}</UiBadge>
            <UiBadge v-if="site.primaryHostname" tone="positive">Live</UiBadge>
            <UiBadge v-else tone="warning">No domain</UiBadge>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <UiDialog v-model:open="creating" title="New website" description="You can change everything later.">
      <form class="flex flex-col gap-4" @submit.prevent="createSite">
        <UiField v-slot="{ id, describedBy }" label="Website name" :help="name ? `Address: /${slugFor(name)}` : ''" required>
          <UiInput :id="id" v-model="name" :described-by="describedBy" placeholder="Acme Plumbing" />
        </UiField>
        <UiField v-slot="{ id }" label="Kind" required>
          <UiSelect :id="id" v-model="kind" :options="KIND_OPTIONS" />
        </UiField>
        <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ error }}
        </p>
      </form>

      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!name.trim()" @click="createSite">Create</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
