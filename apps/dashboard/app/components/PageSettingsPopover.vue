<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  ContentQualityReport,
  ContentWidthPreset,
  Page,
  Section,
  Seo,
  SeoPageScore,
  Theme,
} from '@platform/schemas'
import { CONTENT_WIDTH_PRESETS } from '@platform/schemas'
import { AlignLeft } from '@lucide/vue'

/**
 * Page settings, in the editor's top bar.
 *
 * Title, search description, SEO fields and the site content-width measure
 * belong together next to the canvas controls: they describe the thing on
 * screen, not the section you happen to have selected.
 *
 * Self-contained: it owns nothing. The page, the working title, the working SEO
 * and the working document come in as props; every change goes out as an event.
 *
 * Open state is local and never tied to the score request — a failed score must
 * leave the popover usable.
 */
const props = withDefaults(
  defineProps<{
    /** The saved page — used for its id, site and path, never as the edit buffer. */
    page: Page
    /** Working title, including unsaved edits. */
    title: string
    /** Working SEO, including unsaved edits. Never undefined on first paint. */
    seo?: Seo
    /** Working document, so the score reflects sections added since the last save. */
    sections?: Section[]
    /** Live site theme — content width writes back via `update:theme`. */
    theme?: Theme | null
    /** Disables every control — pass `!can('page:write')`. */
    disabled?: boolean
  }>(),
  {
    seo: () => ({ noIndex: false }),
    sections: () => [],
    theme: null,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:title': [value: string]
  'update:seo': [value: Seo]
  'update:theme': [theme: Theme]
}>()

const api = useApi()

/** Safe views of the defaults so the template never reads an undefined seo bag. */
const seo = computed<Seo>(() => ({
  title: props.seo?.title,
  description: props.seo?.description,
  ogImage: props.seo?.ogImage,
  canonical: props.seo?.canonical,
  noIndex: props.seo?.noIndex ?? false,
}))
const sections = computed(() => props.sections ?? [])

/** The lengths a search result actually shows — the same ones the audit uses. */
const TITLE_MAX = 60
const DESCRIPTION_MAX = 155
const DESCRIPTION_MIN = 70
/** Long enough that a fast typist is not measured mid-word. */
const SCORE_DEBOUNCE_MS = 700

const open = ref(false)
const showAdvanced = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

type PageScore = SeoPageScore & { quality: ContentQualityReport }

const score = ref<PageScore | null>(null)
const scoring = ref(false)
const scoreFailed = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
/** Ignores stale responses when the document changes mid-flight. */
let scoreRequest = 0

/** The effective search-result title: the SEO override, else the page title. */
const metaTitle = computed(() => (seo.value.title ?? '').trim() || props.title.trim())
const description = computed(() => (seo.value.description ?? '').trim())

const tone = computed<'positive' | 'warning' | 'danger'>(() => {
  const value = score.value?.score ?? 0
  if (value >= 80) return 'positive'
  if (value >= 55) return 'warning'
  return 'danger'
})

/** Worst first: a critical issue must never sit below a suggestion. */
const ORDER = { critical: 0, warning: 1, info: 2 } as const
const issues = computed(() =>
  [...(score.value?.issues ?? [])].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
)

const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'neutral' } as const

const CONTENT_WIDTH_OPTIONS = CONTENT_WIDTH_PRESETS.map((value) => ({
  value,
  label: value === 'full' ? 'Full' : value === 'custom' ? 'Custom' : `${value}px`,
  icon: value === 'full' ? 'align-center' : 'align-left',
}))

const contentWidth = computed<ContentWidthPreset>(() => props.theme?.contentWidth ?? 'full')
const contentWidthPx = computed(() => props.theme?.contentWidthPx ?? 1600)

function setSeo(patch: Partial<Seo>) {
  emit('update:seo', { ...seo.value, ...patch })
}

function setContentWidth(value: string | string[]) {
  if (!props.theme || props.disabled) return
  const preset = (Array.isArray(value) ? value[0] : value) as ContentWidthPreset
  if (!CONTENT_WIDTH_PRESETS.includes(preset)) return
  if (preset === 'custom') {
    emit('update:theme', {
      ...props.theme,
      contentWidth: 'custom',
      contentWidthPx: props.theme.contentWidthPx ?? 1600,
      presetId: null,
    })
    return
  }
  emit('update:theme', {
    ...props.theme,
    contentWidth: preset,
    contentWidthPx: null,
    presetId: null,
  })
}

