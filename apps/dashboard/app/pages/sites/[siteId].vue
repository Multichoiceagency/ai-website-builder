<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Page, PageSummary, Site, Theme } from '@platform/schemas'

const route = useRoute()
const api = useApi()
const can = useCan()
const config = useRuntimeConfig()

const siteId = route.params.siteId as string

const { data, pending, refresh } = await useAsyncData(`site:${siteId}`, async () => {
  const [site, pages] = await Promise.all([
    api.get<Site>(`/api/v1/sites/${siteId}`),
    api.get<PageSummary[]>(`/api/v1/sites/${siteId}/pages`),
  ])
  return { site, pages }
})

const tab = ref<'pages' | 'theme'>('pages')

// --- create page ------------------------------------------------------------
const creating = ref(false)
const newTitle = ref('')
const newPath = ref('/')
const createError = ref('')
const busy = ref(false)

async function createPage() {
  createError.value = ''
  busy.value = true
  try {
    const page = await api.post<Page>(`/api/v1/sites/${siteId}/pages`, {
      title: newTitle.value,
      path: newPath.value.startsWith('/') ? newPath.value : `/${newPath.value}`,
    })
    creating.value = false
    newTitle.value = ''
    newPath.value = '/'
    await navigateTo(`/pages/${page.id}`)
  } catch (caught) {
    createError.value = caught instanceof ApiError ? caught.message : 'Could not create the page.'
  } finally {
    busy.value = false
  }
}

// --- theme ------------------------------------------------------------------
const savingTheme = ref(false)
const themeSaved = ref(false)

const EXTRA_COLOR_FIELDS: { key: keyof Theme; label: string }[] = [
  { key: 'colorAccent', label: 'Accent' },
  { key: 'colorText', label: 'Text' },
  { key: 'colorTextMuted', label: 'Muted text' },
]

