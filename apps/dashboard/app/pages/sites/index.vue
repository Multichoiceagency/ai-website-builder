<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Site, SiteKind } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: sites, pending } = await useAsyncData('sites', () => api.get<Site[]>('/api/v1/sites'))

const kindFilter = ref<'all' | SiteKind>('all')

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
</script>

<template>
  <div>
    <UiPageHeader
      title="Websites"
      description="Your websites live here. Make a new one, or open one to edit."
    >
      <template #actions>
        <UiButton v-if="can('site:write')" size="sm" to="/commerce/builder">Make a webshop</UiButton>
        <UiButton v-if="can('site:write')" size="sm" variant="primary" to="/website/new?mode=ai" arrow>
          Make website with AI
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
      title="No website yet"
      description="Write a short text about your business. AI makes the website."
    >
      <UiButton variant="primary" to="/website/new?mode=ai" arrow>Make website with AI</UiButton>
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
  </div>
</template>
