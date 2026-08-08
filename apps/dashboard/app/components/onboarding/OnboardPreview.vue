<script setup lang="ts">
import type { GenerationResult } from '@platform/schemas'

/**
 * Step 8 — preview the generated site before domain / go-live.
 */

const props = defineProps<{
  generated: GenerationResult | null
}>()

const emit = defineEmits<{
  continue: []
}>()

const config = useRuntimeConfig()

const previewUrl = computed(() => {
  if (!props.generated) return ''
  const host = props.generated.previewHostname || `${props.generated.siteSlug}.localhost`
  try {
    const base = new URL(config.public.storefrontUrl)
    return `${base.protocol}//${host}${base.port ? `:${base.port}` : ''}`
  } catch {
    return `http://${host}:3001`
  }
})

const editorUrl = computed(() =>
  props.generated ? `/pages/${props.generated.homePageId || props.generated.pageIds[0]}` : '',
)
</script>

<template>
  <div v-if="generated" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
    <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
      <div class="mb-4 flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center rounded-full bg-positive-soft text-positive" aria-hidden="true">
          ✓
        </span>
        <h2 class="text-heading font-semibold text-ink">{{ generated.siteName }} is ready</h2>
      </div>

      <p class="mb-5 text-sm text-soft">
        {{ generated.pageIds.length }} pages, written by {{ generated.model }}.
        {{ generated.published ? 'They are live.' : 'They are drafts until you go live.' }}
      </p>

      <div class="mb-5 overflow-hidden rounded-lg border border-line bg-sunken">
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          title="Site preview"
          class="h-[28rem] w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      <ul class="flex flex-col divide-y divide-line border-y border-line">
        <li v-for="(page, index) in generated.plan.pages" :key="page.path" class="flex items-center gap-3 py-2.5">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ page.title }}</span>
            <span class="block truncate text-[0.75rem] text-faint">
              {{ page.path }} · {{ page.blocks.length }} sections
            </span>
          </span>
          <UiButton size="sm" :to="`/pages/${generated.pageIds[index]}`">Edit</UiButton>
        </li>
      </ul>

      <div class="mt-5 flex flex-wrap gap-2">
        <UiButton variant="primary" size="lg" arrow @click="emit('continue')">Continue</UiButton>
        <UiButton :to="previewUrl" target="_blank" external>Open preview</UiButton>
        <UiButton v-if="editorUrl" :to="editorUrl">Open editor</UiButton>
      </div>
    </div>

    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <h2 class="mb-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Quality check</h2>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="(report, key) in generated.quality" :key="key" class="rounded-lg border border-line px-3 py-2.5">
          <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint">{{ key }}</p>
          <p
            class="mt-1 text-[1.5rem] font-semibold leading-none tabular-nums"
            :class="report.score >= 90 ? 'text-positive' : report.score >= 70 ? 'text-warning' : 'text-danger'"
          >
            {{ report.score }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="rounded-xl border border-line bg-raised p-5 text-center">
    <p class="text-sm text-soft">No generated site yet. Go back and build one.</p>
  </div>
</template>