function setCustomPx(raw: string) {
  if (!props.theme || props.disabled) return
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return
  emit('update:theme', {
    ...props.theme,
    contentWidth: 'custom',
    contentWidthPx: Math.min(2400, Math.max(320, n)),
    presetId: null,
  })
}

/** Toggle is a pure open-state flip — never gated on score success. */
function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
  trigger.value?.focus()
}

async function fetchScore() {
  const request = ++scoreRequest
  scoring.value = true
  scoreFailed.value = false
  try {
    const next = await api.post<PageScore>(
      `/api/v1/seo/sites/${props.page.siteId}/pages/${props.page.id}/score`,
      { title: props.title, seo: seo.value, sections: sections.value },
    )
    if (request !== scoreRequest) return
    score.value = next
  } catch {
    // A score is a helper, not the editor. Failing to get one must never block
    // editing or close the popover, so it degrades to "not measured".
    if (request !== scoreRequest) return
    scoreFailed.value = true
  } finally {
    if (request === scoreRequest) scoring.value = false
  }
}

function scheduleScore() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    void fetchScore()
  }, SCORE_DEBOUNCE_MS)
}

watch(
  () => [props.title, seo.value, sections.value] as const,
  () => scheduleScore(),
  { deep: true },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    close()
  }
}

function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)
  void fetchScore()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
  if (timer) clearTimeout(timer)
  scoreRequest += 1
})
</script>

