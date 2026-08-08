<script setup lang="ts">
import type { BusinessProfile, GenerationResult } from '@platform/schemas'

/**
 * Step 7 — generate site via `/api/v1/onboarding/generate` with §81 phase labels.
 */

const props = defineProps<{
  profile: BusinessProfile | null
  style: 'auto' | 'minimal' | 'modern' | 'premium' | 'bold' | 'editorial'
  templateId: string | null
  publishNow: boolean
}>()

const emit = defineEmits<{
  done: [result: GenerationResult]
  failed: [message: string]
}>()

const api = useApi()
const activeSiteId = useActiveSiteId()

const phase = ref('Planning your website')
const busy = ref(false)

function runPhases(labels: string[], done: () => boolean) {
  let index = 0
  phase.value = labels[0]!
  const timer = setInterval(() => {
    if (done() || index >= labels.length - 1) {
      clearInterval(timer)
      return
    }
    index += 1
    phase.value = labels[index]!
  }, 900)
  return () => clearInterval(timer)
}

async function saveDashboardBranding() {
  if (!props.profile) return
  const primary =
    props.profile.brand.primaryColor ||
    props.profile.brand.colors.find((c) => /^#[0-9a-fA-F]{6}$/.test(c)) ||
    undefined
  const accent = props.profile.brand.colors.find((c) => c !== primary && /^#[0-9a-fA-F]{6}$/.test(c))
  const logo = props.profile.brand.logo || null
  try {
    await api.put('/api/v1/agency/white-label', {
      brandName: props.profile.company.name || null,
      logoUrl: logo,
      ...(primary ? { colorPrimary: primary } : {}),
      ...(accent ? { colorAccent: accent } : {}),
    })
    await refreshNuxtData(`dashboard:branding:${useActiveTenantId().value ?? 'none'}`)
  } catch {
    // Branding must never block website generation.
  }
}

async function generate() {
  if (!props.profile || busy.value) return
  busy.value = true
  let finished = false
  const stop = runPhases(
    [
      'Planning your website',
      'Choosing your sections',
      'Writing your pages',
      'Optimizing for search',
      'Running quality checks',
      'Preparing your preview',
    ],
    () => finished,
  )

  try {
    await saveDashboardBranding()
    const result = await api.post<GenerationResult>('/api/v1/onboarding/generate', {
      profile: props.profile,
      siteName: props.profile.company.name,
      style: props.style,
      maxPerformanceClass: 'B',
      publish: props.publishNow,
      templateId: props.templateId ?? undefined,
    })
    activeSiteId.value = result.siteId
    await refreshNuxtData('shell:sites')
    emit('done', result)
  } catch (caught) {
    emit('failed', caught instanceof ApiError ? caught.message : 'Could not build the website.')
  } finally {
    finished = true
    stop()
    busy.value = false
  }
}

onMounted(() => {
  if (!props.profile) {
    emit('failed', 'Business profile missing — go back and run the AI scan again.')
    return
  }
  void generate()
})
</script>

<template>
  <div class="rounded-xl border border-line bg-raised px-5 py-14 text-center shadow-card">
    <span class="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
    <p class="text-heading font-semibold text-ink" role="status" aria-live="polite">{{ phase }}…</p>
    <p class="mx-auto mt-2 max-w-sm text-[0.8125rem] text-soft">
      Building real pages from what we found — drafts until you go live.
    </p>
  </div>
</template>
