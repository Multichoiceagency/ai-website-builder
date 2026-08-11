<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  LAYOUT_ALIGN,
  LAYOUT_DISPLAY,
  LAYOUT_FLEX_DIRECTION,
  LAYOUT_FLEX_WRAP,
  LAYOUT_JUSTIFY,
  type LayoutNode,
} from '@platform/schemas'
import { ChevronRight } from '@lucide/vue'

/**
 * Freeform inspector for a single layout-canvas node.
 * Content patches never change `type` / `id`; styles merge via `update-styles`
 * (empty string clears a key).
 */
const props = withDefaults(
  defineProps<{
    node: LayoutNode
    disabled?: boolean
    siteId?: string
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  update: [patch: Partial<LayoutNode>]
  'update-styles': [styles: Record<string, unknown>]
}>()

const api = useApi()
const importBusy = ref(false)
const importError = ref('')
const pasteUrl = ref('')

async function importRemoteUrl() {
  importError.value = ''
  const url = pasteUrl.value.trim() || (props.node.type === 'image' ? (props.node.src ?? '') : '')
  if (!url || !/^https:\/\//i.test(url)) {
    importError.value = 'Paste an https:// image URL first.'
    return
  }
  importBusy.value = true
  try {
    const result = await api.post<{ asset: { id: string; url: string } }>(
      '/api/v1/content/media/from-url',
      { url, alt: props.node.type === 'image' ? props.node.alt : undefined },
    )
    patchContent({ src: result.asset.url })
    pasteUrl.value = ''
  } catch (error) {
    importError.value =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Could not import that URL.'
  } finally {
    importBusy.value = false
  }
}

const TAG_OPTIONS = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'span', label: 'Span' },
]

const DISPLAY_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_DISPLAY.map((value) => ({ value, label: value })),
]

const FLEX_DIRECTION_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_FLEX_DIRECTION.map((value) => ({ value, label: value })),
]

const FLEX_WRAP_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_FLEX_WRAP.map((value) => ({ value, label: value })),
]

const JUSTIFY_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_JUSTIFY.map((value) => ({ value, label: value })),
]

const ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_ALIGN.map((value) => ({ value, label: value })),
]

const TEXT_ALIGN_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
]

const BUTTON_TEXT_ALIGN_OPTIONS = TEXT_ALIGN_OPTIONS.filter((o) => o.value !== 'justify')

const OBJECT_FIT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
  { value: 'scale-down', label: 'Scale down' },
]

const SELECT_CLASS =
  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-1'
const INPUT_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-1'

const openSections = ref({
  content: true,
  frame: true,
  layout: true,
  spacing: true,
  appearance: true,
})

function toggleSection(key: keyof typeof openSections.value) {
  openSections.value = { ...openSections.value, [key]: !openSections.value[key] }
}

const isContainer = computed(() => props.node.type === 'container')
const isText = computed(() => props.node.type === 'text')
const isImage = computed(() => props.node.type === 'image')
const isButton = computed(() => props.node.type === 'button')
const hasTextStyles = computed(() => isText.value || isButton.value)

const styles = computed(() => (props.node.styles ?? {}) as Record<string, unknown>)

function styleStr(key: string): string {
  const value = styles.value[key]
  if (value === undefined || value === null) return ''
  return String(value)
}

const isAbsolute = computed(() => styleStr('position') === 'absolute')
const frameSummary = computed(() => {
  if (!isAbsolute.value) return styleStr('position') || 'flow'
  const x = styleStr('left') || '—'
  const y = styleStr('top') || '—'
  return `${x} · ${y}`
})

function setFrameField(key: 'left' | 'top' | 'width' | 'height', raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    emit('update-styles', { [key]: '', position: 'absolute' })
    return
  }
  const withPx = /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed
  emit('update-styles', { [key]: withPx, position: 'absolute' })
}

const display = computed(() => styleStr('display'))
const showFlexFields = computed(() => display.value === 'flex')
const showGridFields = computed(() => display.value === 'grid')

function patchContent(patch: Partial<LayoutNode>) {
  const { type: _type, id: _id, ...safe } = patch as Partial<LayoutNode> & {
    type?: string
    id?: string
  }
  emit('update', safe)
}

function setStyle(key: string, value: string) {
  emit('update-styles', { [key]: value })
}

