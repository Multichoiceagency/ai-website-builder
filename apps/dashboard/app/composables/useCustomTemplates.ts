import { computed, ref, watch } from 'vue'
import type { SiteTemplate } from '@platform/schemas'

/**
 * Tenant-local custom section prompts saved from the fullscreen gallery.
 * Metadata + sourcePrompt only (ADR-0003) — never component source or CDN URLs.
 */
const STORAGE_KEY = 'platform:custom-section-templates'

export type CustomSectionTemplate = Pick<
  SiteTemplate,
  | 'id'
  | 'title'
  | 'category'
  | 'collection'
  | 'pageType'
  | 'style'
  | 'industry'
  | 'motionType'
  | 'complexity'
  | 'mobileSafe'
  | 'performanceClass'
  | 'previewImage'
  | 'previewVideo'
  | 'islandReady'
  | 'isFree'
  | 'sourcePrompt'
  | 'blockRecipe'
>

function readStore(): CustomSectionTemplate[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is CustomSectionTemplate =>
        Boolean(entry && typeof entry === 'object' && typeof (entry as CustomSectionTemplate).id === 'string'),
    )
  } catch {
    return []
  }
}

function writeStore(entries: CustomSectionTemplate[]) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useCustomTemplates() {
  const customs = ref<CustomSectionTemplate[]>(readStore())

  watch(
    customs,
    (value) => writeStore(value),
    { deep: true },
  )

  const asSiteTemplates = computed(() => customs.value as SiteTemplate[])

  function saveCustom(input: {
    title: string
    prompt: string
    category?: string
  }): CustomSectionTemplate {
    const title = input.title.trim() || 'Custom section'
    const prompt = input.prompt.trim()
    const entry: CustomSectionTemplate = {
      id: `custom-${crypto.randomUUID()}`,
      title,
      category: input.category?.trim() || 'Custom',
      collection: 'hero',
      pageType: 'section',
      style: ['editorial'],
      industry: ['*'],
      motionType: ['entrance', 'scroll-reveal'],
      complexity: 'moderate',
      mobileSafe: true,
      performanceClass: 'C',
      previewImage: '',
      previewVideo: '',
      islandReady: false,
      isFree: true,
      sourcePrompt: prompt,
      blockRecipe: ['hero-cover-statement-01'],
    }
    customs.value = [entry, ...customs.value]
    return entry
  }

  function removeCustom(id: string) {
    customs.value = customs.value.filter((entry) => entry.id !== id)
  }

  return { customs, asSiteTemplates, saveCustom, removeCustom }
}
