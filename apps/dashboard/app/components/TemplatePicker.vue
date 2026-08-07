<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SiteTemplate, TemplateCollection } from '@platform/schemas'
import { Plus } from '@lucide/vue'

/**
 * The template browser, as a component.
 *
 * One implementation serves the full-page theme store and the compact step in
 * onboarding, because a template that looks one way while browsing and another
 * way while choosing is two products. Fetching lives here so a caller only has
 * to say which subset it wants.
 *
 * The card previews a template by rendering its block recipe live, so what you
 * see on the card is what generation will actually build from.
 */
const props = withDefaults(
  defineProps<{
    /** Selected template id, or `null` for "let the platform choose". */
    modelValue?: string | null
    /** Hide templates heavier than the site's budget can render. */
    maxPerformanceClass?: 'A' | 'B' | 'C' | 'D'
    /** Offer the "no template" card. On by default — it is the default choice. */
    allowNone?: boolean
    showRail?: boolean
    /** Distinguishes the cached fetch when two pickers share a page load. */
    cacheKey?: string
    /** Active site theme so card miniatures match the customer's colours. */
    theme?: import('@platform/schemas').Theme | null
  }>(),
  {
    modelValue: null,
    maxPerformanceClass: undefined,
    allowNone: true,
    showRail: true,
    cacheKey: 'templates',
    theme: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string | null]
  inspect: [SiteTemplate]
}>()

const api = useApi()

const collection = ref<string>('')
const search = ref('')
const freeOnly = ref(false)

const query = computed(() => ({
  collection: collection.value || undefined,
  search: search.value.trim() || undefined,
  maxPerformanceClass: props.maxPerformanceClass,
  freeOnly: freeOnly.value ? 'true' : undefined,
  limit: 300,
}))

// Lazy, and deliberately not awaited: this component mounts *after* hydration
// when onboarding advances to its step, and an async `setup` there would
// re-suspend the page's Suspense boundary and blank the screen.
const { data: collections } = useAsyncData(
  `${props.cacheKey}:collections`,
  () => api.get<TemplateCollection[]>('/api/v1/templates/collections'),
  { lazy: true, default: () => [] as TemplateCollection[] },
)

const { data: templates, refresh, status } = useAsyncData(
  `${props.cacheKey}:list`,
  () => api.get<SiteTemplate[]>('/api/v1/templates', query.value),
  { lazy: true, default: () => [] as SiteTemplate[] },
)

// Debounced so typing does not fire a request per keystroke.
let timer: ReturnType<typeof setTimeout> | undefined
watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(() => refresh(), 180)
})

const total = computed(() => collections.value?.reduce((sum, entry) => sum + entry.count, 0) ?? 0)

function choose(id: string | null) {
  emit('update:modelValue', props.modelValue === id ? null : id)
}

const MOTION_LABELS: Record<string, string> = {
  static: 'still',
  entrance: 'entrance',
  'scroll-reveal': 'scroll reveal',
  parallax: 'parallax',
  'sticky-scroll': 'sticky scroll',
  'horizontal-scroll': 'horizontal',
  marquee: 'marquee',
  carousel: 'carousel',
  cursor: 'cursor',
  hover: 'hover',
  'text-effect': 'text effect',
  morph: 'morph',
  particles: 'particles',
  'three-d': '3D',
  video: 'video',
}
</script>

