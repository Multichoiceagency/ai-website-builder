<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BlockMetadata, Site, SiteTemplate } from '@platform/schemas'

/**
 * The template store — browse recipes, preview in the site theme, apply sections
 * to an existing page or start onboarding with the template selected.
 */
definePageMeta({ layout: 'default' })

interface TemplateDetail {
  template: SiteTemplate
  blocks: BlockMetadata[]
  unavailable: string[]
  steering: { style: string; preferences: Record<string, string>; brief: string }
}

const api = useApi()
const activeSiteId = useActiveSiteId()
const can = useCan()
const selected = ref<string | null>(null)

const {
  pages,
  busy: appending,
  error: appendError,
  appendBlockIds,
  defaultPageId,
} = useAppendBlocksToPage()

const { data: site } = await useAsyncData(
  () => `website:templates:site:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Site>(`/api/v1/sites/${activeSiteId.value}`) : Promise.resolve(null)),
  { watch: [activeSiteId] },
)

const detail = ref<TemplateDetail | null>(null)
const detailBlockIds = computed(() => detail.value?.blocks.map((block) => block.id) ?? [])
const detailOpen = ref(false)
const detailError = ref('')
const pageTarget = ref('')

watch(
  pages,
  (list) => {
    if (!pageTarget.value && list?.length) pageTarget.value = defaultPageId() ?? list[0]!.id
  },
  { immediate: true },
)

const PAGE_OPTIONS = computed(() =>
  (pages.value ?? []).map((page) => ({
    label: `${page.title} (${page.path})`,
    value: page.id,
  })),
)

async function inspect(template: SiteTemplate) {
  detailError.value = ''
  detail.value = null
  detailOpen.value = true
  try {
    detail.value = await api.get<TemplateDetail>(`/api/v1/templates/${template.id}`)
  } catch (caught) {
    detailError.value = caught instanceof ApiError ? caught.message : 'Could not load that template.'
  }
}

async function applyToPage() {
  if (!detail.value?.blocks.length) return
  const pageId = pageTarget.value || defaultPageId()
  if (!pageId) {
    detailError.value = 'Create a page first under Website → Pages.'
    return
  }
  await appendBlockIds(
    pageId,
    detail.value.blocks.map((block) => block.id),
  )
  if (!appendError.value) detailOpen.value = false
}

const CLASS_NOTES: Record<string, string> = {
  A: 'Static markup. No JavaScript beyond entrance motion.',
  B: 'Light motion and a small amount of JavaScript.',
  C: 'Advanced animation and scroll orchestration.',
  D: 'Cinematic — WebGL or equivalent. Needs a budget to match.',
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Templates"
      description="Starting points for this website. Each recipe maps to installed blocks — apply them to a page, or build a new site with onboarding."
    >
      <template #actions>
        <UiButton size="sm" to="/website/components">Components</UiButton>
        <UiButton size="sm" to="/website/theme">Theme</UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :to="selected ? `/onboarding?template=${selected}` : '/onboarding'"
          arrow
        >
          {{ selected ? 'Build with this template' : 'Build a website' }}
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="appendError" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ appendError }}
    </p>

    <TemplatePicker
      v-model="selected"
      cache-key="template-store"
      :theme="site?.theme ?? null"
      @inspect="inspect"
    />

    <UiDialog v-model:open="detailOpen" wide :title="detail?.template.title ?? 'Template'">
      <p v-if="detailError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
        {{ detailError }}
      </p>

      <p v-else-if="!detail" class="py-10 text-center text-sm text-soft">Loading…</p>

      <div v-else class="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div class="flex flex-col gap-3">
          <div class="overflow-hidden rounded-lg border border-line bg-sunken">
            <TemplatePreview :block-ids="detailBlockIds" :theme="site?.theme ?? null" ratio="4 / 3" eager />
          </div>
          <p class="-mt-1 type-caption-12 leading-relaxed text-faint">
            Rendered live from the sections below
            <span v-if="site"> in {{ site.name }}’s theme</span>
            — not a picture of the original design.
          </p>

          <div>
            <h3 class="mb-1.5 type-caption uppercase tracking-[0.08em] text-faint">Design reference</h3>
            <p class="text-[0.8125rem] leading-relaxed text-soft">
              {{ detail.template.sourcePrompt || 'No written brief survived normalisation for this template.' }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">Style</dt>
              <dd class="mt-0.5 type-button text-ink">{{ detail.template.style.join(', ') }}</dd>
            </div>
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">Archetype</dt>
              <dd class="mt-0.5 type-button text-ink">
                {{ detail.template.pageType === 'landing' ? 'Whole page' : 'Single section' }}
              </dd>
            </div>
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">Motion</dt>
              <dd class="mt-0.5 type-button text-ink">{{ detail.template.motionType.join(', ') }}</dd>
            </div>
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">Complexity</dt>
              <dd class="mt-0.5 type-button text-ink">{{ detail.template.complexity }}</dd>
            </div>
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">Suits</dt>
              <dd class="mt-0.5 type-button text-ink">
                {{ detail.template.industry.includes('*') ? 'Any industry' : detail.template.industry.join(', ') }}
              </dd>
            </div>
            <div>
              <dt class="type-button-10 uppercase tracking-[0.08em] text-faint">On mobile</dt>
              <dd class="mt-0.5 type-button" :class="detail.template.mobileSafe ? 'text-ink' : 'text-warning'">
                {{ detail.template.mobileSafe ? 'Safe' : 'Degrades — pointer-driven' }}
              </dd>
            </div>
          </dl>

          <div class="rounded-lg border border-line px-3 py-2.5">
            <p class="flex items-center gap-2 type-button text-ink">
              Performance class {{ detail.template.performanceClass }}
              <UiBadge
                :tone="
                  detail.template.performanceClass === 'A' || detail.template.performanceClass === 'B'
                    ? 'positive'
                    : 'warning'
                "
              >
                {{ detail.template.performanceClass }}
              </UiBadge>
            </p>
            <p class="mt-1 type-caption-12 leading-relaxed text-soft">
              {{ CLASS_NOTES[detail.template.performanceClass] }}
            </p>
          </div>

          <div>
            <h3 class="mb-2 type-caption uppercase tracking-[0.08em] text-faint">Sections it maps to</h3>
            <ol v-if="detail.blocks.length" class="flex flex-col divide-y divide-line border-y border-line">
              <li v-for="(block, index) in detail.blocks" :key="block.id" class="flex items-center gap-3 py-2">
                <span class="w-4 shrink-0 tabular-nums type-caption-12 text-faint">{{ index + 1 }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate type-button text-ink">{{ block.name }}</span>
                  <span class="block truncate type-caption-12 text-faint">{{ block.id }} · {{ block.category }}</span>
                </span>
                <UiBadge :tone="block.performanceClass === 'A' || block.performanceClass === 'B' ? 'neutral' : 'warning'">
                  {{ block.performanceClass }}
                </UiBadge>
              </li>
            </ol>
            <p v-else class="type-caption-12 leading-relaxed text-soft">
              The registry has no equivalent for this one yet.
            </p>
          </div>

          <div
            v-if="can('page:write') && PAGE_OPTIONS.length && detail.blocks.length"
            class="rounded-lg border border-line bg-sunken px-3 py-3"
          >
            <label class="mb-1.5 block text-[0.75rem] font-medium text-soft">Add these sections to</label>
            <UiSelect v-model="pageTarget" :options="PAGE_OPTIONS" />
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton @click="detailOpen = false">Close</UiButton>
        <UiButton
          v-if="detail && can('page:write') && PAGE_OPTIONS.length && detail.blocks.length"
          :loading="appending"
          @click="applyToPage"
        >
          Add to page
        </UiButton>
        <UiButton
          v-if="detail"
          variant="primary"
          :to="`/onboarding?template=${detail.template.id}`"
          arrow
        >
          Build new site
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
