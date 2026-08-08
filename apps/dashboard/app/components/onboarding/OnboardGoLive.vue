<script setup lang="ts">
import type { GenerationResult, PageSummary } from '@platform/schemas'

/**
 * Step 10 — publish drafts and launch into the dashboard / editor.
 */

const props = defineProps<{
  generated: GenerationResult | null
  siteId: string | null
}>()

const emit = defineEmits<{
  continue: []
}>()

const api = useApi()
const busy = ref(false)
const error = ref('')
const published = ref(Boolean(props.generated?.published))

const editorUrl = computed(() =>
  props.generated ? `/pages/${props.generated.homePageId || props.generated.pageIds[0]}` : '',
)

async function publishAll() {
  if (!props.siteId || published.value) {
    emit('continue')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const pages = await api.get<PageSummary[]>(`/api/v1/sites/${props.siteId}/pages`)
    for (const page of pages) {
      if (page.status !== 'published') {
        await api.post(`/api/v1/pages/${page.id}/publish`)
      }
    }
    published.value = true
    emit('continue')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not publish pages.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
    <h2 class="text-heading font-semibold text-ink">Go live</h2>
    <p class="mt-2 text-[0.8125rem] leading-relaxed text-soft">
      {{
        published
          ? 'Your pages are published. Continue to connect SEO and ads, or open the editor.'
          : 'Publish your draft pages so the site is reachable on its preview or custom domain.'
      }}
    </p>

    <p v-if="error" class="mt-3 text-[0.8125rem] text-danger" role="alert">{{ error }}</p>

    <ul class="mt-4 flex flex-col gap-1.5">
      <li class="text-[0.8125rem] text-soft">• Review the preview one last time</li>
      <li class="text-[0.8125rem] text-soft">• Publish pages when you are ready</li>
      <li class="text-[0.8125rem] text-soft">• Optional: connect SEO, Ads and store tools next</li>
    </ul>

    <div class="mt-5 flex flex-wrap gap-2">
      <UiButton
        variant="primary"
        size="lg"
        arrow
        :loading="busy"
        @click="published ? emit('continue') : publishAll()"
      >
        {{ published ? 'Continue' : 'Publish and continue' }}
      </UiButton>
      <UiButton v-if="!published" variant="ghost" @click="emit('continue')">Keep as drafts</UiButton>
      <UiButton v-if="editorUrl" :to="editorUrl">Open editor</UiButton>
    </div>
  </div>
</template>