function setStyleNumber(key: string, raw: string) {
  if (raw.trim() === '') {
    emit('update-styles', { [key]: '' })
    return
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  emit('update-styles', { [key]: n })
}

const contentSummary = computed(() => {
  switch (props.node.type) {
    case 'text':
      return props.node.tag ?? 'p'
    case 'image':
      return 'image'
    case 'button':
      return 'button'
    default:
      return 'container'
  }
})
</script>

<template>
  <fieldset class="flex flex-col gap-2 border-0 p-0" :disabled="disabled">
    <!-- Content -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset"
        :aria-expanded="openSections.content"
        @click="toggleSection('content')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.content ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Content</h3>
        <span class="type-button-10 ml-auto text-faint">{{ contentSummary }}</span>
      </button>

      <div v-show="openSections.content" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <template v-if="isText">
          <UiField v-slot="{ id }" label="Content">
            <UiTextarea
              :id="id"
              :class="INPUT_CLASS"
              :model-value="node.type === 'text' ? (node.content ?? '') : ''"
              :rows="4"
              @update:model-value="patchContent({ content: $event })"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Tag">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="TAG_OPTIONS"
              :model-value="node.type === 'text' ? (node.tag ?? 'p') : 'p'"
              @update:model-value="patchContent({ tag: $event as 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span' })"
            />
          </UiField>
        </template>

        <template v-else-if="isImage">
          <UiField v-slot="{ id }" label="Source">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="node.type === 'image' ? (node.src ?? '') : ''"
              placeholder="https://…"
              @update:model-value="patchContent({ src: $event })"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Paste URL">
            <div class="flex flex-col gap-2">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled || importBusy"
                :model-value="pasteUrl"
                placeholder="https://cdn.sanity.io/…"
                @update:model-value="pasteUrl = $event"
              />
              <div class="flex flex-wrap gap-2">
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="disabled"
                  @click="patchContent({ src: pasteUrl.trim() || (node.type === 'image' ? (node.src ?? '') : '') })"
                >Use URL</UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :loading="importBusy"
                  :disabled="disabled"
                  @click="importRemoteUrl"
                >Import to library</UiButton>
              </div>
              <p v-if="importError" class="type-caption-12 text-danger">{{ importError }}</p>
            </div>
          </UiField>
          <UiField
            v-slot="{ id, describedBy }"
            label="Alt text"
            required
            help="Describe the image for screen readers. Required for accessibility."
          >
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :described-by="describedBy"
              :model-value="node.type === 'image' ? (node.alt ?? '') : ''"
              @update:model-value="patchContent({ alt: $event })"
            />
          </UiField>
        </template>

        <template v-else-if="isButton">
          <UiField v-slot="{ id }" label="Label">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="node.type === 'button' ? (node.label ?? '') : ''"
              @update:model-value="patchContent({ label: $event })"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Link (href)">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="node.type === 'button' ? (node.href ?? '') : ''"
              placeholder="/page or https://…"
              @update:model-value="patchContent({ href: $event })"
            />
          </UiField>
        </template>

        <p
          v-else
          class="rounded-lg border border-line bg-sunken/50 px-3 py-2 type-caption-12 leading-relaxed text-soft"
        >
          Container — add children in Structure
        </p>
      </div>
    </section>

    <!-- Frame (Design absolute placement) -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset"
        :aria-expanded="openSections.frame"
        @click="toggleSection('frame')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.frame ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Frame</h3>
        <span class="type-button-10 ml-auto text-faint">{{ frameSummary }}</span>
      </button>
      <div v-show="openSections.frame" class="flex flex-col gap-3 border-t border-line px-3 py-3">
        <UiField v-slot="{ id }" label="Position">
          <UiSelect
            :id="id"
            :class="SELECT_CLASS"
            :options="[
              { value: '', label: 'Default (flow)' },
              { value: 'relative', label: 'Relative' },
              { value: 'absolute', label: 'Absolute' },
            ]"
            :model-value="styleStr('position')"
            @update:model-value="setStyle('position', $event)"
          />
        </UiField>
        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="X">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('left')"
              placeholder="0px"
              @update:model-value="setFrameField('left', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Y">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('top')"
              placeholder="0px"
              @update:model-value="setFrameField('top', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="W">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('width')"
              placeholder="auto"
              @update:model-value="setFrameField('width', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="H">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('height')"
              placeholder="auto"
              @update:model-value="setFrameField('height', $event)"
            />
          </UiField>
        </div>
        <UiField v-slot="{ id }" label="Z-index">
          <UiInput
            :id="id"
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('zIndex')"
            placeholder="0"
            @update:model-value="setStyleNumber('zIndex', $event)"
          />
        </UiField>
      </div>
    </section>

    <!-- Layout (container only) -->
    <section v-if="isContainer" class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset"
        :aria-expanded="openSections.layout"
        @click="toggleSection('layout')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.layout ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Layout</h3>
        <span class="type-button-10 ml-auto text-faint">{{ display || 'block' }}</span>
      </button>

      <div v-show="openSections.layout" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <UiField v-slot="{ id }" label="Display">
          <UiSelect
            :id="id"
            :class="SELECT_CLASS"
            :options="DISPLAY_OPTIONS"
            :model-value="display"
            @update:model-value="setStyle('display', $event)"
          />
        </UiField>

        <template v-if="showFlexFields">
          <UiField v-slot="{ id }" label="Flex direction">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="FLEX_DIRECTION_OPTIONS"
              :model-value="styleStr('flexDirection')"
              @update:model-value="setStyle('flexDirection', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Flex wrap">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="FLEX_WRAP_OPTIONS"
              :model-value="styleStr('flexWrap')"
              @update:model-value="setStyle('flexWrap', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Justify content">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="JUSTIFY_OPTIONS"
              :model-value="styleStr('justifyContent')"
              @update:model-value="setStyle('justifyContent', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Align items">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="ALIGN_OPTIONS"
              :model-value="styleStr('alignItems')"
              @update:model-value="setStyle('alignItems', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Gap">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('gap')"
              placeholder="1rem"
              @update:model-value="setStyle('gap', $event)"
            />
          </UiField>
        </template>

        <template v-if="showGridFields">
          <UiField v-slot="{ id }" label="Gap">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('gap')"
              placeholder="1rem"
              @update:model-value="setStyle('gap', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Grid template columns">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('gridTemplateColumns')"
              placeholder="1fr 1fr"
              @update:model-value="setStyle('gridTemplateColumns', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Grid template rows">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('gridTemplateRows')"
              placeholder="auto"
              @update:model-value="setStyle('gridTemplateRows', $event)"
            />
          </UiField>
        </template>
      </div>
    </section>

    <!-- Spacing / Size -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset"
        :aria-expanded="openSections.spacing"
        @click="toggleSection('spacing')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.spacing ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Spacing / Size</h3>
      </button>

      <div v-show="openSections.spacing" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Width">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('width')"
              placeholder="auto"
              @update:model-value="setStyle('width', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Height">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('height')"
              placeholder="auto"
              @update:model-value="setStyle('height', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Min width">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('minWidth')"
              @update:model-value="setStyle('minWidth', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Min height">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('minHeight')"
              @update:model-value="setStyle('minHeight', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Max width">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('maxWidth')"
              @update:model-value="setStyle('maxWidth', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Max height">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('maxHeight')"
              @update:model-value="setStyle('maxHeight', $event)"
            />
          </UiField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Padding">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('padding')"
              placeholder="1rem"
              @update:model-value="setStyle('padding', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Margin">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('margin')"
              placeholder="0"
              @update:model-value="setStyle('margin', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Flex grow">
            <UiInput
              :id="id"
              type="number"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('flexGrow')"
              @update:model-value="setStyleNumber('flexGrow', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Flex shrink">
            <UiInput
              :id="id"
              type="number"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('flexShrink')"
              @update:model-value="setStyleNumber('flexShrink', $event)"
            />
          </UiField>
        </div>

        <UiField v-slot="{ id }" label="Align self">
          <UiSelect
            :id="id"
            :class="SELECT_CLASS"
            :options="ALIGN_OPTIONS"
            :model-value="styleStr('alignSelf')"
            @update:model-value="setStyle('alignSelf', $event)"
          />
        </UiField>
      </div>
    </section>

    <!-- Appearance -->
    <section class="rounded-lg border border-line">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset"
        :aria-expanded="openSections.appearance"
        @click="toggleSection('appearance')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.appearance ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Appearance</h3>
      </button>

      <div v-show="openSections.appearance" class="flex flex-col gap-4 border-t border-line px-3 py-3">
        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Background">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('background')"
              placeholder="#fff or token"
              @update:model-value="setStyle('background', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Border radius">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderRadius')"
              placeholder="0.5rem"
              @update:model-value="setStyle('borderRadius', $event)"
            />
          </UiField>
        </div>

        <UiField v-slot="{ id }" label="Opacity">
          <UiInput
            :id="id"
            type="number"
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('opacity')"
            placeholder="0–1"
            @update:model-value="setStyleNumber('opacity', $event)"
          />
        </UiField>

        <template v-if="hasTextStyles">
          <div class="grid grid-cols-2 gap-3">
            <UiField v-slot="{ id }" label="Color">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('color')"
                placeholder="#18181b"
                @update:model-value="setStyle('color', $event)"
              />
            </UiField>
            <UiField v-slot="{ id }" label="Font size">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('fontSize')"
                placeholder="1rem"
                @update:model-value="setStyle('fontSize', $event)"
              />
            </UiField>
            <UiField v-slot="{ id }" label="Font weight">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('fontWeight')"
                placeholder="400"
                @update:model-value="setStyle('fontWeight', $event)"
              />
            </UiField>
            <UiField v-slot="{ id }" label="Line height">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('lineHeight')"
                placeholder="1.5"
                @update:model-value="setStyle('lineHeight', $event)"
              />
            </UiField>
          </div>
          <UiField v-slot="{ id }" label="Text align">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="isButton ? BUTTON_TEXT_ALIGN_OPTIONS : TEXT_ALIGN_OPTIONS"
              :model-value="styleStr('textAlign')"
              @update:model-value="setStyle('textAlign', $event)"
            />
          </UiField>
        </template>

        <UiField v-if="isImage" v-slot="{ id }" label="Object fit">
          <UiSelect
            :id="id"
            :class="SELECT_CLASS"
            :options="OBJECT_FIT_OPTIONS"
            :model-value="styleStr('objectFit')"
            @update:model-value="setStyle('objectFit', $event)"
          />
        </UiField>
      </div>
    </section>
  </fieldset>
</template>
