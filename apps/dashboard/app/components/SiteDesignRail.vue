<script setup lang="ts">
import { computed, watch } from 'vue'
import {
  CONTENT_WIDTH_PRESETS,
  type ContentWidthPreset,
  type Theme,
  type ThemeTokens,
} from '@platform/schemas'
import { resolveLightTokens, writeLightTokens } from '@platform/theming'

/**
 * Compact design-system controls for the editor Style rail.
 *
 * Colours, type, radius, and site content width — the same tokens the canvas
 * and style guide share. Full editing lives on Style guide; this keeps the
 * live system reachable while laying out a page.
 *
 * Motionsites stay full-bleed: `--site-content-width` is a measure sections
 * opt into (`maxWidth: wide` / px presets), never a forced page shell.
 */
const props = withDefaults(
  defineProps<{
    theme: Theme
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:theme': [theme: Theme]
}>()

const { fontSelectOptions: curatedFontOptions, ensureLoaded } = useGoogleFonts()

const fontSelectOptions = computed(() => {
  const base = [...curatedFontOptions]
  const seen = new Set(base.map((entry) => entry.value.toLowerCase()))
  for (const family of [props.theme.fontHeading, props.theme.fontBody]) {
    if (!family || seen.has(family.toLowerCase())) continue
    seen.add(family.toLowerCase())
    base.unshift({ label: `${family} (current)`, value: family })
  }
  return base
})

watch(
  () => [props.theme.fontHeading, props.theme.fontBody] as const,
  ([heading, body]) => {
    if (heading) ensureLoaded(heading)
    if (body) ensureLoaded(body)
  },
  { immediate: true },
)

const light = computed(() => resolveLightTokens(props.theme))

const CONTENT_WIDTH_OPTIONS = CONTENT_WIDTH_PRESETS.map((value) => ({
  value,
  label: value === 'full' ? 'Full' : value === 'custom' ? 'Custom' : `${value}`,
  icon: value === 'full' ? 'align-center' : 'align-left',
}))

const RADIUS_OPTIONS = [
  { label: 'Square', value: 'none' },
  { label: 'Slight', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Round', value: 'lg' },
  { label: 'Pill', value: 'full' },
]

const COLOR_SWATCHES: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'surface', label: 'Surface' },
  { key: 'surfaceAlt', label: 'Alt' },
  { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Muted' },
]

const contentWidth = computed<ContentWidthPreset>(() => props.theme.contentWidth ?? 'full')
const contentWidthPx = computed(() => props.theme.contentWidthPx ?? 1600)

function patch(next: Partial<Theme>) {
  if (props.disabled) return
  emit('update:theme', { ...props.theme, ...next, presetId: null })
}

function setContentWidth(value: string | string[]) {
  const preset = (Array.isArray(value) ? value[0] : value) as ContentWidthPreset
  if (!CONTENT_WIDTH_PRESETS.includes(preset)) return
  if (preset === 'custom') {
    patch({
      contentWidth: 'custom',
      contentWidthPx: props.theme.contentWidthPx ?? 1600,
    })
    return
  }
  patch({ contentWidth: preset, contentWidthPx: null })
}

function setCustomPx(raw: string) {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return
  patch({
    contentWidth: 'custom',
    contentWidthPx: Math.min(2400, Math.max(320, n)),
  })
}

function setFont(slot: 'fontHeading' | 'fontBody', family: string) {
  ensureLoaded(family)
  patch({ [slot]: family })
}

function setToken(key: keyof ThemeTokens, value: string) {
  if (props.disabled) return
  const tokens = resolveLightTokens(props.theme)
  emit('update:theme', {
    ...writeLightTokens(props.theme, { ...tokens, [key]: value }),
    presetId: null,
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-2 border-b border-line pb-3">
      <div>
        <h2 class="type-button text-ink">Design system</h2>
        <p class="type-caption-12 mt-1 text-soft">
          Live site theme — colours, type, radius, and page width.
        </p>
      </div>
      <NuxtLink
        to="/website/style-guide"
        class="type-button-10 shrink-0 rounded-md border border-line px-2 py-1 text-soft no-underline transition-colors hover:border-brand hover:text-brand"
      >
        Style guide
      </NuxtLink>
    </div>

    <div class="flex flex-col gap-2">
      <UiOptionGrid
        label="Content width"
        help="Site-wide measure. Motionsites stay full-bleed."
        :options="CONTENT_WIDTH_OPTIONS"
        :columns="3"
        :model-value="contentWidth"
        @update:model-value="setContentWidth"
      />
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

    <div class="flex flex-col gap-3">
      <p class="type-caption uppercase tracking-[0.08em] text-faint">Colors</p>
      <div class="grid grid-cols-3 gap-2">
        <label
          v-for="swatch in COLOR_SWATCHES"
          :key="swatch.key"
          class="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-line p-2 transition-colors hover:border-line-strong"
          :class="disabled ? 'pointer-events-none opacity-50' : ''"
        >
          <span
            class="h-8 w-full rounded-md border border-line"
            :style="{ background: light[swatch.key] }"
          />
          <span class="type-caption-12 text-ink">{{ swatch.label }}</span>
          <input
            type="color"
            class="sr-only"
            :value="light[swatch.key]"
            :disabled="disabled"
            @input="setToken(swatch.key, ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <p class="type-caption uppercase tracking-[0.08em] text-faint">Typography</p>
      <UiField v-slot="{ id }" label="Heading">
        <UiSelect
          :id="id"
          :model-value="theme.fontHeading"
          :options="fontSelectOptions"
          @update:model-value="setFont('fontHeading', $event)"
        />
      </UiField>
      <UiField v-slot="{ id }" label="Body">
        <UiSelect
          :id="id"
          :model-value="theme.fontBody"
          :options="fontSelectOptions"
          @update:model-value="setFont('fontBody', $event)"
        />
      </UiField>
    </div>

    <UiField v-slot="{ id }" label="Corner radius">
      <UiSelect
        :id="id"
        :model-value="theme.radius"
        :options="RADIUS_OPTIONS"
        @update:model-value="patch({ radius: $event as Theme['radius'] })"
      />
    </UiField>
  </div>
</template>
