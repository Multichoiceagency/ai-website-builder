<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  applyMotionTemplate,
  listMotionTemplates,
  SECTION_STYLE_SCALES,
  type Section,
  type SectionMotion,
  type SectionStyle,
  type SectionStyleBackground,
  type SectionStyleScale,
  type SectionStyleText,
  type SectionVisibility,
} from '@platform/schemas'
import { ChevronRight } from '@lucide/vue'

/**
 * Section properties — the block-CMS equivalent of Framer's right-hand panel.
 *
 * Not Position and Size: in a block document a section is a full-width band in
 * a vertical flow, so X/Y and arbitrary dimensions have no meaning. What *is*
 * per-section here is motion intent, visibility, and optional style overrides
 * (scale + colour tokens) applied as CSS variables on the section wrapper.
 */
const props = defineProps<{ section: Section }>()
const emit = defineEmits<{ update: [patch: Partial<Section>] }>()

const MOTION_OPTIONS = listMotionTemplates().map((entry) => ({
  value: entry.id,
  label: entry.label,
  icon: entry.icon,
}))

const MOTION_LABEL = Object.fromEntries(listMotionTemplates().map((entry) => [entry.id, entry.label]))

const TRIGGER_OPTIONS = [
  { value: 'viewport', label: 'In view', icon: 'trigger-viewport' },
  { value: 'load', label: 'On load', icon: 'trigger-load' },
  { value: 'none', label: 'Never', icon: 'trigger-never' },
]

const BREAKPOINTS = [
  { value: 'mobile' as const, label: 'Mobile', hint: '< 768', icon: 'device-mobile' },
  { value: 'tablet' as const, label: 'Tablet', hint: '768–1023', icon: 'device-tablet' },
  { value: 'desktop' as const, label: 'Desktop', hint: '1024+', icon: 'device-desktop' },
]

const SCALE_OPTIONS = SECTION_STYLE_SCALES.map((value) => ({
  value,
  label: value.toUpperCase(),
  icon: value === 'sm' ? 'intensity-subtle' : value === 'xl' ? 'intensity-pronounced' : 'motion-scale',
}))

const BACKGROUND_SWATCHES: { value: SectionStyleBackground | ''; label: string; swatch: string }[] = [
  { value: '', label: 'Default', swatch: 'transparent' },
  { value: 'transparent', label: 'Clear', swatch: 'transparent' },
  { value: 'surface', label: 'Surface', swatch: 'var(--site-surface-alt, #f5f5f4)' },
  { value: 'primary', label: 'Primary', swatch: 'var(--site-primary, #1d4ed8)' },
  { value: 'accent', label: 'Accent', swatch: 'var(--site-accent, #0f766e)' },
]

const TEXT_SWATCHES: { value: SectionStyleText | ''; label: string; swatch: string }[] = [
  { value: '', label: 'Default', swatch: 'var(--site-text, #18181b)' },
  { value: 'ink', label: 'Ink', swatch: 'var(--site-text, #18181b)' },
  { value: 'muted', label: 'Muted', swatch: 'var(--site-text-muted, #52525b)' },
  { value: 'on-primary', label: 'On primary', swatch: 'var(--site-primary-ink, #ffffff)' },
]

const motion = computed<SectionMotion>(() => ({
  preset: props.section.motion?.preset ?? 'none',
  trigger: props.section.motion?.trigger ?? 'viewport',
  delay: props.section.motion?.delay ?? 0,
  stagger: props.section.motion?.stagger ?? 0.08,
  once: props.section.motion?.once ?? true,
}))

const visibility = computed<SectionVisibility>(() => ({
  mobile: props.section.visibility?.mobile ?? true,
  tablet: props.section.visibility?.tablet ?? true,
  desktop: props.section.visibility?.desktop ?? true,
}))

const style = computed<SectionStyle>(() => props.section.style ?? {})

const styleScale = computed(() => style.value.scale ?? 'md')
const styleBackground = computed(() => style.value.background ?? '')
const styleText = computed(() => style.value.text ?? '')
const styleAccent = computed(() => style.value.accent ?? '')

const customBackground = computed(() =>
  typeof styleBackground.value === 'string' && styleBackground.value.startsWith('#')
    ? styleBackground.value
    : '#ffffff',
)
const customText = computed(() =>
  typeof styleText.value === 'string' && styleText.value.startsWith('#') ? styleText.value : '#18181b',
)
const customAccent = computed(() =>
  typeof styleAccent.value === 'string' && styleAccent.value.startsWith('#') ? styleAccent.value : '#0f766e',
)

/** The multi-select grid speaks in ids; the schema speaks in three booleans. */
const visibleOn = computed(() => BREAKPOINTS.filter((entry) => visibility.value[entry.value]).map((entry) => entry.value))

