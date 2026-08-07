<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createSection } from '@platform/blocks'
import type { Section, Site, Theme, ThemeTokens } from '@platform/schemas'
import {
  contrastReport,
  getPreset,
  repairTokens,
  resolveLightTokens,
  themeFromPreset,
  themeFromSeed,
  writeLightTokens,
} from '@platform/theming'

/**
 * The theme editor.
 *
 * Three ways in, one way out. A preset, a generated palette, or a hand-set
 * token — all three land in the same place, and all three are measured by the
 * same contrast report, which is on screen the whole time rather than behind a
 * "check accessibility" button nobody presses.
 *
 * The preview is the real block library rendering the real theme, because a
 * swatch grid cannot tell you that your muted text disappears inside a card.
 */
const api = useApi()
const activeSiteId = useActiveSiteId()

const { data: site } = await useAsyncData(
  () => `website:theme:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Site>(`/api/v1/sites/${activeSiteId.value}`) : Promise.resolve(null)),
  { watch: [activeSiteId] },
)

const saving = ref(false)
const saved = ref(false)

/** Which half of the theme the editor is currently showing and editing. */
const editing = ref<'light' | 'dark'>('light')
const tab = ref<'presets' | 'palette' | 'tokens'>('presets')

const theme = computed<Theme | null>(() => site.value?.theme ?? null)

const light = computed<ThemeTokens | null>(() => (theme.value ? resolveLightTokens(theme.value) : null))
const dark = computed<ThemeTokens | null>(() => theme.value?.dark ?? null)

/** The dark tab is only meaningful once a dark set exists. */
const hasDark = computed(() => Boolean(dark.value))
watch(hasDark, (value) => {
  if (!value) editing.value = 'light'
})

const shown = computed<ThemeTokens | null>(() => (editing.value === 'dark' ? dark.value : light.value))

const report = computed(() => (light.value ? contrastReport(light.value, dark.value) : null))

const failuresForMode = computed(() => report.value?.failures.filter((pair) => pair.mode === editing.value) ?? [])

// region Mutations

function apply(next: Theme) {
  if (!site.value) return
  site.value = { ...site.value, theme: next }
}

/**
 * A preset and a generated palette both bring a dark half with them — but
 * neither switches the site over to it. Turning half a site's visitors onto a
 * dark theme is a decision, not a side effect of picking a colour, so `mode` is
 * left alone and the mode select simply becomes available.
 */
function applyPreset(id: string) {
  if (!theme.value) return
  apply(themeFromPreset(theme.value, id, theme.value.mode))
}

function applySeed(seed: string) {
  if (!theme.value) return
  apply(themeFromSeed(theme.value, seed, theme.value.mode))
}

/**
 * A hand-set token. It is written through exactly as typed — overriding into a
 * failing pair is allowed, and the report says so immediately.
 */
function setToken(key: keyof ThemeTokens, value: string) {
  const current = theme.value
  if (!current) return

  if (editing.value === 'dark') {
    if (!current.dark) return
    apply({ ...current, dark: { ...current.dark, [key]: value }, presetId: null })
    return
  }

  const tokens = resolveLightTokens(current)
  apply({ ...writeLightTokens(current, { ...tokens, [key]: value }), presetId: null })
}

/** Deliberate, and never automatic: repair moves colours the user chose. */
function repair() {
  const current = theme.value
  if (!current) return

  if (editing.value === 'dark' && current.dark) {
    apply({ ...current, dark: repairTokens(current.dark) })
    return
  }

  apply(writeLightTokens(current, repairTokens(resolveLightTokens(current))))
}

function setMode(mode: Theme['mode']) {
  const current = theme.value
  if (!current) return
  apply({ ...current, mode })
}

function removeDark() {
  const current = theme.value
  if (!current) return
  editing.value = 'light'
  apply({ ...current, mode: 'light', dark: null })
}

async function save() {
  if (!site.value) return
  saving.value = true
  saved.value = false
  try {
    await api.patch(`/api/v1/sites/${activeSiteId.value}`, { theme: site.value.theme })
    saved.value = true
    setTimeout(() => (saved.value = false), 2500)
  } finally {
    saving.value = false
  }
}

// endregion

// region Presentation

const RADIUS = [
  { label: 'Square', value: 'none' },
  { label: 'Slight', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Round', value: 'lg' },
  { label: 'Pill', value: 'full' },
]

const MODES = [
  { label: 'Light only', value: 'light' },
  { label: 'Dark only', value: 'dark' },
  { label: 'Follow the visitor', value: 'system' },
]

const TABS = [
  { key: 'presets', label: 'Presets' },
  { key: 'palette', label: 'Palette' },
  { key: 'tokens', label: 'Tokens' },
] as const

/**
 * Token rows, grouped the way someone reasons about a page rather than the
 * way the object is shaped. Each carries the background it has to be read
 * against, so the badge next to it measures the pair that actually matters.
 */
const TOKEN_GROUPS: {
  title: string
  items: { key: keyof ThemeTokens; label: string; against?: keyof ThemeTokens; minimum?: number }[]
}[] = [
  {
    title: 'Surfaces',
    items: [
      { key: 'surface', label: 'Page background' },
      { key: 'surfaceAlt', label: 'Alternate section' },
      { key: 'surfaceSunken', label: 'Sunken surface' },
    ],
  },
  {
    title: 'Text',
    items: [
      { key: 'text', label: 'Body text', against: 'surfaceSunken' },
      { key: 'textMuted', label: 'Muted text', against: 'surfaceSunken' },
    ],
  },
  {
    title: 'Primary action',
    items: [
      { key: 'primary', label: 'Primary fill', against: 'surface', minimum: 3 },
      { key: 'primaryHover', label: 'Primary hover', against: 'surface', minimum: 3 },
      { key: 'primaryInk', label: 'Label on primary', against: 'primary' },
    ],
  },
  {
    title: 'Accent',
    items: [
      { key: 'accent', label: 'Accent fill', against: 'surface', minimum: 3 },
      { key: 'accentInk', label: 'Label on accent', against: 'accent' },
    ],
  },
  {
    title: 'Lines',
    items: [
      { key: 'line', label: 'Hairline divider' },
      { key: 'lineStrong', label: 'Control border', against: 'surfaceAlt', minimum: 3 },
      { key: 'focus', label: 'Focus ring', against: 'surface', minimum: 3 },
    ],
  },
  {
    title: 'Status',
    items: [
      { key: 'positive', label: 'Success', against: 'surfaceAlt' },
      { key: 'warning', label: 'Warning', against: 'surfaceAlt' },
      { key: 'danger', label: 'Error', against: 'surfaceAlt' },
    ],
  },
]

const presetLabel = computed(() => (theme.value?.presetId ? getPreset(theme.value.presetId)?.label : null))

/**
 * The preview page: one of every block that carries a colour decision. Built
 * once — the theme reaches it through custom properties, not through props, so
 * it never has to be rebuilt when a token changes.
 */
const previewSections = computed<Section[]>(() => {
  const build = (id: string, props: Record<string, unknown>) => {
    try {
      return createSection(id, props)
    } catch {
      return null
    }
  }

  return [
    build('header-simple-01', {
      brand: site.value?.name ?? 'Your company',
      links: [
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/contact',
    }),
    build('hero-split-01', {
      eyebrow: 'Serving the region since 1998',
      headline: 'Work that holds up',
      subheadline: 'Every colour on this page comes from the theme you are editing on the left.',
      primaryLabel: 'Request a quote',
      primaryHref: '/contact',
      secondaryLabel: 'See our work',
      secondaryHref: '/work',
    }),
    build('features-grid-01', {
      heading: 'Why people call us',
      items: [
        { title: 'Fixed prices', description: 'A quote you can hold us to, before anyone starts.' },
        { title: 'One contact', description: 'The person who quoted the job is the person who runs it.' },
        { title: 'Guaranteed', description: 'Five years on workmanship, in writing.' },
      ],
    }),
    build('cta-banner-01', {
      heading: 'Ready to start?',
      body: 'Tell us what you need and we will come back within a day.',
      ctaLabel: 'Request a quote',
      ctaHref: '/contact',
      tone: 'primary',
    }),
    build('footer-simple-01', {
      brand: site.value?.name ?? 'Your company',
      tagline: 'Preview of the footer with your theme applied.',
      links: [{ label: 'Contact', href: '/contact' }],
      legal: `© ${new Date().getFullYear()}`,
    }),
  ].filter((section): section is Section => section !== null)
})

// endregion
</script>

<template>
  <div>
    <UiPageHeader
      title="Theme"
      description="Design tokens for this website. Blocks read them, so nothing needs rebuilding."
    >
      <template #actions>
        <UiButton size="sm" to="/website/style-guide">Style Guide</UiButton>
        <UiButton size="sm" to="/website/components">Components</UiButton>
        <UiButton size="sm" to="/website/templates">Templates</UiButton>
      </template>
    </UiPageHeader>

    <UiEmptyState v-if="!site || !theme || !light" title="No website selected" description="Create a website first." />

    <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-start">
      <!-- Editor ---------------------------------------------------------- -->
      <div class="flex flex-col gap-5">
        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                v-for="entry in TABS"
                :key="entry.key"
                type="button"
                class="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150"
                :class="tab === entry.key ? 'bg-brand-soft text-brand' : 'text-soft hover:bg-sunken hover:text-ink'"
                :aria-pressed="tab === entry.key"
                @click="tab = entry.key"
              >
                {{ entry.label }}
              </button>
            </div>

            <!-- Which half is being edited and previewed. -->
            <div class="flex items-center gap-2">
              <span class="text-[0.75rem] text-faint">Editing</span>
              <div class="flex overflow-hidden rounded-lg border border-line">
                <button
                  v-for="half in (['light', 'dark'] as const)"
                  :key="half"
                  type="button"
                  class="px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                  :class="editing === half ? 'bg-brand text-brand-ink' : 'bg-raised text-soft hover:bg-sunken'"
                  :disabled="half === 'dark' && !hasDark"
                  :title="half === 'dark' && !hasDark ? 'Apply a preset or generate a palette to add a dark theme.' : ''"
                  @click="editing = half"
                >
                  {{ half }}
                </button>
              </div>
            </div>
          </div>

          <!-- Presets --------------------------------------------------- -->
          <div v-show="tab === 'presets'">
            <p class="mb-4 text-[0.8125rem] text-soft">
              Twenty-one shadcn base themes. Each brings a full light and dark token set, and every one is
              checked against WCAG AA before it ships.
              <span v-if="presetLabel" class="text-ink"> Currently: <strong>{{ presetLabel }}</strong>.</span>
            </p>
            <ThemePresetGrid :selected="theme.presetId" :mode="editing" @select="applyPreset" />
          </div>

          <!-- Palette generator ----------------------------------------- -->
          <div v-show="tab === 'palette'">
            <p class="mb-4 text-[0.8125rem] text-soft">
              Build a palette from one colour. Steps are evenly spaced in OKLCH, so the ramp reads as even at
              every hue — the thing an HSL ramp gets wrong badly enough to ship unreadable yellow buttons.
            </p>
            <PalettePicker
              :seed="theme.palette?.seed ?? theme.colorPrimary"
              :palette="theme.palette"
              @apply="applySeed"
            />
          </div>

          <!-- Token overrides -------------------------------------------- -->
          <div v-show="tab === 'tokens'" class="flex flex-col gap-5">
            <p class="text-[0.8125rem] text-soft">
              Every colour in the <span class="capitalize">{{ editing }}</span> theme. Overriding one clears the
              preset link — the ratio next to each pair updates as you type, and a failing pair stays visible
              rather than being corrected behind your back.
            </p>

            <div v-if="editing === 'light'" class="flex flex-col gap-3">
              <h3 class="text-label font-semibold uppercase text-faint">Fills</h3>
              <ColorFillField
                :hex="site.theme.colorPrimary"
                :gradient="site.theme.gradientPrimary"
                label="Primary"
                @update:hex="site.theme.colorPrimary = $event; site.theme.presetId = null"
                @update:gradient="site.theme.gradientPrimary = $event; site.theme.presetId = null"
              />
              <ColorFillField
                :hex="site.theme.colorSurface"
                :gradient="site.theme.gradientSurface"
                label="Background"
                @update:hex="site.theme.colorSurface = $event; site.theme.presetId = null"
                @update:gradient="site.theme.gradientSurface = $event; site.theme.presetId = null"
              />
              <ColorFillField
                :hex="site.theme.colorSurfaceAlt"
                :gradient="site.theme.gradientSurfaceAlt"
                label="Surface"
                @update:hex="site.theme.colorSurfaceAlt = $event; site.theme.presetId = null"
                @update:gradient="site.theme.gradientSurfaceAlt = $event; site.theme.presetId = null"
              />
            </div>

            <div v-if="editing === 'dark' && !dark" class="rounded-lg border border-line bg-sunken px-4 py-3 text-[0.8125rem] text-soft">
              This site has no dark theme yet. Apply a preset or generate a palette to add one.
            </div>

            <div v-else-if="shown" class="flex flex-col gap-5">
              <div v-for="group in TOKEN_GROUPS" :key="group.title">
                <h3 class="mb-2 text-label font-semibold uppercase text-faint">{{ group.title }}</h3>
                <div class="flex flex-col gap-2">
                  <div
                    v-for="item in group.items"
                    :key="item.key"
                    class="flex flex-wrap items-center gap-2.5 rounded-lg border border-line px-3 py-2"
                  >
                    <input
                      :id="`token-${item.key}`"
                      type="color"
                      :value="shown[item.key]"
                      class="h-8 w-9 shrink-0 cursor-pointer rounded border border-line bg-raised p-0.5"
                      @input="setToken(item.key, ($event.target as HTMLInputElement).value)"
                    />
                    <label :for="`token-${item.key}`" class="min-w-32 flex-1 text-[0.8125rem] text-ink">
                      {{ item.label }}
                    </label>
                    <input
                      type="text"
                      :value="shown[item.key]"
                      class="h-8 w-24 rounded border border-line bg-raised px-2 font-mono text-[0.75rem] text-ink"
                      spellcheck="false"
                      @change="setToken(item.key, ($event.target as HTMLInputElement).value)"
                    />
                    <ContrastBadge
                      v-if="item.against"
                      size="sm"
                      :foreground="shown[item.key]"
                      :background="shown[item.against]"
                      :minimum="item.minimum ?? 4.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Typography, shape, mode ------------------------------------- -->
        <UiCard>
          <h2 class="mb-4 text-heading font-semibold text-ink">Typography and shape</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <UiField v-slot="{ id }" label="Corners">
              <UiSelect :id="id" v-model="site.theme.radius" :options="RADIUS" />
            </UiField>
            <UiField v-slot="{ id }" label="Heading font">
              <GoogleFontSelect :id="id" v-model="site.theme.fontHeading" />
            </UiField>
            <UiField v-slot="{ id }" label="Body font">
              <GoogleFontSelect :id="id" v-model="site.theme.fontBody" />
            </UiField>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <UiField
              v-slot="{ id }"
              label="Colour mode"
              :help="hasDark ? 'Which half published pages use.' : 'Add a dark theme first by applying a preset or generating a palette.'"
            >
              <UiSelect
                :id="id"
                :model-value="theme.mode"
                :options="MODES"
                @update:model-value="setMode($event as Theme['mode'])"
              />
            </UiField>
            <UiButton v-if="hasDark" variant="ghost" @click="removeDark">Remove dark theme</UiButton>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <UiButton variant="primary" :loading="saving" @click="save">Save theme</UiButton>
            <p v-if="saved" class="text-[0.8125rem] text-positive">Saved. Republish a page to see it live.</p>
          </div>
        </UiCard>
      </div>

      <!-- Report and preview ---------------------------------------------- -->
      <div class="flex flex-col gap-5 xl:sticky xl:top-4">
        <UiCard>
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-heading font-semibold text-ink">Contrast</h2>
            <UiBadge :tone="report?.passes ? 'positive' : 'danger'">
              {{ report?.passes ? 'Passes AA' : `${report?.failures.length} failing` }}
            </UiBadge>
          </div>

          <p v-if="report?.passes" class="text-[0.8125rem] text-soft">
            Every text and control pair in this theme clears WCAG AA — 4.5:1 for body text, 3:1 for large text
            and control boundaries.
          </p>

          <template v-else>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="pair in report?.failures ?? []"
                :key="pair.id"
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2"
              >
                <span class="text-[0.8125rem] text-ink">
                  {{ pair.label }}
                  <span class="text-faint">({{ pair.mode }})</span>
                </span>
                <ContrastBadge
                  size="sm"
                  :foreground="pair.foreground"
                  :background="pair.background"
                  :minimum="pair.minimum"
                />
              </li>
            </ul>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <UiButton size="sm" variant="secondary" :disabled="!failuresForMode.length" @click="repair">
                Fix the {{ editing }} theme
              </UiButton>
              <p class="text-[0.75rem] text-faint">Moves lightness until each pair passes; hues stay put.</p>
            </div>
          </template>
        </UiCard>

        <UiCard>
          <h2 class="mb-3 text-heading font-semibold text-ink">Preview</h2>
          <p class="mb-3 text-[0.8125rem] text-faint">
            The real block library, rendering the <span class="capitalize">{{ editing }}</span> theme.
          </p>
          <!-- The editor canvas itself, not a second implementation of it: the
               token mapping lives in one place, so the preview cannot drift
               from what the page editor shows. -->
          <div class="max-h-[36rem] overflow-auto rounded-lg border border-line bg-canvas">
            <EditorCanvas
              :sections="previewSections"
              :theme="site.theme"
              :selected-id="null"
              device="desktop"
              :zoom="30"
              :mode="editing"
            />
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