<template>
  <!--
    Stacking: the editor body paints after the header in the DOM, so without a
    raised stacking context the absolute panel is covered by chrome/canvas.
    `--z-nav-flyout` is the shell-popover rung — above canvas chrome, below modals.
  -->
  <div ref="root" class="relative z-[var(--z-nav-flyout)]">
    <button
      ref="trigger"
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-md border border-line bg-raised px-2 text-soft transition-colors hover:border-line-strong hover:text-ink"
      :class="open ? 'border-line-strong text-ink' : ''"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click.stop="toggleOpen"
    >
      <AlignLeft class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
      <span class="type-button-12">Page</span>
      <span
        v-if="score"
        class="ml-0.5 rounded px-1 tabular-nums type-button-12"
        :class="{
          'bg-positive-soft text-positive': tone === 'positive',
          'bg-warning-soft text-warning': tone === 'warning',
          'bg-danger-soft text-danger': tone === 'danger',
        }"
      >{{ score.score }}</span>
    </button>

    <div
      v-if="open"
      role="dialog"
      aria-label="Page settings"
      class="absolute left-0 top-9 z-[var(--z-nav-flyout)] w-[23rem] rounded-card border border-line bg-raised p-4 shadow-raised"
      @click.stop
    >
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h2 class="type-button text-ink">Page settings</h2>
        <p class="type-caption-12 truncate text-faint">{{ page.path }}</p>
      </div>

      <div class="flex flex-col gap-3.5">
        <UiField v-slot="{ id }" label="Title">
          <UiInput
            :id="id"
            :model-value="title"
            :disabled="disabled"
            @update:model-value="emit('update:title', $event)"
          />
        </UiField>

        <UiField v-slot="{ id }" label="Search description">
          <UiTextarea
            :id="id"
            :model-value="seo.description ?? ''"
            :rows="3"
            :disabled="disabled"
            @update:model-value="setSeo({ description: $event })"
          />
        </UiField>

        <!-- The two lengths that decide what a search result shows. -->
        <div class="flex items-center justify-between gap-4 type-caption-12">
          <span :class="metaTitle.length > TITLE_MAX ? 'text-warning' : 'text-faint'">
            Title {{ metaTitle.length }}/{{ TITLE_MAX }}
          </span>
          <span
            :class="
              description.length > DESCRIPTION_MAX || (description.length > 0 && description.length < DESCRIPTION_MIN)
                ? 'text-warning'
                : 'text-faint'
            "
          >
            Description {{ description.length }}/{{ DESCRIPTION_MAX }}
          </span>
        </div>

        <div v-if="theme" class="flex flex-col gap-2 border-t border-line pt-3">
          <UiOptionGrid
            label="Layout / content width"
            :options="CONTENT_WIDTH_OPTIONS"
            :columns="3"
            :model-value="contentWidth"
            @update:model-value="setContentWidth"
          />
          <p class="type-caption-12 text-faint">
            Site-wide measure. Sections set to Wide follow it; Motionsites stay full-bleed.
          </p>
          <UiField
            v-if="contentWidth === 'custom'"
            v-slot="{ id, describedBy }"
            label="Custom width (px)"
            help="320–2400"
          >
            <UiInput
              :id="id"
              type="number"
              :model-value="String(contentWidthPx)"
              :described-by="describedBy"
              :disabled="disabled"
              min="320"
              max="2400"
              @update:model-value="setCustomPx($event)"
            />
          </UiField>
        </div>

        <button
          type="button"
          class="type-caption-12 self-start text-soft transition-colors hover:text-ink"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '− Fewer options' : '+ Search engine options' }}
        </button>

        <template v-if="showAdvanced">
          <UiField
            v-slot="{ id, describedBy }"
            label="Search result title"
            help="Leave empty to use the page title."
          >
            <UiInput
              :id="id"
              :model-value="seo.title ?? ''"
              :described-by="describedBy"
              :disabled="disabled"
              @update:model-value="setSeo({ title: $event || undefined })"
            />
          </UiField>

          <UiField v-slot="{ id }" label="Share image URL">
            <UiInput
              :id="id"
              :model-value="seo.ogImage ?? ''"
              :disabled="disabled"
              placeholder="https://…"
              @update:model-value="setSeo({ ogImage: $event || undefined })"
            />
          </UiField>

          <UiField
            v-slot="{ id, describedBy }"
            label="Canonical URL"
            help="Only when this page duplicates another address."
          >
            <UiInput
              :id="id"
              :model-value="seo.canonical ?? ''"
              :described-by="describedBy"
              :disabled="disabled"
              placeholder="https://…"
              @update:model-value="setSeo({ canonical: $event || undefined })"
            />
          </UiField>

          <label class="flex items-center justify-between gap-3">
            <span class="type-caption-12 text-soft">Hide from search engines</span>
            <UiSwitch
              :model-value="seo.noIndex"
              label="Hide from search engines"
              @update:model-value="setSeo({ noIndex: $event })"
            />
          </label>
        </template>
      </div>

      <!-- Score ---------------------------------------------------------- -->
      <div class="mt-4 border-t border-line pt-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="type-button-12 text-ink">SEO score</h3>
          <span v-if="scoring" class="type-caption-12 text-faint">Checking…</span>
          <UiBadge v-else-if="score" :tone="tone">{{ score.score }}/100</UiBadge>
          <span v-else-if="scoreFailed" class="type-caption-12 text-faint">Not measured</span>
        </div>

        <p v-if="score" class="type-caption-12 mt-1.5 text-faint">
          {{ score.wordCount }} words · {{ score.sectionCount }} sections ·
          <span :class="score.quality.passed ? 'text-positive' : 'text-warning'">
            content {{ score.quality.score }}/100
            {{ score.quality.passed ? '· substantial enough to publish' : '· too thin to publish' }}
          </span>
        </p>

        <ul v-if="issues.length" class="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
          <li v-for="(issue, index) in issues" :key="`${issue.code}-${index}`" class="flex gap-2">
            <UiBadge :tone="SEVERITY_TONE[issue.severity]">{{ issue.severity }}</UiBadge>
            <div class="min-w-0">
              <p class="type-caption-12 text-ink">{{ issue.message }}</p>
              <p class="type-caption-12 text-faint">{{ issue.fix }}</p>
            </div>
          </li>
        </ul>

        <p v-else-if="score" class="type-caption-12 mt-3 text-positive">
          Nothing to fix on this page.
        </p>

        <p v-else-if="scoreFailed" class="type-caption-12 mt-3 text-faint">
          The score could not be loaded. Editing is unaffected.
        </p>
      </div>
    </div>
  </div>
</template>