function setMotion(patch: Partial<SectionMotion>) {
  emit('update', { motion: { ...motion.value, ...patch } })
}

/** One-click recipe: writes the full template intent, keeping tuned delay/once. */
function applyTemplate(preset: SectionMotion['preset']) {
  emit('update', { motion: applyMotionTemplate(motion.value, preset) })
}

function setVisibleOn(value: string | string[]) {
  const next = Array.isArray(value) ? value : [value]
  emit('update', {
    visibility: {
      mobile: next.includes('mobile'),
      tablet: next.includes('tablet'),
      desktop: next.includes('desktop'),
    },
  })
}

function setStyle(patch: Partial<SectionStyle>) {
  const next: SectionStyle = { ...style.value, ...patch }
  if (patch.scale === 'md') delete next.scale
  if (patch.background === undefined && 'background' in patch) delete next.background
  if (patch.text === undefined && 'text' in patch) delete next.text
  // Drop empty object so older documents stay clean.
  const hasKeys = Object.keys(next).some((key) => next[key as keyof SectionStyle] !== undefined)
  emit('update', { style: hasKeys ? next : undefined })
}

function setScale(value: string | string[]) {
  const scale = (Array.isArray(value) ? value[0] : value) as SectionStyleScale
  setStyle({ scale })
}

function setBackgroundToken(value: SectionStyleBackground | '') {
  if (!value) {
    const { background: _drop, ...rest } = style.value
    const hasKeys = Object.keys(rest).length > 0
    emit('update', { style: hasKeys ? rest : undefined })
    return
  }
  setStyle({ background: value })
}

function setTextToken(value: SectionStyleText | '') {
  if (!value) {
    const { text: _drop, ...rest } = style.value
    const hasKeys = Object.keys(rest).length > 0
    emit('update', { style: hasKeys ? rest : undefined })
    return
  }
  setStyle({ text: value })
}

function setBackgroundHex(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
  setStyle({ background: hex })
}

function setTextHex(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
  setStyle({ text: hex })
}

function setAccentHex(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
  setStyle({ accent: hex })
}

function clearAccent() {
  setStyle({ accent: null })
}

const hidesEverywhere = computed(() => visibleOn.value.length === 0)

const openSections = ref({ style: true, animation: true, visibility: true })

function toggleSection(key: keyof typeof openSections.value) {
  openSections.value = { ...openSections.value, [key]: !openSections.value[key] }
}

function isBackgroundSelected(value: SectionStyleBackground | '') {
  if (!value) return !style.value.background
  return styleBackground.value === value
}

function isTextSelected(value: SectionStyleText | '') {
  if (!value) return !style.value.text
  return styleText.value === value
}

