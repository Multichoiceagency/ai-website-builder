<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LAYOUT_ALIGN,
  LAYOUT_BORDER_STYLE,
  LAYOUT_CURSOR,
  LAYOUT_DISPLAY,
  LAYOUT_FLEX_DIRECTION,
  LAYOUT_FLEX_WRAP,
  LAYOUT_JUSTIFY,
  LAYOUT_OVERFLOW,
  LAYOUT_TEXT_TRANSFORM,
  type LayoutCustomScript,
  type LayoutNode,
} from '@platform/schemas'
import { ChevronRight, Sparkles } from '@lucide/vue'

/**
 * Freeform inspector — Figma / Frappe Style · Typography · Spacing · Position · Hover.
 * Content patches never change `type` / `id`; styles merge via `update-styles`
 * (empty string clears a key). Hover map via `update-hover-styles`.
 */
const props = withDefaults(
  defineProps<{
    node: LayoutNode
    disabled?: boolean
    siteId?: string
    /** Show Edit-with-AI control (Design / Freeform). */
    showAiEdit?: boolean
    /** Design = denser Figma/Frappe chrome; classic = bordered cards. */
    variant?: 'classic' | 'design'
    customScripts?: LayoutCustomScript[]
  }>(),
  { disabled: false, showAiEdit: false, variant: 'classic', customScripts: () => [] },
)

const emit = defineEmits<{
  update: [patch: Partial<LayoutNode>]
  'update-styles': [styles: Record<string, unknown>]
  'update-hover-styles': [styles: Record<string, unknown>]
  'edit-with-ai': []
  'update-scripts': [scripts: LayoutCustomScript[]]
}>()

const isDesign = computed(() => props.variant === 'design')
const sectionShell = computed(() =>
  isDesign.value ? 'border-b border-line' : 'rounded-lg border border-line',
)
const sectionHead = computed(() =>
  isDesign.value
    ? 'flex w-full cursor-pointer items-center gap-1.5 px-2 py-2 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset'
    : 'flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-inset',
)
const sectionBody = computed(() =>
  isDesign.value
    ? 'flex flex-col gap-3 border-t border-line px-2 py-2.5'
    : 'flex flex-col gap-4 border-t border-line px-3 py-3',
)

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

const OVERFLOW_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_OVERFLOW.map((value) => ({ value, label: value })),
]

const BORDER_STYLE_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_BORDER_STYLE.map((value) => ({ value, label: value })),
]

const CURSOR_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_CURSOR.map((value) => ({ value, label: value })),
]

const TEXT_TRANSFORM_OPTIONS = [
  { value: '', label: 'Default' },
  ...LAYOUT_TEXT_TRANSFORM.map((value) => ({ value, label: value })),
]

const SELECT_CLASS =
  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-1'
const INPUT_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-1'

const openSections = ref({
  content: true,
  layout: false,
  spacing: true,
  typography: true,
  style: true,
  dimension: false,
  position: true,
  hover: false,
})

watch(
  () => props.variant,
  (variant) => {
    if (variant === 'design') {
      openSections.value = {
        content: false,
        layout: false,
        spacing: true,
        typography: true,
        style: true,
        dimension: true,
        position: true,
        hover: false,
      }
    }
  },
  { immediate: true },
)

function toggleSection(key: keyof typeof openSections.value) {
  openSections.value = { ...openSections.value, [key]: !openSections.value[key] }
}

const isContainer = computed(() => props.node.type === 'container')
const isText = computed(() => props.node.type === 'text')
const isImage = computed(() => props.node.type === 'image')
const isButton = computed(() => props.node.type === 'button')
const hasTextStyles = computed(() => isText.value || isButton.value)

const styles = computed(() => (props.node.styles ?? {}) as Record<string, unknown>)
const hoverStyles = computed(
  () => ((props.node as { stylesHover?: Record<string, unknown> }).stylesHover ?? {}) as Record<
    string,
    unknown
  >,
)

function styleStr(key: string): string {
  const value = styles.value[key]
  if (value === undefined || value === null) return ''
  return String(value)
}

