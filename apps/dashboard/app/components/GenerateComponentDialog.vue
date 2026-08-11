<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  COMPONENT_TARGET_LABELS,
  COMPONENT_TARGETS,
  type ComponentTarget,
  type GenerateComponentResult,
  type MediaAsset,
} from '@platform/schemas'

/**
 * Generate a UX component (product card, header, section…) from a brief and an
 * optional reference image, then assign it to a system target on the site.
 */
const props = defineProps<{
  open: boolean
  siteId: string | null
  pageId?: string | null
  /** Prefill target when opened from a contextual CTA. */
  defaultTarget?: ComponentTarget
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  generated: [result: GenerateComponentResult]
}>()

const api = useApi()
const { upload: uploadMedia } = useMediaUpload()

const brief = ref('')
const title = ref('')
const target = ref<ComponentTarget>(props.defaultTarget ?? 'product-card')
const referenceUrl = ref('')
const referencePreview = ref('')
const appendToPage = ref(Boolean(props.pageId))
const saveAsset = ref(true)
const assign = ref(true)
const busy = ref(false)
const error = ref('')
const lastResult = ref<GenerateComponentResult | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    error.value = ''
    lastResult.value = null
    if (props.defaultTarget) target.value = props.defaultTarget
    appendToPage.value = Boolean(props.pageId)
  },
)

const TARGET_OPTIONS = COMPONENT_TARGETS.map((value) => ({
  label: COMPONENT_TARGET_LABELS[value],
  value,
}))

const canSubmit = computed(
  () => Boolean(props.siteId) && brief.value.trim().length >= 8 && !busy.value,
)

const hint = computed(() => {
  switch (target.value) {
    case 'product-card':
      return 'Describe layout, price treatment, and hover motion. Attach a screenshot of a card you like.'
    case 'header':
      return 'Describe nav structure, glass vs solid chrome, and mobile menu behaviour.'
    case 'theme':
      return 'Attach a brand screenshot — we extract colours into design tokens (no island).'
    default:
      return 'Describe the UX. Motionsites codegen builds a live island; the page stores block id + props only.'
  }
})

watch(referenceUrl, (value) => {
  referencePreview.value = value
})

function close() {
  emit('update:open', false)
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  error.value = ''
  try {
    const uploaded = await uploadMedia([file], { folder: 'references' })
    const asset = uploaded[0] as MediaAsset | undefined
    if (!asset?.url) {
      error.value = 'Upload failed — try a PNG or JPEG under 25 MB.'
      return
    }
    const config = useRuntimeConfig()
    const absolute = asset.url.startsWith('http')
      ? asset.url
      : `${config.public.coreApiUrl}${asset.url}`
    referenceUrl.value = absolute
    referencePreview.value = absolute
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not upload reference image.'
  }
}

function clearReference() {
  referenceUrl.value = ''
  referencePreview.value = ''
}

async function submit() {
  if (!props.siteId || !canSubmit.value) return
  busy.value = true
  error.value = ''
  lastResult.value = null
  try {
    const result = await api.post<GenerateComponentResult>('/api/v1/ai/generate-component', {
      siteId: props.siteId,
      brief: brief.value.trim(),
      target: target.value,
      title: title.value.trim() || undefined,
      referenceImage: referenceUrl.value.trim() || undefined,
      pageId: appendToPage.value && props.pageId ? props.pageId : undefined,
      saveAsset: saveAsset.value,
      assign: assign.value,
    })
    lastResult.value = result
    emit('generated', result)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Generation failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[calc(var(--z-editor-panel)+30)] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate component"
        class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
      >
        <div class="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-ink">Generate component</h2>
            <p class="mt-1 type-caption-12 text-soft">
              Brief + optional reference → Motionsites island assigned to a system slot (ADR-0003).
            </p>
          </div>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-md text-faint hover:bg-sunken hover:text-ink"
            aria-label="Close"
            @click="close"
          >
            &times;
          </button>
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <UiField v-slot="{ id }" label="Assign to" required>
            <UiSelect :id="id" v-model="target" :options="TARGET_OPTIONS" />
          </UiField>

          <UiField v-slot="{ id }" label="Title">
            <UiInput :id="id" v-model="title" placeholder="e.g. Brutal product card" />
          </UiField>

          <UiField v-slot="{ id }" label="Brief" required>
            <UiTextarea
              :id="id"
              v-model="brief"
              :rows="6"
              :placeholder="hint"
            />
          </UiField>

          <div>
            <p class="mb-1.5 type-caption-12 font-medium text-ink">Reference image</p>
            <div class="flex flex-wrap items-center gap-2">
              <UiButton size="sm" variant="secondary" type="button" @click="fileInput?.click()">
                Upload image
              </UiButton>
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="hidden"
                @change="onFileChange"
              />
              <UiInput
                v-model="referenceUrl"
                placeholder="Or paste media URL / path"
                class="min-w-[12rem] flex-1"
              />
              <UiButton
                v-if="referenceUrl"
                size="sm"
                variant="ghost"
                type="button"
                @click="clearReference"
              >
                Clear
              </UiButton>
            </div>
            <p class="mt-1 type-caption-12 text-faint">
              Gemini vision describes the image when configured; otherwise the URL is used as text reference.
            </p>
            <img
              v-if="referencePreview"
              :src="referencePreview"
              alt="Reference preview"
              class="mt-2 max-h-32 rounded-md border border-line object-contain"
            />
          </div>

          <label class="flex items-center gap-2 type-caption-12 text-soft">
            <input v-model="assign" type="checkbox" class="rounded border-line" />
            Assign to site system target
          </label>
          <label class="flex items-center gap-2 type-caption-12 text-soft">
            <input v-model="saveAsset" type="checkbox" class="rounded border-line" />
            Save as workspace asset
          </label>
          <label v-if="pageId" class="flex items-center gap-2 type-caption-12 text-soft">
            <input v-model="appendToPage" type="checkbox" class="rounded border-line" />
            Append to current page
          </label>

          <p v-if="error" class="rounded-md bg-danger-soft px-3 py-2 type-caption-12 text-danger" role="alert">
            {{ error }}
          </p>

          <div
            v-if="lastResult?.ok"
            class="rounded-md border border-line bg-sunken px-3 py-2 type-caption-12 text-soft"
          >
            <p class="font-medium text-ink">Generated · {{ lastResult.target }}</p>
            <p v-if="lastResult.sectionId">Island: {{ lastResult.sectionId }}</p>
            <p v-if="lastResult.assignment">Assigned to {{ lastResult.assignment.target }}</p>
            <p>Reference: {{ lastResult.referenceMode }}</p>
            <p class="text-faint">{{ lastResult.note }}</p>
            <ul v-if="lastResult.errors?.length" class="mt-1 list-disc pl-4 text-warning">
              <li v-for="(entry, index) in lastResult.errors" :key="index">{{ entry }}</li>
            </ul>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-line px-5 py-3">
          <UiButton variant="secondary" type="button" :disabled="busy" @click="close">
            {{ lastResult?.ok ? 'Done' : 'Cancel' }}
          </UiButton>
          <UiButton
            variant="primary"
            type="button"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ busy ? 'Generating…' : 'Generate' }}
          </UiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
