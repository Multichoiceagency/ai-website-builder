<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createSection } from '@platform/blocks'
import type { Section, SeoSettings, Site, Theme, ThemeTokens } from '@platform/schemas'
import {
  getPreset,
  resolveLightTokens,
  themeFromPreset,
  themeFromSeed,
  writeLightTokens,
} from '@platform/theming'

/**
 * Site Style Guide — live theme surface with Colors / Typography / Buttons /
 * Spacing / Preview. Patches `site.theme` immediately; save persists via PATCH.
 * Brand logo lives on SEO business settings and feeds header fallbacks.
 */
const api = useApi()
const activeSiteId = useActiveSiteId()
const { fontSelectOptions: curatedFontOptions, ensureLoaded } = useGoogleFonts()

/** Curated list plus any custom family already on the theme so the select stays honest. */
const fontSelectOptions = computed(() => {
  const base = [...curatedFontOptions]
  const seen = new Set(base.map((entry) => entry.value.toLowerCase()))
  for (const family of [theme.value?.fontHeading, theme.value?.fontBody]) {
    if (!family || seen.has(family.toLowerCase())) continue
    seen.add(family.toLowerCase())
    base.unshift({ label: `${family} (current)`, value: family })
  }
  return base
})

const { data: site } = await useAsyncData(
  () => `website:style-guide:${activeSiteId.value}`,
  () => (activeSiteId.value ? api.get<Site>(`/api/v1/sites/${activeSiteId.value}`) : Promise.resolve(null)),
  { watch: [activeSiteId] },
)

const { data: seoSettings, refresh: refreshSeo } = await useAsyncData(
  () => `website:style-guide:seo:${activeSiteId.value}`,
  () =>
    activeSiteId.value
      ? api.get<SeoSettings>(`/api/v1/seo/sites/${activeSiteId.value}/settings`)
      : Promise.resolve(null),
  { watch: [activeSiteId] },
)

const brandLogo = ref('')
watch(
  seoSettings,
  (value) => {
    brandLogo.value = value?.business.logo?.trim() ?? ''
  },
  { immediate: true },
)

const logoMissing = computed(() => !brandLogo.value.trim())
const savingLogo = ref(false)
const logoSaved = ref(false)
const logoError = ref('')

async function saveBrandLogo() {
  if (!activeSiteId.value || !seoSettings.value) return
  savingLogo.value = true
  logoError.value = ''
  logoSaved.value = false
  try {
    await api.put(`/api/v1/seo/sites/${activeSiteId.value}/settings`, {
      business: { ...seoSettings.value.business, logo: brandLogo.value.trim() },
    })
    await refreshSeo()
    logoSaved.value = true
    setTimeout(() => (logoSaved.value = false), 2500)
  } catch (error) {
    logoError.value = error instanceof Error ? error.message : 'Could not save the brand logo.'
  } finally {
    savingLogo.value = false
  }
}

const saving = ref(false)
const saved = ref(false)
const tab = ref<'colors' | 'typography' | 'buttons' | 'spacing' | 'preview'>('colors')
const editing = ref<'light' | 'dark'>('light')

const importUrl = ref('')
const importing = ref(false)
const importNote = ref('')
const importError = ref('')
const importedColors = ref<string[]>([])

const theme = computed<Theme | null>(() => site.value?.theme ?? null)
const light = computed<ThemeTokens | null>(() => (theme.value ? resolveLightTokens(theme.value) : null))
const dark = computed<ThemeTokens | null>(() => theme.value?.dark ?? null)
const hasDark = computed(() => Boolean(dark.value))
const shown = computed<ThemeTokens | null>(() => (editing.value === 'dark' ? dark.value : light.value))

watch(hasDark, (value) => {
  if (!value) editing.value = 'light'
})

watch(
  () => [theme.value?.fontHeading, theme.value?.fontBody] as const,
  ([heading, body]) => {
    if (heading) ensureLoaded(heading)
    if (body) ensureLoaded(body)
  },
  { immediate: true },
)

const TABS = [
  { key: 'colors', label: 'Colors' },
  { key: 'typography', label: 'Typography' },
  { key: 'buttons', label: 'Buttons' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'preview', label: 'Preview' },
] as const

