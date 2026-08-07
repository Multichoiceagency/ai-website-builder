<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  BlockMetadata,
  Experiment,
  ExperimentResults,
  Page,
  PageSummary,
  Section,
  Site,
} from '@platform/schemas'

/**
 * Experiments.
 *
 * The one thing this screen must never do is imply a result it does not have.
 * A test below its minimum sample reports how far it still has to go; a test
 * that reached significance says so with its p-value; a test that reached
 * neither says "no difference". There is no "leading" state, because "leading"
 * is how a coin flip gets shipped as a redesign.
 */
const api = useApi()
const can = useCan()

const { data: experiments, refresh } = await useAsyncData(
  'experiments',
  () => api.get<Experiment[]>('/api/v1/experiments'),
  { default: () => [] as Experiment[] },
)

const selectedId = ref<string | null>(experiments.value?.[0]?.id ?? null)
const selected = computed(() => (experiments.value ?? []).find((item) => item.id === selectedId.value) ?? null)

const results = ref<ExperimentResults | null>(null)
const resultsError = ref('')
const busy = ref(false)
const actionError = ref('')

async function loadResults() {
  results.value = null
  resultsError.value = ''
  if (!selectedId.value) return
  try {
    results.value = await api.get<ExperimentResults>(`/api/v1/experiments/${selectedId.value}/results`)
  } catch (caught) {
    resultsError.value = caught instanceof ApiError ? caught.message : 'Could not load the results.'
  }
}

watch(selectedId, loadResults, { immediate: true })

// --- lifecycle actions ------------------------------------------------------

async function act(path: string) {
  if (!selectedId.value) return
  actionError.value = ''
  busy.value = true
  try {
    await api.post(`/api/v1/experiments/${selectedId.value}/${path}`)
    await refresh()
    await loadResults()
  } catch (caught) {
    actionError.value = caught instanceof ApiError ? caught.message : 'That did not work.'
  } finally {
    busy.value = false
  }
}

// --- creation ---------------------------------------------------------------

const creating = ref(false)
const createError = ref('')
const form = ref({ siteId: '', pageId: '', sectionId: '', name: '', hypothesis: '', minimumSample: '500' })
const draftSection = ref<Section | null>(null)

const { data: sites } = await useAsyncData('experiments:sites', () => api.get<Site[]>('/api/v1/sites'), {
  default: () => [] as Site[],
})
const { data: blocks } = await useAsyncData(
  'experiments:blocks',
  () => api.get<BlockMetadata[]>('/api/v1/blocks'),
  { default: () => [] as BlockMetadata[] },
)

const pages = ref<PageSummary[]>([])
const page = ref<Page | null>(null)

watch(
  () => form.value.siteId,
  async (siteId) => {
    pages.value = siteId ? await api.get<PageSummary[]>(`/api/v1/sites/${siteId}/pages`) : []
    form.value.pageId = ''
  },
)

watch(
  () => form.value.pageId,
  async (pageId) => {
    page.value = pageId ? await api.get<Page>(`/api/v1/pages/${pageId}`) : null
    form.value.sectionId = page.value?.sections[0]?.id ?? ''
  },
)

watch(
  () => form.value.sectionId,
  (sectionId) => {
    const original = page.value?.sections.find((section) => section.id === sectionId) ?? null
    // The challenger starts as a copy of what is live, so the diff a visitor
    // gets is exactly what the editor changes here and nothing else.
    draftSection.value = original ? { ...original, props: { ...original.props } } : null
  },
)

const draftBlock = computed(() =>
  (blocks.value ?? []).find((block) => block.id === draftSection.value?.block) ?? null,
)

function updateDraftProps(next: Record<string, unknown>) {
  if (!draftSection.value) return
  draftSection.value = { ...draftSection.value, props: next }
}

/** Selects need a resting state that is not silently the first real option. */
function withPlaceholder(options: { label: string; value: string }[], label: string) {
  return [{ label, value: '' }, ...options]
}

async function createExperiment() {
  createError.value = ''
  busy.value = true
  try {
    const created = await api.post<Experiment>('/api/v1/experiments', {
      siteId: form.value.siteId,
      pageId: form.value.pageId,
      name: form.value.name,
      hypothesis: form.value.hypothesis,
      minimumSamplePerVariant: Number(form.value.minimumSample) || 200,
      variants: [
        { key: 'control', name: 'Control (live page)', isControl: true, weight: 50, document: null },
        {
          key: 'a',
          name: 'Variant A',
          weight: 50,
          document: {
            kind: 'section',
            targetSectionId: form.value.sectionId,
            section: draftSection.value,
          },
        },
      ],
    })
    creating.value = false
    await refresh()
    selectedId.value = created.id
  } catch (caught) {
    createError.value = caught instanceof ApiError ? caught.message : 'Could not create the experiment.'
  } finally {
    busy.value = false
  }
}

const canCreate = computed(
  () => Boolean(form.value.pageId && form.value.sectionId && form.value.name.trim() && draftSection.value),
)