const RADIUS_OPTIONS = [
  { label: 'Square', value: 'none' },
  { label: 'Slight', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Round', value: 'lg' },
  { label: 'Pill', value: 'full' },
]

async function saveTheme() {
  if (!data.value) return
  savingTheme.value = true
  themeSaved.value = false
  try {
    await api.patch<Site>(`/api/v1/sites/${siteId}`, {
      name: data.value.site.name,
      theme: data.value.site.theme,
    })
    themeSaved.value = true
    setTimeout(() => (themeSaved.value = false), 2500)
  } finally {
    savingTheme.value = false
  }
}

const previewUrl = computed(() =>
  buildStorefrontUrl({
    storefrontBase: String(config.public.storefrontUrl || 'http://localhost:3001'),
    primaryHostname: data.value?.site.primaryHostname,
    path: '/',
  }),
)

function kindLabel(value: string): string {
  return value === 'ecommerce' ? 'Ecommerce' : 'Website'
}
</script>

<template>
  <div v-if="data">
    <UiPageHeader :title="data.site.name" :description="`${data.pages.length} page(s)`" back="/sites" back-label="Websites">
      <template #actions>
        <UiBadge>{{ kindLabel(data.site.kind) }}</UiBadge>
        <UiButton size="sm" :to="previewUrl" target="_blank" external>View site</UiButton>
        <UiButton v-if="can('page:write')" size="sm" variant="primary" @click="creating = true">New page</UiButton>
      </template>
    </UiPageHeader>

    <div class="mb-5 flex gap-1 border-b border-line" role="tablist">
      <button
        v-for="option in (['pages', 'theme'] as const)"
        :key="option"
        role="tab"
        :aria-selected="tab === option"
        class="-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors"
        :class="tab === option ? 'border-brand text-ink' : 'border-transparent text-soft hover:text-ink'"
        @click="tab = option"
      >
        {{ option }}
      </button>
    </div>

    <!-- Pages ------------------------------------------------------------ -->
    <section v-if="tab === 'pages'" role="tabpanel">
      <UiEmptyState
        v-if="!data.pages.length"
        title="No pages yet"
        description="A website needs at least a home page."
      >
        <UiButton variant="primary" @click="creating = true">New page</UiButton>
      </UiEmptyState>

      <UiCard v-else :padded="false">
        <ul class="divide-y divide-line">
          <li
            v-for="page in data.pages"
            :key="page.id"
            class="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60"
          >
            <NuxtLink :to="`/pages/${page.id}`" class="min-w-0 flex-1 no-underline">
              <p class="truncate text-sm font-medium text-ink">{{ page.title }}</p>
              <p class="truncate text-[0.8125rem] text-faint">
                {{ page.path }} · {{ page.sectionCount }} section{{ page.sectionCount === 1 ? '' : 's' }}
              </p>
            </NuxtLink>

            <div class="flex shrink-0 items-center gap-2">
              <UiBadge v-if="page.status === 'published' && !page.hasUnpublishedChanges" tone="positive">Live</UiBadge>
              <UiBadge v-else-if="page.status === 'published'" tone="warning">Edited</UiBadge>
              <UiBadge v-else>Draft</UiBadge>
              <UiButton size="sm" :to="`/pages/${page.id}`">Edit</UiButton>
            </div>
          </li>
        </ul>
      </UiCard>
    </section>

    <!-- Theme ------------------------------------------------------------ -->
    <section v-else role="tabpanel" class="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <UiCard>
        <h2 class="mb-4 text-heading font-semibold text-ink">Colour palette</h2>
        <div class="flex flex-col gap-3">
          <ColorFillField
            v-model:hex="data.site.theme.colorPrimary"
            v-model:gradient="data.site.theme.gradientPrimary"
            label="Primary"
          />
          <ColorFillField
            v-model:hex="data.site.theme.colorSurface"
            v-model:gradient="data.site.theme.gradientSurface"
            label="Background"
          />
          <ColorFillField
            v-model:hex="data.site.theme.colorSurfaceAlt"
            v-model:gradient="data.site.theme.gradientSurfaceAlt"
            label="Surface"
          />
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UiField v-for="field in EXTRA_COLOR_FIELDS" :key="field.key" v-slot="{ id }" :label="field.label">
            <div class="flex items-center gap-2">
              <input
                :id="id"
                v-model="data.site.theme[field.key] as string"
                type="color"
                class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-raised p-1"
              />
              <UiInput v-model="data.site.theme[field.key] as string" class="font-mono" />
            </div>
          </UiField>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <UiField v-slot="{ id }" label="Corner rounding">
            <UiSelect :id="id" v-model="data.site.theme.radius" :options="RADIUS_OPTIONS" />
          </UiField>
          <UiField v-slot="{ id }" label="Heading font">
            <GoogleFontSelect :id="id" v-model="data.site.theme.fontHeading" />
          </UiField>
          <UiField v-slot="{ id }" label="Body font">
            <GoogleFontSelect :id="id" v-model="data.site.theme.fontBody" />
          </UiField>
        </div>

        <div class="mt-6 flex items-center gap-3">
          <UiButton variant="primary" :loading="savingTheme" @click="saveTheme">Save palette</UiButton>
          <p v-if="themeSaved" class="text-[0.8125rem] text-positive">Saved. Republish a page to see it live.</p>
        </div>
      </UiCard>

      <UiCard>
        <h2 class="mb-3 text-heading font-semibold text-ink">Preview</h2>
        <div
          class="overflow-hidden rounded-lg border border-line"
          :style="{ backgroundColor: data.site.theme.colorSurface, color: data.site.theme.colorText }"
        >
          <div class="px-4 py-5">
            <p class="text-lg font-semibold tracking-[-0.02em]">Headline sample</p>
            <p class="mt-1 text-[0.8125rem]" :style="{ color: data.site.theme.colorTextMuted }">
              Supporting copy in muted text.
            </p>
            <span
              class="mt-4 inline-flex px-3.5 py-2 text-[0.8125rem] font-semibold text-white"
              :style="{
                backgroundColor: data.site.theme.colorPrimary,
                borderRadius:
                  data.site.theme.radius === 'full'
                    ? '999px'
                    : data.site.theme.radius === 'none'
                      ? '0'
                      : data.site.theme.radius === 'lg'
                        ? '12px'
                        : data.site.theme.radius === 'md'
                          ? '8px'
                          : '4px',
              }"
            >
              Request a quote
            </span>
          </div>
          <div class="px-4 py-3" :style="{ backgroundColor: data.site.theme.colorSurfaceAlt }">
            <p class="text-[0.75rem]" :style="{ color: data.site.theme.colorTextMuted }">Alternate section</p>
          </div>
        </div>
      </UiCard>
    </section>

    <UiDialog v-model:open="creating" title="New page">
      <form class="flex flex-col gap-4" @submit.prevent="createPage">
        <UiField v-slot="{ id }" label="Page title" required>
          <UiInput :id="id" v-model="newTitle" placeholder="Services" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Address" help="Use / for the home page." required>
          <UiInput :id="id" v-model="newPath" :described-by="describedBy" placeholder="/services" />
        </UiField>
        <p v-if="createError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ createError }}
        </p>
      </form>

      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!newTitle.trim()" @click="createPage">Create</UiButton>
      </template>
    </UiDialog>
  </div>

  <p v-else-if="pending" class="text-sm text-soft">Loading…</p>
</template>