const RADIUS = [
  { label: 'Square', value: 'none' },
  { label: 'Slight', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Round', value: 'lg' },
  { label: 'Pill', value: 'full' },
]

const CONTENT_WIDTH = [
  { label: 'Full', value: 'full' },
  { label: '1280px', value: '1280' },
  { label: '1440px', value: '1440' },
  { label: '1600px', value: '1600' },
  { label: 'Custom', value: 'custom' },
]

const SPACING_STEPS = [
  { label: '4', px: 4 },
  { label: '8', px: 8 },
  { label: '12', px: 12 },
  { label: '16', px: 16 },
  { label: '24', px: 24 },
  { label: '32', px: 32 },
  { label: '48', px: 48 },
  { label: '64', px: 64 },
]

const PEEK_SAMPLES = [
  { className: 'type-large-title', label: 'Large title', sample: 'Aa' },
  { className: 'type-h1', label: 'H1 96', sample: 'Heading' },
  { className: 'type-h1-72', label: 'H1 72', sample: 'Heading' },
  { className: 'type-large-title-72', label: 'Large title 72', sample: 'Display' },
  { className: 'type-body', label: 'Body 48', sample: 'Body' },
  { className: 'type-h2', label: 'H2 48', sample: 'Section' },
  { className: 'type-body-20', label: 'Body 20 / 600', sample: 'Lead text for a section.' },
  { className: 'type-body-20-500', label: 'Body 20 / 500', sample: 'Lead text for a section.' },
  { className: 'type-button', label: 'Button 16', sample: 'Primary action' },
  { className: 'type-header', label: 'Header 16', sample: 'Navigation label' },
  { className: 'type-body-16', label: 'Body 16 Rubik', sample: 'Reading text sits on Rubik at sixteen.' },
  { className: 'type-small-body', label: 'Small body 14 / 500', sample: 'Compact panel copy.' },
  { className: 'type-small-body-14', label: 'Small body 14 / 400', sample: 'Compact panel copy.' },
  { className: 'type-caption', label: 'Caption 12', sample: 'SECTION LABEL' },
  { className: 'type-body-12', label: 'Body 12', sample: 'Help text and descriptions.' },
  { className: 'type-small', label: 'Small 10', sample: 'OVERLINE' },
] as const

const COLOR_SWATCHES: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'surface', label: 'Surface' },
  { key: 'surfaceAlt', label: 'Surface alt' },
  { key: 'surfaceSunken', label: 'Sunken' },
  { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Muted' },
  { key: 'line', label: 'Line' },
  { key: 'lineStrong', label: 'Line strong' },
  { key: 'positive', label: 'Positive' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
]

function apply(next: Theme) {
  if (!site.value) return
  site.value = { ...site.value, theme: next }
}

function applyPreset(id: string) {
  if (!theme.value) return
  apply(themeFromPreset(theme.value, id, theme.value.mode))
}

function applySeed(seed: string) {
  if (!theme.value) return
  apply(themeFromSeed(theme.value, seed, theme.value.mode))
}

/**
 * Crawl a public website and apply discovered brand colours (and fonts when
 * present) onto the live style guide — same discovery door as onboarding.
 */
async function importFromWebsite() {
  if (!theme.value || !site.value) return
  const website = importUrl.value.trim()
  if (!website) {
    importError.value = 'Enter a website URL.'
    return
  }

  importing.value = true
  importError.value = ''
  importNote.value = ''
  importedColors.value = []
  try {
    const result = await api.post<{
      profile: {
        company: { name: string }
        brand: {
          colors: string[]
          primaryColor: string
          fonts: string[]
          logo: string
        }
      }
      pagesCrawled: number
    }>('/api/v1/onboarding/discover', {
      website,
      maxPages: 6,
    })

    const brand = result.profile.brand
    const hexes = [brand.primaryColor, ...brand.colors]
      .map((entry) => entry.trim())
      .filter((entry) => /^#[0-9a-fA-F]{6}$/.test(entry))
    const unique = [...new Set(hexes)]
    importedColors.value = unique

    if (!unique.length) {
      importError.value =
        'No usable brand colours were found on that site. Try another URL or pick a seed below.'
      return
    }

    const seed = unique[0]!
    let next = themeFromSeed(theme.value, seed, theme.value.mode)
    if (unique[1]) {
      const tokens = resolveLightTokens(next)
      next = writeLightTokens(next, { ...tokens, accent: unique[1]! })
    }

    const fonts = brand.fonts.map((font) => font.trim()).filter(Boolean)
    if (fonts[0]) {
      ensureLoaded(fonts[0])
      next = { ...next, fontHeading: fonts[0]! }
    }
    if (fonts[1] || fonts[0]) {
      const body = fonts[1] || fonts[0]!
      ensureLoaded(body)
      next = { ...next, fontBody: body }
    }

    apply(next)
    tab.value = 'colors'
    const name = result.profile.company.name?.trim()
    importNote.value = name
      ? `Applied palette from ${name} (${result.pagesCrawled} pages). Save to persist.`
      : `Applied palette (${result.pagesCrawled} pages). Save to persist.`
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : 'Could not read that website.'
  } finally {
    importing.value = false
  }
}

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

function setThemeFill(
  key: 'colorPrimary' | 'colorSurface' | 'colorSurfaceAlt' | 'gradientPrimary' | 'gradientSurface' | 'gradientSurfaceAlt',
  value: string | null,
) {
  if (!theme.value) return
  apply({ ...theme.value, [key]: value, presetId: null })
}

function setFont(slot: 'fontHeading' | 'fontBody', family: string) {
  if (!theme.value || !site.value) return
  ensureLoaded(family)
  apply({ ...theme.value, [slot]: family })
}

function setContentWidth(value: string) {
  if (!theme.value) return
  if (value === 'custom') {
    apply({
      ...theme.value,
      contentWidth: 'custom',
      contentWidthPx: theme.value.contentWidthPx ?? 1600,
      presetId: null,
    })
    return
  }
  apply({
    ...theme.value,
    contentWidth: value as Theme['contentWidth'],
    contentWidthPx: null,
    presetId: null,
  })
}

function setContentWidthPx(raw: string) {
  if (!theme.value) return
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return
  apply({
    ...theme.value,
    contentWidth: 'custom',
    contentWidthPx: Math.min(2400, Math.max(320, n)),
    presetId: null,
  })
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

const presetLabel = computed(() => (theme.value?.presetId ? getPreset(theme.value.presetId)?.label : null))

const siteTypeStyle = computed(() => {
  if (!theme.value) return {}
  return {
    '--sg-heading': `${theme.value.fontHeading}, ui-serif, Georgia, serif`,
    '--sg-body': `${theme.value.fontBody}, ui-sans-serif, system-ui, sans-serif`,
  } as Record<string, string>
})

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
      logo: '',
      layout: 'left',
      links: [
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/contact',
    }),
    build('hero-split-01', {
      eyebrow: 'Style guide',
      headline: 'Work that holds up',
      subheadline: 'Fonts and colours update live as you edit.',
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
  ].filter((section): section is Section => section !== null)
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Style Guide"
      description="Live design tokens for this website. Changes preview instantly; save to persist."
    >
      <template #actions>
        <UiButton size="sm" to="/website/theme">Theme</UiButton>
        <UiButton size="sm" to="/website/components">Components</UiButton>
        <UiButton variant="primary" :loading="saving" :disabled="!site" @click="save">Save</UiButton>
        <p v-if="saved" class="type-small-body-14 text-positive">Saved.</p>
      </template>
    </UiPageHeader>

    <UiEmptyState v-if="!site || !theme || !light" title="No website selected" description="Create a website first." />

    <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <div class="flex flex-col gap-5">
        <UiCard>
          <div class="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="type-body-20-500 text-ink">Brand logo</h2>
              <p class="mt-1 type-body-12 text-soft">
                Site-wide mark used when a header has no logo of its own. Also powers SEO structured data.
              </p>
            </div>
            <UiButton size="sm" variant="primary" :loading="savingLogo" @click="saveBrandLogo">
              Save logo
            </UiButton>
          </div>
          <p
            v-if="logoMissing"
            class="mb-3 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 type-body-12 text-warning"
            role="status"
          >
            No brand logo yet. Headers will show the brand name as text until you pick one here (or on the section).
          </p>
          <MediaField v-model="brandLogo" folder="brand" placeholder="https://…/logo.svg" />
          <p v-if="logoSaved" class="mt-2 type-body-12 text-positive">Brand logo saved.</p>
          <p v-if="logoError" class="mt-2 type-body-12 text-danger" role="alert">{{ logoError }}</p>
        </UiCard>

        <UiCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-1">
              <button
                v-for="entry in TABS"
                :key="entry.key"
                type="button"
                class="rounded-lg px-3 py-1.5 type-small-body transition-colors duration-150"
                :class="tab === entry.key ? 'bg-brand-soft text-brand' : 'text-soft hover:bg-sunken hover:text-ink'"
                :aria-pressed="tab === entry.key"
                @click="tab = entry.key"
              >
                {{ entry.label }}
              </button>
            </div>
            <div class="flex overflow-hidden rounded-lg border border-line">
              <button
                v-for="half in (['light', 'dark'] as const)"
                :key="half"
                type="button"
                class="px-3 py-1.5 type-small-body capitalize transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                :class="editing === half ? 'bg-brand text-brand-ink' : 'bg-raised text-soft hover:bg-sunken'"
                :disabled="half === 'dark' && !hasDark"
                @click="editing = half"
              >
                {{ half }}
              </button>
            </div>
          </div>

          <!-- Colors -->
          <div v-show="tab === 'colors'" class="flex flex-col gap-6">
            <div>
              <h3 class="mb-3 type-caption uppercase tracking-[0.08em] text-faint">From another website</h3>
              <p class="mb-3 type-body-12 text-soft">
                Paste a public URL. We crawl brand colours (and fonts when declared) the same way onboarding does.
              </p>
              <form class="flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="importFromWebsite">
                <label class="min-w-0 flex-1">
                  <span class="sr-only">Website URL</span>
                  <UiInput
                    v-model="importUrl"
                    type="url"
                    placeholder="https://example.com"
                    aria-label="Website URL to import style from"
                  />
                </label>
                <UiButton variant="primary" type="submit" :loading="importing" :disabled="!importUrl.trim()">
                  Generate from URL
                </UiButton>
              </form>
              <p v-if="importNote" class="mt-2 type-body-12 text-positive">{{ importNote }}</p>
              <p v-if="importError" class="mt-2 type-body-12 text-danger" role="alert">{{ importError }}</p>
              <div v-if="importedColors.length" class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="color in importedColors.slice(0, 8)"
                  :key="color"
                  class="h-7 w-7 rounded-md border border-line shadow-sm"
                  :style="{ background: color }"
                  :title="color"
                />
              </div>
            </div>
            <div>
              <p class="mb-3 type-body-12 text-soft">
                Presets and a seed palette. Fine-grained tokens live on the
                <NuxtLink to="/website/theme" class="text-brand underline-offset-2 hover:underline">Theme</NuxtLink>
                page.
                <span v-if="presetLabel" class="text-ink"> Currently: <strong>{{ presetLabel }}</strong>.</span>
              </p>
              <ThemePresetGrid :selected="theme.presetId" :mode="editing" @select="applyPreset" />
            </div>
            <div>
              <h3 class="mb-3 type-caption uppercase tracking-[0.08em] text-faint">From a seed</h3>
              <PalettePicker
                :seed="theme.palette?.seed ?? theme.colorPrimary"
                :palette="theme.palette"
                @apply="applySeed"
              />
            </div>
            <div v-if="editing === 'light' && theme" class="flex flex-col gap-3">
              <h3 class="type-caption uppercase tracking-[0.08em] text-faint">Fills</h3>
              <p class="type-body-12 text-soft">
                Stacked solid or gradient fills — same controls as Theme, live on the canvas.
              </p>
              <ColorFillField
                :hex="theme.colorPrimary"
                :gradient="theme.gradientPrimary"
                label="Primary"
                @update:hex="setThemeFill('colorPrimary', $event)"
                @update:gradient="setThemeFill('gradientPrimary', $event)"
              />
              <ColorFillField
                :hex="theme.colorSurface"
                :gradient="theme.gradientSurface"
                label="Background"
                @update:hex="setThemeFill('colorSurface', $event)"
                @update:gradient="setThemeFill('gradientSurface', $event)"
              />
              <ColorFillField
                :hex="theme.colorSurfaceAlt"
                :gradient="theme.gradientSurfaceAlt"
                label="Surface"
                @update:hex="setThemeFill('colorSurfaceAlt', $event)"
                @update:gradient="setThemeFill('gradientSurfaceAlt', $event)"
              />
            </div>
            <div v-if="shown">
              <h3 class="mb-3 type-caption uppercase tracking-[0.08em] text-faint">Swatches</h3>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                <label
                  v-for="swatch in COLOR_SWATCHES"
                  :key="swatch.key"
                  class="flex cursor-pointer flex-col gap-2 rounded-lg border border-line p-2.5 transition-colors hover:border-line-strong"
                >
                  <span
                    class="h-10 w-full rounded-md border border-line"
                    :style="{ background: shown[swatch.key] }"
                  />
                  <span class="type-caption text-ink">{{ swatch.label }}</span>
                  <input
                    type="color"
                    class="sr-only"
                    :value="shown[swatch.key]"
                    @input="setToken(swatch.key, ($event.target as HTMLInputElement).value)"
                  />
                  <span class="font-mono type-small text-faint">{{ shown[swatch.key] }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Typography -->
          <div v-show="tab === 'typography'" class="flex flex-col gap-6" :style="siteTypeStyle">
            <div class="grid gap-4 sm:grid-cols-2">
              <UiField v-slot="{ id }" label="Heading font">
                <UiSelect
                  :id="id"
                  :model-value="theme.fontHeading"
                  :options="fontSelectOptions"
                  @update:model-value="setFont('fontHeading', $event)"
                />
              </UiField>
              <UiField v-slot="{ id }" label="Body font">
                <UiSelect
                  :id="id"
                  :model-value="theme.fontBody"
                  :options="fontSelectOptions"
                  @update:model-value="setFont('fontBody', $event)"
                />
              </UiField>
            </div>

            <div
              class="rounded-lg border border-line bg-sunken/40 px-5 py-6"
              :style="{ fontFamily: 'var(--sg-body)' }"
            >
              <p class="type-caption uppercase tracking-[0.08em] text-faint">Site fonts</p>
              <p
                class="mt-2 text-[2.5rem] leading-none tracking-tight text-ink"
                :style="{ fontFamily: 'var(--sg-heading)' }"
              >
                {{ theme.fontHeading }}
              </p>
              <p class="mt-3 type-body-16 text-soft" :style="{ fontFamily: 'var(--sg-body)' }">
                {{ theme.fontBody }} — The quick brown fox jumps over the lazy dog. 0123456789
              </p>
            </div>

            <div>
              <h3 class="mb-3 type-caption uppercase tracking-[0.08em] text-faint">Peek scale (app chrome)</h3>
              <ul class="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
                <li
                  v-for="sample in PEEK_SAMPLES"
                  :key="sample.className"
                  class="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span class="w-36 shrink-0 type-body-12 text-faint">{{ sample.label }}</span>
                  <span :class="sample.className" class="min-w-0 text-ink">{{ sample.sample }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Buttons -->
          <div v-show="tab === 'buttons'" class="flex flex-col gap-5">
            <p class="type-body-12 text-soft">
              Platform buttons use brand tokens. Site CTAs inherit primary / accent from the theme preview.
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <UiButton variant="primary">Primary</UiButton>
              <UiButton variant="secondary">Secondary</UiButton>
              <UiButton variant="ghost">Ghost</UiButton>
              <UiButton variant="danger">Danger</UiButton>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <UiButton size="sm" variant="primary">Small</UiButton>
              <UiButton size="md" variant="primary">Medium</UiButton>
              <UiButton size="lg" variant="primary" arrow>Large</UiButton>
            </div>
            <div
              v-if="shown"
              class="flex flex-wrap items-center gap-3 rounded-lg border border-line p-4"
              :style="{ background: shown.surface }"
            >
              <button
                type="button"
                class="type-button rounded-[var(--site-radius,0.5rem)] px-4 py-2 transition-colors duration-150"
                :style="{ background: shown.primary, color: shown.primaryInk }"
              >
                Site primary
              </button>
              <button
                type="button"
                class="type-button rounded-[var(--site-radius,0.5rem)] border px-4 py-2 transition-colors duration-150"
                :style="{ borderColor: shown.lineStrong, color: shown.text, background: shown.surfaceAlt }"
              >
                Site secondary
              </button>
              <button
                type="button"
                class="type-button rounded-[var(--site-radius,0.5rem)] px-4 py-2 transition-colors duration-150"
                :style="{ background: shown.accent, color: shown.accentInk }"
              >
                Site accent
              </button>
            </div>
          </div>

          <!-- Spacing -->
          <div v-show="tab === 'spacing'" class="flex flex-col gap-6">
            <UiField v-slot="{ id }" label="Corner radius">
              <UiSelect :id="id" v-model="site.theme.radius" :options="RADIUS" />
            </UiField>
            <UiField
              v-slot="{ id, describedBy }"
              label="Content width"
              help="Site measure for Wide sections. Motionsites stay full-bleed."
            >
              <UiSelect
                :id="id"
                :described-by="describedBy"
                :model-value="site.theme.contentWidth ?? 'full'"
                :options="CONTENT_WIDTH"
                @update:model-value="setContentWidth"
              />
            </UiField>
            <UiField
              v-if="site.theme.contentWidth === 'custom'"
              v-slot="{ id }"
              label="Custom width (px)"
            >
              <UiInput
                :id="id"
                type="number"
                :model-value="String(site.theme.contentWidthPx ?? 1600)"
                min="320"
                max="2400"
                @update:model-value="setContentWidthPx"
              />
            </UiField>
            <div>
              <h3 class="mb-3 type-caption uppercase tracking-[0.08em] text-faint">Spacing scale</h3>
              <ul class="flex flex-col gap-2">
                <li
                  v-for="step in SPACING_STEPS"
                  :key="step.label"
                  class="flex items-center gap-3"
                >
                  <span class="w-8 type-body-12 tabular-nums text-faint">{{ step.label }}</span>
                  <span
                    class="h-4 rounded-sm bg-brand"
                    :style="{ width: `${step.px}px` }"
                  />
                  <span class="type-small text-faint">{{ step.px }}px</span>
                </li>
              </ul>
            </div>
            <div
              class="grid gap-3 rounded-lg border border-line p-4"
              :style="{ borderRadius: site.theme.radius === 'full' ? '9999px' : undefined }"
            >
              <div
                class="bg-brand-soft p-4 text-brand"
                :class="{
                  'rounded-none': site.theme.radius === 'none',
                  'rounded-sm': site.theme.radius === 'sm',
                  'rounded-md': site.theme.radius === 'md',
                  'rounded-lg': site.theme.radius === 'lg',
                  'rounded-full': site.theme.radius === 'full',
                }"
              >
                <p class="type-small-body">Radius preview — {{ site.theme.radius }}</p>
              </div>
            </div>
          </div>

          <!-- Preview tab content (full-width when selected) -->
          <div v-show="tab === 'preview'">
            <p class="mb-3 type-body-12 text-faint">
              Real block library with the <span class="capitalize">{{ editing }}</span> theme.
            </p>
            <div class="max-h-[40rem] overflow-auto rounded-lg border border-line bg-canvas">
              <EditorCanvas
                :sections="previewSections"
                :theme="site.theme"
                :selected-id="null"
                device="desktop"
                :zoom="35"
                :mode="editing"
                :brand-logo="brandLogo"
              />
            </div>
          </div>
        </UiCard>
      </div>

      <div class="flex flex-col gap-5 xl:sticky xl:top-4">
        <UiCard>
          <h2 class="mb-3 type-body-20-500 text-ink">Live preview</h2>
          <p class="mb-3 type-body-12 text-faint">Canvas updates as you change tokens or fonts.</p>
          <div class="max-h-[32rem] overflow-auto rounded-lg border border-line bg-canvas">
            <EditorCanvas
              :sections="previewSections"
              :theme="site.theme"
              :selected-id="null"
              device="desktop"
              :zoom="28"
              :mode="editing"
              :brand-logo="brandLogo"
            />
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