// --- presentation -----------------------------------------------------------

type Tone = 'neutral' | 'positive' | 'warning' | 'danger' | 'brand'

const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  running: 'positive',
  paused: 'warning',
  completed: 'neutral',
  archived: 'neutral',
}

function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

function signed(value: number | null): string {
  if (value === null) return '—'
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
}

const verdict = computed<{ tone: Tone; label: string } | null>(() => {
  if (!results.value) return null
  const { status } = results.value
  if (status === 'winner_found') return { tone: 'positive', label: 'Winner found' }
  if (status === 'not_conclusive') return { tone: 'warning', label: 'Not conclusive' }
  return { tone: 'neutral', label: 'Collecting data' }
})

/** How full the sample gate is — the honest progress bar for a running test. */
const gateProgress = computed(() => {
  if (!results.value) return 0
  return Math.min(1, results.value.smallestSample / Math.max(1, results.value.minimumSamplePerVariant))
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Experiments"
      description="Test a section against the live page. A winner is only ever declared by the numbers."
    >
      <template #actions>
        <UiButton v-if="can('experiment:write')" size="sm" variant="primary" @click="creating = true">
          New experiment
        </UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState
      v-if="!experiments?.length"
      title="No experiments yet"
      description="Pick a section, change it, and split traffic between the two. Nothing is declared a winner until it clears both a minimum sample and a significance test."
    >
      <UiButton v-if="can('experiment:write')" variant="primary" @click="creating = true">
        New experiment
      </UiButton>
    </UiEmptyState>

    <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <!-- The roster. Deliberately quiet: the numbers live on the right. -->
      <ul class="flex flex-col gap-2">
        <li v-for="experiment in experiments" :key="experiment.id">
          <button
            type="button"
            class="w-full rounded-card border bg-raised px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-150 hover:border-line-strong"
            :class="experiment.id === selectedId ? 'border-brand shadow-raised' : 'border-line'"
            @click="selectedId = experiment.id"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink">
                {{ experiment.name }}
              </p>
              <UiBadge :tone="STATUS_TONE[experiment.status] ?? 'neutral'">{{ experiment.status }}</UiBadge>
            </div>
            <p class="mt-1 text-[0.8125rem] text-faint">
              {{ experiment.variants.length }} variants ·
              {{ experiment.targetMetric === 'revenue' ? 'revenue' : 'conversion' }}
              <span v-if="experiment.autonomous"> · autonomous</span>
            </p>
          </button>
        </li>
      </ul>

      <div v-if="selected" class="flex flex-col gap-4">
        <UiCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="text-heading font-semibold text-ink">{{ selected.name }}</h2>
              <p v-if="selected.hypothesis" class="mt-1 max-w-prose text-[0.875rem] leading-relaxed text-soft">
                {{ selected.hypothesis }}
              </p>
            </div>
            <UiBadge v-if="verdict" :tone="verdict.tone">{{ verdict.label }}</UiBadge>
          </div>

          <p v-if="results" class="mt-4 max-w-prose text-[0.875rem] leading-relaxed text-ink">
            {{ results.summary }}
          </p>
          <p v-else-if="resultsError" class="mt-4 text-[0.8125rem] text-danger" role="alert">
            {{ resultsError }}
          </p>

          <!-- The sample gate, shown as what it is: a floor, not a forecast. -->
          <div v-if="results && !results.sampleGateMet" class="mt-4">
            <div class="flex items-baseline justify-between text-[0.75rem] uppercase tracking-[0.06em] text-faint">
              <span>Minimum sample</span>
              <span>{{ results.smallestSample }} / {{ results.minimumSamplePerVariant }}</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
              <div
                class="h-full rounded-full bg-brand transition-[width] duration-300"
                :style="{ width: `${gateProgress * 100}%` }"
              />
            </div>
          </div>

          <div v-if="can('experiment:write')" class="mt-5 flex flex-wrap gap-2">
            <UiButton
              v-if="selected.status === 'draft' || selected.status === 'paused'"
              size="sm"
              variant="primary"
              :loading="busy"
              @click="act('start')"
            >
              Start
            </UiButton>
            <UiButton v-if="selected.status === 'running'" size="sm" :loading="busy" @click="act('pause')">
              Pause
            </UiButton>
            <UiButton
              v-if="selected.status === 'running' || selected.status === 'paused'"
              size="sm"
              :loading="busy"
              @click="act('complete')"
            >
              Finish
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="busy"
              :disabled="results?.status !== 'winner_found'"
              @click="act('deploy-winner')"
            >
              Deploy winner
            </UiButton>
            <UiButton v-if="selected.deployedVariantId" size="sm" :loading="busy" @click="act('rollback')">
              Roll back
            </UiButton>
          </div>

          <p v-if="results && results.status !== 'winner_found'" class="mt-2 text-[0.8125rem] text-faint">
            Deploying is off until a variant actually wins.
          </p>
          <p v-if="actionError" class="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
            {{ actionError }}
          </p>
        </UiCard>

        <UiCard v-if="results">
          <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Variants</h3>

          <div class="-mx-1 overflow-x-auto">
            <table class="w-full min-w-[34rem] border-collapse text-[0.875rem]">
              <thead>
                <tr class="text-left text-[0.75rem] uppercase tracking-[0.06em] text-faint">
                  <th class="px-1 pb-2 font-medium">Variant</th>
                  <th class="px-1 pb-2 text-right font-medium">Visitors</th>
                  <th class="px-1 pb-2 text-right font-medium">Conv.</th>
                  <th class="px-1 pb-2 text-right font-medium">Rate</th>
                  <th class="px-1 pb-2 text-right font-medium">
                    {{ results.targetMetric === 'revenue' ? 'Per visitor' : 'Uplift' }}
                  </th>
                  <th class="px-1 pb-2 text-right font-medium">p</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="variant in results.variants"
                  :key="variant.variantId"
                  class="border-t border-line"
                  :class="variant.variantId === results.winner?.variantId ? 'bg-positive-soft' : ''"
                >
                  <td class="px-1 py-2.5">
                    <span class="font-medium text-ink">{{ variant.name }}</span>
                    <span v-if="variant.isControl" class="ml-2 text-[0.75rem] text-faint">control</span>
                  </td>
                  <td class="px-1 py-2.5 text-right tabular-nums text-soft">{{ variant.exposures }}</td>
                  <td class="px-1 py-2.5 text-right tabular-nums text-soft">{{ variant.conversions }}</td>
                  <td class="px-1 py-2.5 text-right tabular-nums text-ink">{{ percent(variant.conversionRate) }}</td>
                  <td class="px-1 py-2.5 text-right tabular-nums text-ink">
                    <template v-if="results.targetMetric === 'revenue'">
                      {{ variant.revenuePerVisitor.toFixed(2) }}
                    </template>
                    <template v-else>{{ signed(variant.uplift) }}</template>
                  </td>
                  <td class="px-1 py-2.5 text-right tabular-nums" :class="variant.significant ? 'text-ink' : 'text-faint'">
                    {{ variant.pValue === null ? '—' : variant.pValue.toFixed(4) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="mt-3 text-[0.75rem] leading-relaxed text-faint">
            Significance is a two-proportion z-test against the control at
            {{ percent(results.confidenceLevel, 0) }} confidence, gated on
            {{ results.minimumSamplePerVariant }} visitors per variant.
          </p>
        </UiCard>
      </div>
    </div>

    <UiDialog
      v-model:open="creating"
      title="New experiment"
      description="Pick a section, change it, and split the traffic."
    >
      <form class="flex flex-col gap-4" @submit.prevent="createExperiment">
        <UiField v-slot="{ id }" label="Website" required>
          <UiSelect
            :id="id"
            v-model="form.siteId"
            :options="withPlaceholder((sites ?? []).map((site) => ({ label: site.name, value: site.id })), 'Choose a website')"
          />
        </UiField>

        <UiField v-slot="{ id }" label="Page" required>
          <UiSelect
            :id="id"
            v-model="form.pageId"
            :options="withPlaceholder(pages.map((item) => ({ label: `${item.title} — ${item.path}`, value: item.id })), 'Choose a page')"
          />
        </UiField>

        <UiField v-slot="{ id }" label="Section to test" required>
          <UiSelect
            :id="id"
            v-model="form.sectionId"
            :options="withPlaceholder((page?.sections ?? []).map((section) => ({ label: section.block, value: section.id })), 'Choose a section')"
          />
        </UiField>

        <UiField v-slot="{ id, describedBy }" label="Name" required>
          <UiInput :id="id" v-model="form.name" :described-by="describedBy" placeholder="Hero headline test" />
        </UiField>

        <UiField
          v-slot="{ id, describedBy }"
          label="Hypothesis"
          help="What you expect to happen, and why. It is stored with the result."
        >
          <UiTextarea
            :id="id"
            v-model="form.hypothesis"
            :described-by="describedBy"
            placeholder="A benefit-led headline will convert better than a feature-led one."
          />
        </UiField>

        <UiField
          v-slot="{ id, describedBy }"
          label="Minimum visitors per variant"
          help="No result is reported until every variant reaches this."
        >
          <UiInput :id="id" v-model="form.minimumSample" type="number" :described-by="describedBy" />
        </UiField>

        <div v-if="draftSection && draftBlock" class="rounded-card border border-line bg-sunken p-4">
          <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Variant A</h3>
          <SectionForm
            :section="draftSection"
            :block="draftBlock"
            :pages="pages"
            :site-id="form.siteId || null"
            @update="updateDraftProps"
          />
        </div>

        <p v-if="createError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
          {{ createError }}
        </p>
      </form>

      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!canCreate" @click="createExperiment">
          Create
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
