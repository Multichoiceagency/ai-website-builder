<script setup lang="ts">
import type { SiteTemplate } from '@platform/schemas'

/**
 * Step 6 — style direction + optional template starting point.
 */

const style = defineModel<'auto' | 'minimal' | 'modern' | 'premium' | 'bold' | 'editorial'>('style', {
  default: 'auto',
})
const templateId = defineModel<string | null>('templateId', { default: null })
const publishNow = defineModel<boolean>('publishNow', { default: false })

const emit = defineEmits<{
  continue: []
  back: []
}>()

const api = useApi()
const chosenTemplate = ref<SiteTemplate | null>(null)

const STYLES: { value: string; label: string; icon: string; hint: string }[] = [
  { value: 'auto', label: 'Choose for me', icon: 'style-auto', hint: 'From your brand' },
  { value: 'modern', label: 'Modern', icon: 'style-modern', hint: 'Clean, generous' },
  { value: 'minimal', label: 'Minimal', icon: 'style-minimal', hint: 'Quiet, typographic' },
  { value: 'premium', label: 'Premium', icon: 'style-premium', hint: 'Warm, restrained' },
  { value: 'bold', label: 'Bold', icon: 'style-bold', hint: 'High contrast' },
  { value: 'editorial', label: 'Editorial', icon: 'style-editorial', hint: 'Magazine rhythm' },
]

function setStyle(value: string | string[]) {
  if (typeof value === 'string') style.value = value as typeof style.value
}

async function adoptTemplate(id: string | null) {
  templateId.value = id
  if (!id) {
    chosenTemplate.value = null
    return
  }
  try {
    const detail = await api.get<{ template: SiteTemplate }>(`/api/v1/templates/${id}`)
    chosenTemplate.value = detail.template
    style.value = detail.template.style[0] ?? 'modern'
  } catch {
    chosenTemplate.value = null
    templateId.value = null
  }
}

onMounted(() => {
  if (templateId.value) void adoptTemplate(templateId.value)
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Style</h2>
      <UiOptionGrid label="Style" hide-label size="md" :options="STYLES" :model-value="style" @update:model-value="setStyle" />
    </div>

    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-heading font-semibold text-ink">Starting point</h2>
          <p class="mt-1 max-w-xl text-[0.8125rem] leading-relaxed text-soft">
            Optional. Sets the look and which sections we reach for first — never what your site says.
          </p>
        </div>
        <UiBadge v-if="chosenTemplate" tone="brand">{{ chosenTemplate.title }}</UiBadge>
        <UiBadge v-else>Platform's choice</UiBadge>
      </div>
      <TemplatePicker
        :model-value="templateId"
        cache-key="onboarding-templates"
        max-performance-class="C"
        @update:model-value="adoptTemplate"
      />
    </div>

    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <label class="flex items-start gap-3">
        <UiSwitch v-model="publishNow" label="Publish immediately" />
        <span class="min-w-0">
          <span class="block text-[0.8125rem] font-medium text-ink">Publish immediately</span>
          <span class="block text-[0.75rem] leading-relaxed text-soft">
            Off by default. Look at the preview first, then go live.
          </span>
        </span>
      </label>

      <div class="mt-5 flex gap-2">
        <UiButton @click="emit('back')">Back</UiButton>
        <UiButton variant="primary" size="lg" class="flex-1" arrow @click="emit('continue')">
          Build my website
        </UiButton>
      </div>
    </div>
  </div>
</template>