/** Force MotionReveal to re-arm by toggling hidden→visible via a tiny delay nudge. */
function replay() {
  if (motion.value.preset === 'none') return
  const delay = motion.value.delay
  setMotion({ delay: delay === 0 ? 0.001 : delay })
  requestAnimationFrame(() => setMotion({ delay }))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Style -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full items-center gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-sunken"
        :aria-expanded="openSections.style"
        @click="toggleSection('style')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.style ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Style</h3>
        <span class="type-button-10 ml-auto text-faint">{{ styleScale }}</span>
      </button>

      <div v-show="openSections.style" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <UiOptionGrid
          label="Scale"
          :options="SCALE_OPTIONS"
          :columns="4"
          :model-value="styleScale"
          @update:model-value="setScale"
        />

        <div>
          <p class="type-caption mb-1.5 text-soft">Background</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="swatch in BACKGROUND_SWATCHES"
              :key="`bg-${swatch.value || 'default'}`"
              type="button"
              class="flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 transition-colors"
              :class="
                isBackgroundSelected(swatch.value)
                  ? 'border-brand ring-1 ring-brand'
                  : 'border-line hover:border-line-strong'
              "
              :title="swatch.label"
              :aria-label="`Background ${swatch.label}`"
              :aria-pressed="isBackgroundSelected(swatch.value)"
              @click="setBackgroundToken(swatch.value)"
            >
              <span
                class="h-4 w-4 rounded-sm border border-line"
                :class="swatch.value === 'transparent' || !swatch.value ? 'bg-[repeating-conic-gradient(#ccc_0_25%,transparent_0_50%)] bg-[length:8px_8px]' : ''"
                :style="swatch.value && swatch.value !== 'transparent' ? { background: swatch.swatch } : undefined"
              />
            </button>
            <label class="flex h-8 items-center gap-1.5 rounded-md border border-line px-1.5">
              <input
                type="color"
                class="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                :value="customBackground"
                aria-label="Custom background colour"
                @input="setBackgroundHex(($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>

        <div>
          <p class="type-caption mb-1.5 text-soft">Text</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="swatch in TEXT_SWATCHES"
              :key="`text-${swatch.value || 'default'}`"
              type="button"
              class="flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 transition-colors"
              :class="
                isTextSelected(swatch.value) ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong'
              "
              :title="swatch.label"
              :aria-label="`Text ${swatch.label}`"
              :aria-pressed="isTextSelected(swatch.value)"
              @click="setTextToken(swatch.value)"
            >
              <span class="h-4 w-4 rounded-sm border border-line" :style="{ background: swatch.swatch }" />
            </button>
            <label class="flex h-8 items-center gap-1.5 rounded-md border border-line px-1.5">
              <input
                type="color"
                class="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                :value="customText"
                aria-label="Custom text colour"
                @input="setTextHex(($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between gap-2">
            <p class="type-caption text-soft">Accent</p>
            <button
              type="button"
              class="type-button-10 text-faint transition-colors hover:text-ink"
              @click="clearAccent"
            >
              Clear
            </button>
          </div>
          <label class="flex h-8 w-fit items-center gap-1.5 rounded-md border border-line px-1.5">
            <input
              type="color"
              class="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              :value="customAccent"
              aria-label="Accent colour"
              @input="setAccentHex(($event.target as HTMLInputElement).value)"
            />
            <span class="type-button-10 font-mono text-faint">{{ styleAccent || 'theme' }}</span>
          </label>
        </div>

        <p class="type-caption-12 leading-relaxed text-faint">
          Colours remap theme tokens on this section only — blocks inherit them automatically.
        </p>
      </div>
    </section>

    <!-- Motion -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full items-center gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-sunken"
        :aria-expanded="openSections.animation"
        @click="toggleSection('animation')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.animation ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Animation</h3>
        <span class="type-button-10 ml-auto text-faint">{{ MOTION_LABEL[motion.preset] ?? motion.preset }}</span>
      </button>

      <div v-show="openSections.animation" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <UiOptionGrid
          label="Effect"
          :options="MOTION_OPTIONS"
          :model-value="motion.preset"
          @update:model-value="applyTemplate($event as SectionMotion['preset'])"
        />

        <template v-if="motion.preset !== 'none'">
          <UiOptionGrid
            label="Starts"
            :options="TRIGGER_OPTIONS"
            :model-value="motion.trigger"
            @update:model-value="setMotion({ trigger: $event as SectionMotion['trigger'] })"
          />

          <div class="grid grid-cols-2 gap-3">
            <UiField v-slot="{ id }" label="Delay (s)">
              <UiInput
                :id="id"
                type="number"
                :model-value="String(motion.delay)"
                @update:model-value="setMotion({ delay: Math.min(2, Math.max(0, Number($event) || 0)) })"
              />
            </UiField>

            <UiField v-if="motion.preset === 'stagger-children'" v-slot="{ id }" label="Stagger (s)">
              <UiInput
                :id="id"
                type="number"
                :model-value="String(motion.stagger)"
                @update:model-value="setMotion({ stagger: Math.min(0.5, Math.max(0, Number($event) || 0)) })"
              />
            </UiField>
          </div>

          <label class="flex items-center justify-between gap-3">
            <span class="type-caption-12 text-soft">Animate only the first time</span>
            <UiSwitch
              :model-value="motion.once"
              label="Animate only the first time"
              @update:model-value="setMotion({ once: $event })"
            />
          </label>

          <button
            type="button"
            class="type-button-10 self-start rounded-md border border-line px-2.5 py-1.5 text-soft transition-colors hover:border-brand hover:text-brand"
            @click="replay"
          >
            Replay on canvas
          </button>
        </template>

        <p class="type-caption-12 leading-relaxed text-faint">
          Stored as intent, not code — visitors who ask for reduced motion see the finished state instead.
        </p>
      </div>
    </section>

    <!-- Visibility -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full items-center gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-sunken"
        :aria-expanded="openSections.visibility"
        @click="toggleSection('visibility')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.visibility ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Visible on</h3>
        <span class="type-button-10 ml-auto text-faint">{{ visibleOn.length }}/3</span>
      </button>

      <div v-show="openSections.visibility" class="border-t border-line px-3 py-3">
        <UiOptionGrid
          label="Visible on"
          hide-label
          multiple
          :options="BREAKPOINTS"
          :model-value="visibleOn"
          @update:model-value="setVisibleOn"
        />

        <p v-if="hidesEverywhere" class="type-caption-12 mt-3 rounded-md bg-warning-soft px-2.5 py-2 text-warning">
          This section is hidden on every screen size, so nobody will see it.
        </p>
      </div>
    </section>
  </div>
</template>
