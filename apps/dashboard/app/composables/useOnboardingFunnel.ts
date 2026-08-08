import type { OnboardingFunnel, OnboardingFunnelStep, UpdateOnboardingFunnel } from '@platform/schemas'

/**
 * Tenant-scoped signup → go-live progress (§80–85).
 * Persists via GET/PATCH `/api/v1/onboarding/progress`.
 */
export function useOnboardingFunnel() {
  const api = useApi()
  const progress = ref<OnboardingFunnel | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      progress.value = await api.get<OnboardingFunnel>('/api/v1/onboarding/progress')
    } catch (caught) {
      error.value = caught instanceof ApiError ? caught.message : 'Could not load onboarding progress.'
      progress.value = null
    } finally {
      loading.value = false
    }
  }

  async function patch(partial: UpdateOnboardingFunnel) {
    saving.value = true
    error.value = ''
    try {
      progress.value = await api.patch<OnboardingFunnel>('/api/v1/onboarding/progress', partial)
      return progress.value
    } catch (caught) {
      error.value = caught instanceof ApiError ? caught.message : 'Could not save onboarding progress.'
      throw caught
    } finally {
      saving.value = false
    }
  }

  async function completeStep(
    step: OnboardingFunnelStep,
    next: OnboardingFunnelStep,
    extra: UpdateOnboardingFunnel = {},
  ) {
    const completed = new Set(progress.value?.completedSteps ?? [])
    completed.add(step)
    return patch({
      ...extra,
      step: next,
      completedSteps: [...completed],
    })
  }

  async function skipLater(step: OnboardingFunnelStep, next: OnboardingFunnelStep) {
    const skipped = new Set(progress.value?.skippedLater ?? [])
    skipped.add(step)
    return patch({
      step: next,
      skippedLater: [...skipped],
    })
  }

  return { progress, loading, saving, error, load, patch, completeStep, skipLater }
}
