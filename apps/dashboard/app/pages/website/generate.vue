<script setup lang="ts">
import { ref } from 'vue'
import type { GenerationResult } from '@platform/schemas'

/**
 * Ambora-style one-prompt website builder.
 * POST /api/v1/onboarding/generate-from-prompt → jump to editor / onboarding preview.
 */

definePageMeta({ layout: 'default' })

const api = useApi()
const prompt = ref(
  'Build a modern website for Multichoice Agency, a digital marketing studio in Rotterdam. Bold, proof-led, Dutch.',
)
const locale = ref('nl')
const style = ref<'auto' | 'minimal' | 'modern' | 'premium' | 'bold' | 'editorial'>('auto')
const busy = ref(false)
const error = ref('')
const result = ref<GenerationResult | null>(null)
const phase = ref('')

async function generate() {
  error.value = ''
  result.value = null
  busy.value = true
  phase.value = 'Understanding your brief…'
  const phases = ['Understanding your brief…', 'Planning pages…', 'Writing copy…', 'Composing the site…']
  let i = 0
  const timer = setInterval(() => {
    i = Math.min(i + 1, phases.length - 1)
    phase.value = phases[i]!
  }, 1200)

  try {
    const created = await api.post<GenerationResult>('/api/v1/onboarding/generate-from-prompt', {
      prompt: prompt.value.trim(),
      locale: locale.value,
      style: style.value,
      publish: false,
    })
    result.value = created
    phase.value = 'Ready'
    await navigateTo(`/pages/${created.homePageId}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Generation failed.'
  } finally {
    clearInterval(timer)
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <header class="mb-8">
      <p class="text-sm font-medium text-faint">Website</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-ink">Generate from a prompt</h1>
      <p class="mt-2 text-sm text-soft">
        Describe the business in one paragraph. Paste a URL to discover it, or let us synthesize a starting profile.
      </p>
      <p class="mt-2 text-sm">
        Prefer the guided path?
        <NuxtLink to="/onboarding" class="text-brand underline-offset-2 hover:underline">Open onboarding</NuxtLink>
      </p>
      <p class="mt-2 text-sm text-soft">
        Building a full shop (products, collections, checkout)?
        <NuxtLink to="/commerce/builder" class="text-brand underline-offset-2 hover:underline">
          Commerce → Store builder
        </NuxtLink>
      </p>
    </header>

    <form class="flex flex-col gap-4 rounded-xl border border-line bg-raised p-5" @submit.prevent="generate">
      <UiField v-slot="{ id }" label="Brief" help="Include the business name, city, and what they sell.">
        <UiTextarea :id="id" v-model="prompt" :rows="6" :disabled="busy" />
      </UiField>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiField v-slot="{ id }" label="Language">
          <UiSelect
            :id="id"
            v-model="locale"
            :disabled="busy"
            :options="[
              { label: 'Nederlands', value: 'nl' },
              { label: 'English', value: 'en' },
            ]"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Style">
          <UiSelect
            :id="id"
            v-model="style"
            :disabled="busy"
            :options="[
              { label: 'Auto', value: 'auto' },
              { label: 'Modern', value: 'modern' },
              { label: 'Minimal', value: 'minimal' },
              { label: 'Premium', value: 'premium' },
              { label: 'Bold', value: 'bold' },
              { label: 'Editorial', value: 'editorial' },
            ]"
          />
        </UiField>
      </div>

      <p v-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
      <p v-else-if="busy" class="text-sm text-soft" role="status">{{ phase }}</p>

      <UiButton type="submit" variant="primary" size="lg" class="self-start" arrow :disabled="busy || prompt.trim().length < 8">
        {{ busy ? 'Building…' : 'Generate website' }}
      </UiButton>
    </form>
  </div>
</template>
