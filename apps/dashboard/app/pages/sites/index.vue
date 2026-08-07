<script setup lang="ts">
import { ref } from 'vue'
import type { Site } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: sites, pending, refresh } = await useAsyncData('sites', () => api.get<Site[]>('/api/v1/sites'))

const creating = ref(false)
const name = ref('')
const error = ref('')
const busy = ref(false)

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
    const site = await api.post<Site>('/api/v1/sites', { name: name.value, slug: slugFor(name.value) })
    creating.value = false
    name.value = ''
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
    <UiPageHeader title="Websites" description="Each website has its own pages, theme and domain.">
      <template #actions>
        <UiButton v-if="can('site:write')" size="sm" variant="primary" @click="creating = true">
          New website
        </UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!pending && !sites?.length"
      title="No websites yet"
      description="Create one to start adding pages."
    >
      <UiButton variant="primary" @click="creating = true">New website</UiButton>
    </UiEmptyState>

    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="site in sites" :key="site.id">
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