function hoverStr(key: string): string {
  const value = hoverStyles.value[key]
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

function setFrameField(
  key: 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height',
  raw: string,
) {
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

function setHover(key: string, value: string) {
  emit('update-hover-styles', { [key]: value })
}

function setHoverNumber(key: string, raw: string) {
  if (raw.trim() === '') {
    emit('update-hover-styles', { [key]: '' })
    return
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  emit('update-hover-styles', { [key]: n })
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
      return isDesign.value ? 'Frame' : 'container'
  }
})

const nodeTypeLabel = computed(() => {
  switch (props.node.type) {
    case 'text':
      return 'Text'
    case 'image':
      return 'Image'
    case 'button':
      return 'Button'
    default:
      return 'Frame'
  }
})
</script>

<template>
  <fieldset class="flex flex-col gap-0 border-0 p-0" :class="isDesign ? 'gap-0' : 'gap-2'" :disabled="disabled">
    <div
      v-if="isDesign"
      class="sticky top-0 z-10 mb-1 border-b border-line bg-paper px-2 pb-2 pt-1"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="type-button text-ink">{{ nodeTypeLabel }}</p>
        <UiButton
          v-if="showAiEdit"
          size="sm"
          variant="ghost"
          class="shrink-0 gap-1"
          :disabled="disabled"
          @click="emit('edit-with-ai')"
        >
          <Sparkles class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
          AI
        </UiButton>
      </div>
      <div class="mt-2 grid grid-cols-4 gap-1.5">
        <label class="flex flex-col gap-0.5">
          <span class="type-button-10 text-faint">X</span>
          <UiInput
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('left')"
            placeholder="0"
            @update:model-value="setFrameField('left', $event)"
          />
        </label>
        <label class="flex flex-col gap-0.5">
          <span class="type-button-10 text-faint">Y</span>
          <UiInput
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('top')"
            placeholder="0"
            @update:model-value="setFrameField('top', $event)"
          />
        </label>
        <label class="flex flex-col gap-0.5">
          <span class="type-button-10 text-faint">W</span>
          <UiInput
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('width')"
            placeholder="auto"
            @update:model-value="setFrameField('width', $event)"
          />
        </label>
        <label class="flex flex-col gap-0.5">
          <span class="type-button-10 text-faint">H</span>
          <UiInput
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('height')"
            placeholder="auto"
            @update:model-value="setFrameField('height', $event)"
          />
        </label>
      </div>
    </div>

    <UiButton
      v-if="showAiEdit && !isDesign"
      size="sm"
      variant="ghost"
      class="w-full justify-start gap-1.5"
      :disabled="disabled"
      @click="emit('edit-with-ai')"
    >
      <Sparkles class="h-3.5 w-3.5" :stroke-width="2" aria-hidden="true" />
      Edit with AI
    </UiButton>

    <!-- Content -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
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

      <div v-show="openSections.content" :class="sectionBody">
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
          <UiField v-slot="{ id }" label="Object fit">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="OBJECT_FIT_OPTIONS"
              :model-value="styleStr('objectFit')"
              @update:model-value="setStyle('objectFit', $event)"
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

        <LayoutNodeDataBind
          v-if="isText || isImage || isButton"
          class="border-t border-line pt-3"
          :bind="'bind' in node ? node.bind : undefined"
          :disabled="disabled"
          @update="patchContent({ bind: $event } as Partial<LayoutNode>)"
        />

        <LayoutCanvasScripts
          v-if="isContainer && node.id === 'root'"
          class="border-t border-line pt-3"
          :scripts="customScripts"
          :disabled="disabled"
          @update="emit('update-scripts', $event)"
        />

        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Visibility">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="[
                { value: '', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
              ]"
              :model-value="styleStr('visibility') === 'hidden' ? 'hidden' : ''"
              @update:model-value="setStyle('visibility', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Locked">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="[
                { value: '', label: 'Editable' },
                { value: 'true', label: 'Locked' },
              ]"
              :model-value="styles.locked === true ? 'true' : ''"
              @update:model-value="emit('update-styles', { locked: $event === 'true' ? true : '' })"
            />
          </UiField>
        </div>
      </div>
    </section>

    <!-- Layout -->
    <section v-if="isContainer" :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
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

      <div v-show="openSections.layout" :class="sectionBody">
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
          <div class="grid grid-cols-2 gap-3">
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
            <UiField v-slot="{ id }" label="Row gap">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('rowGap')"
                @update:model-value="setStyle('rowGap', $event)"
              />
            </UiField>
            <UiField v-slot="{ id }" label="Column gap">
              <UiInput
                :id="id"
                :class="INPUT_CLASS"
                :disabled="disabled"
                :model-value="styleStr('columnGap')"
                @update:model-value="setStyle('columnGap', $event)"
              />
            </UiField>
          </div>
        </template>

        <template v-if="showGridFields">
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
          <div class="grid grid-cols-2 gap-3">
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
            <UiField v-slot="{ id }" label="Row / Col gap">
              <div class="grid grid-cols-2 gap-2">
                <UiInput
                  :class="INPUT_CLASS"
                  :disabled="disabled"
                  :model-value="styleStr('rowGap')"
                  placeholder="row"
                  @update:model-value="setStyle('rowGap', $event)"
                />
                <UiInput
                  :class="INPUT_CLASS"
                  :disabled="disabled"
                  :model-value="styleStr('columnGap')"
                  placeholder="col"
                  @update:model-value="setStyle('columnGap', $event)"
                />
              </div>
            </UiField>
          </div>
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

        <UiField v-slot="{ id }" label="Align self">
          <UiSelect
            :id="id"
            :class="SELECT_CLASS"
            :options="ALIGN_OPTIONS"
            :model-value="styleStr('alignSelf')"
            @update:model-value="setStyle('alignSelf', $event)"
          />
        </UiField>
        <div class="grid grid-cols-2 gap-3">
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
      </div>
    </section>

    <!-- Spacing -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
        :aria-expanded="openSections.spacing"
        @click="toggleSection('spacing')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.spacing ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Spacing</h3>
      </button>

      <div v-show="openSections.spacing" :class="sectionBody">
        <UiField v-slot="{ id }" label="Padding (shorthand)">
          <UiInput
            :id="id"
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('padding')"
            placeholder="1rem"
            @update:model-value="setStyle('padding', $event)"
          />
        </UiField>
        <div>
          <p class="type-button-10 mb-1.5 text-faint">Padding T / R / B / L</p>
          <div class="grid grid-cols-4 gap-2">
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('paddingTop')"
              placeholder="T"
              aria-label="Padding top"
              @update:model-value="setStyle('paddingTop', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('paddingRight')"
              placeholder="R"
              aria-label="Padding right"
              @update:model-value="setStyle('paddingRight', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('paddingBottom')"
              placeholder="B"
              aria-label="Padding bottom"
              @update:model-value="setStyle('paddingBottom', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('paddingLeft')"
              placeholder="L"
              aria-label="Padding left"
              @update:model-value="setStyle('paddingLeft', $event)"
            />
          </div>
        </div>
        <UiField v-slot="{ id }" label="Margin (shorthand)">
          <UiInput
            :id="id"
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('margin')"
            placeholder="0"
            @update:model-value="setStyle('margin', $event)"
          />
        </UiField>
        <div>
          <p class="type-button-10 mb-1.5 text-faint">Margin T / R / B / L</p>
          <div class="grid grid-cols-4 gap-2">
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('marginTop')"
              placeholder="T"
              aria-label="Margin top"
              @update:model-value="setStyle('marginTop', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('marginRight')"
              placeholder="R"
              aria-label="Margin right"
              @update:model-value="setStyle('marginRight', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('marginBottom')"
              placeholder="B"
              aria-label="Margin bottom"
              @update:model-value="setStyle('marginBottom', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('marginLeft')"
              placeholder="L"
              aria-label="Margin left"
              @update:model-value="setStyle('marginLeft', $event)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Typography -->
    <section v-if="hasTextStyles" :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
        :aria-expanded="openSections.typography"
        @click="toggleSection('typography')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.typography ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Typography</h3>
      </button>

      <div v-show="openSections.typography" :class="sectionBody">
        <UiField v-slot="{ id }" label="Font family">
          <UiInput
            :id="id"
            :class="INPUT_CLASS"
            :disabled="disabled"
            :model-value="styleStr('fontFamily')"
            placeholder="Inter, system-ui…"
            @update:model-value="setStyle('fontFamily', $event)"
          />
        </UiField>
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
          <UiField v-slot="{ id }" label="Letter spacing">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('letterSpacing')"
              placeholder="0.02em"
              @update:model-value="setStyle('letterSpacing', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Text transform">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="TEXT_TRANSFORM_OPTIONS"
              :model-value="styleStr('textTransform')"
              @update:model-value="setStyle('textTransform', $event)"
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
      </div>
    </section>

    <!-- Style -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
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
      </button>

      <div v-show="openSections.style" :class="sectionBody">
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
        </div>

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
        <div>
          <p class="type-button-10 mb-1.5 text-faint">Radius TL / TR / BR / BL</p>
          <div class="grid grid-cols-4 gap-2">
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderTopLeftRadius')"
              placeholder="TL"
              aria-label="Top left radius"
              @update:model-value="setStyle('borderTopLeftRadius', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderTopRightRadius')"
              placeholder="TR"
              aria-label="Top right radius"
              @update:model-value="setStyle('borderTopRightRadius', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderBottomRightRadius')"
              placeholder="BR"
              aria-label="Bottom right radius"
              @update:model-value="setStyle('borderBottomRightRadius', $event)"
            />
            <UiInput
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderBottomLeftRadius')"
              placeholder="BL"
              aria-label="Bottom left radius"
              @update:model-value="setStyle('borderBottomLeftRadius', $event)"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Border width">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderWidth')"
              placeholder="1px"
              @update:model-value="setStyle('borderWidth', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Border style">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="BORDER_STYLE_OPTIONS"
              :model-value="styleStr('borderStyle')"
              @update:model-value="setStyle('borderStyle', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Border color">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('borderColor')"
              placeholder="#e4e4e7"
              @update:model-value="setStyle('borderColor', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Box shadow">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('boxShadow')"
              placeholder="0 4px 12px rgba(0,0,0,.12)"
              @update:model-value="setStyle('boxShadow', $event)"
            />
          </UiField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Overflow">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="OVERFLOW_OPTIONS"
              :model-value="styleStr('overflow')"
              @update:model-value="setStyle('overflow', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Cursor">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="CURSOR_OPTIONS"
              :model-value="styleStr('cursor')"
              @update:model-value="setStyle('cursor', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Overflow X">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="OVERFLOW_OPTIONS"
              :model-value="styleStr('overflowX')"
              @update:model-value="setStyle('overflowX', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Overflow Y">
            <UiSelect
              :id="id"
              :class="SELECT_CLASS"
              :options="OVERFLOW_OPTIONS"
              :model-value="styleStr('overflowY')"
              @update:model-value="setStyle('overflowY', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Rotate">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('rotate')"
              placeholder="12deg"
              @update:model-value="setStyle('rotate', $event)"
            />
          </UiField>
        </div>
      </div>
    </section>

    <!-- Dimension -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
        :aria-expanded="openSections.dimension"
        @click="toggleSection('dimension')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.dimension ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Dimension</h3>
      </button>

      <div v-show="openSections.dimension" :class="sectionBody">
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
      </div>
    </section>

    <!-- Position / Frame -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
        :aria-expanded="openSections.position"
        @click="toggleSection('position')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.position ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Position</h3>
        <span class="type-button-10 ml-auto text-faint">{{ frameSummary }}</span>
      </button>
      <div v-show="openSections.position" :class="sectionBody">
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
          <UiField v-slot="{ id }" label="X (left)">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('left')"
              placeholder="0px"
              @update:model-value="setFrameField('left', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Y (top)">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('top')"
              placeholder="0px"
              @update:model-value="setFrameField('top', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Right">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('right')"
              placeholder="auto"
              @update:model-value="setFrameField('right', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Bottom">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="styleStr('bottom')"
              placeholder="auto"
              @update:model-value="setFrameField('bottom', $event)"
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

    <!-- Hover -->
    <section :class="sectionShell">
      <button
        type="button"
        :class="sectionHead"
        :aria-expanded="openSections.hover"
        @click="toggleSection('hover')"
      >
        <ChevronRight
          class="h-3 w-3 shrink-0 text-faint transition-transform duration-150"
          :class="openSections.hover ? 'rotate-90' : ''"
          :stroke-width="2.25"
          aria-hidden="true"
        />
        <h3 class="type-caption text-ink">Hover</h3>
        <span class="type-button-10 ml-auto text-faint">{{ Object.keys(hoverStyles).length ? 'on' : 'off' }}</span>
      </button>
      <div v-show="openSections.hover" :class="sectionBody">
        <p class="type-caption-12 text-soft">Visual overrides applied on pointer hover.</p>
        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="{ id }" label="Background">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('background')"
              @update:model-value="setHover('background', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Color">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('color')"
              @update:model-value="setHover('color', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Border color">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('borderColor')"
              @update:model-value="setHover('borderColor', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Border width">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('borderWidth')"
              @update:model-value="setHover('borderWidth', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Box shadow">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('boxShadow')"
              @update:model-value="setHover('boxShadow', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Opacity">
            <UiInput
              :id="id"
              type="number"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('opacity')"
              @update:model-value="setHoverNumber('opacity', $event)"
            />
          </UiField>
          <UiField v-slot="{ id }" label="Transform">
            <UiInput
              :id="id"
              :class="INPUT_CLASS"
              :disabled="disabled"
              :model-value="hoverStr('transform')"
              placeholder="scale(1.02)"
              @update:model-value="setHover('transform', $event)"
            />
          </UiField>
        </div>
      </div>
    </section>
  </fieldset>
</template>