<template>
  <div class="grid gap-6" :class="showRail ? 'lg:grid-cols-[13rem_minmax(0,1fr)]' : ''">
    <!-- rail ------------------------------------------------------------- -->
    <aside v-if="showRail" class="lg:sticky lg:top-4 lg:self-start">
      <p class="mb-2 type-caption uppercase tracking-[0.08em] text-faint">Collections</p>
      <ul class="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
        <li>
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left type-button-12 transition-colors"
            :class="collection === '' ? 'bg-brand-soft text-brand' : 'text-soft hover:bg-sunken hover:text-ink'"
            @click="collection = ''"
          >
            <span>Everything</span>
            <span class="tabular-nums text-faint">{{ total }}</span>
          </button>
        </li>
        <li v-for="entry in collections" :key="entry.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left type-button-12 transition-colors"
            :class="collection === entry.id ? 'bg-brand-soft text-brand' : 'text-soft hover:bg-sunken hover:text-ink'"
            :title="entry.description"
            @click="collection = entry.id"
          >
            <span class="truncate">{{ entry.label }}</span>
            <span class="tabular-nums text-faint">{{ entry.count }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <!-- grid ------------------------------------------------------------- -->
    <div class="min-w-0">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="min-w-[12rem] flex-1">
          <UiInput v-model="search" placeholder="Search templates" aria-label="Search templates" />
        </div>
        <label class="flex cursor-pointer items-center gap-2 type-button-12 text-soft">
          <input v-model="freeOnly" type="checkbox" class="accent-[var(--brand)]" />
          Free only
        </label>
        <span class="type-caption-12 text-faint" role="status" aria-live="polite">
          {{ status === 'pending' ? 'Searching…' : `${templates?.length ?? 0} shown` }}
        </span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <!-- the default: no template at all -->
        <button
          v-if="allowNone"
          type="button"
          class="group flex flex-col overflow-hidden rounded-card border text-left transition-[border-color,box-shadow] duration-150"
          :class="
            modelValue === null
              ? 'border-brand shadow-[0_0_0_1px_var(--brand)]'
              : 'border-dashed border-line-strong hover:border-ink/35'
          "
          @click="emit('update:modelValue', null)"
        >
          <span class="grid aspect-[4/3] place-items-center bg-sunken">
            <span class="flex flex-col items-center gap-1.5 text-soft">
              <Plus class="h-7 w-7" :stroke-width="1.5" aria-hidden="true" />
              <span class="type-button-12">Let the platform choose</span>
            </span>
          </span>
          <span class="flex flex-col gap-1 border-t border-line bg-raised px-3 py-2.5">
            <span class="type-button text-ink">No starting point</span>
            <span class="type-caption-12 leading-relaxed text-faint">
              Sections are picked from your brand and your industry.
            </span>
          </span>
        </button>

        <article
          v-for="template in templates"
          :key="template.id"
          class="group flex flex-col overflow-hidden rounded-card border bg-raised transition-[border-color,box-shadow] duration-150"
          :class="
            modelValue === template.id
              ? 'border-brand shadow-[0_0_0_1px_var(--brand)]'
              : 'border-line hover:border-ink/25 hover:shadow-card'
          "
        >
          <button
            type="button"
            class="relative block w-full overflow-hidden bg-sunken"
            :aria-pressed="modelValue === template.id"
            :aria-label="`Choose ${template.title}`"
            @click="choose(template.id)"
          >
            <!--
              A live render of the template's own recipe. Not a screenshot: the
              recipe resolves to registry blocks, so this *is* the design the
              template produces, and it cannot drift from it.
            -->
            <TemplatePreview :block-ids="template.blockRecipe" :theme="theme" ratio="4 / 3" />

            <span
              v-if="modelValue === template.id"
              class="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-ink"
              aria-hidden="true"
            >✓</span>
            <span
              v-else-if="!template.isFree"
              class="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 type-button-10 uppercase tracking-[0.08em] text-white"
            >Premium</span>
          </button>

          <div class="flex flex-1 flex-col gap-2 border-t border-line px-3 py-2.5">
            <div class="flex items-start justify-between gap-2">
              <p class="min-w-0 truncate type-button text-ink">{{ template.title }}</p>
              <UiBadge :tone="template.isFree ? 'positive' : 'neutral'">
                {{ template.isFree ? 'Free' : 'Premium' }}
              </UiBadge>
            </div>

            <p class="type-caption-12 text-faint">
              {{ template.category }} ·
              {{ template.pageType === 'landing' ? 'whole page' : 'section' }} ·
              {{ template.style[0] }}
            </p>

            <div class="mt-auto flex items-center justify-between gap-2 pt-1">
              <span class="truncate type-button-10 uppercase tracking-[0.08em] text-faint">
                {{ template.motionType.map((type) => MOTION_LABELS[type] ?? type).slice(0, 2).join(' · ') }}
              </span>
              <button
                type="button"
                class="shrink-0 type-button-12 text-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
                @click="emit('inspect', template)"
              >
                Details
              </button>
            </div>
          </div>
        </article>
      </div>

      <UiEmptyState
        v-if="!templates?.length && status !== 'pending'"
        title="Nothing matches"
        description="Try a different collection, or clear the search."
      />
    </div>
  </div>
</template>
