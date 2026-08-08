<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * One settings section, loaded and saved.
 *
 * Every settings screen in the product is the same three moves — read a
 * document, edit a draft of it, PUT the draft — so they happen here once and
 * the screens are left with nothing but their fields. The draft is exposed
 * through a scoped slot, which is what keeps a section's *layout* free while
 * its *behaviour* stays identical everywhere.
 *
 * A section is never saved implicitly. The save bar appears when the draft
 * diverges and stays until the user acts, because a settings screen that writes
 * as you type is a settings screen you cannot back out of.
 */
const props = withDefaults(
  defineProps<{
    /** `platform` keys sit at `/settings/:key`, commerce under `/settings/commerce/:key`. */
    scope?: 'platform' | 'commerce'
    sectionKey: string
    title: string
    description?: string
    /** Hide the save bar for sections that write through their own endpoints. */
    readOnly?: boolean
  }>(),
  { scope: 'platform', description: '', readOnly: false },
)

const emit = defineEmits<{ saved: [] }>()

interface SecretState {
  field: string
  configured: boolean
  hint: string | null
  updatedAt: string | null
}

interface SectionResponse {
  scope: string
  key: string
  label: string
  settings: Record<string, unknown>
  secrets: SecretState[]
  writable: boolean
  minimumPlan: string | null
}

const api = useApi()

const path = computed(() =>
  props.scope === 'commerce'
    ? `/api/v1/settings/commerce/${props.sectionKey}`
    : `/api/v1/settings/${props.sectionKey}`,
)

const { data, refresh } = await useAsyncData(`settings:${props.scope}:${props.sectionKey}`, () =>
  api.get<SectionResponse>(path.value),
)

const draft = ref<Record<string, unknown>>({ ...(data.value?.settings ?? {}) })
const saving = ref(false)
const error = ref('')
const saved = ref(false)

watch(
  () => data.value?.settings,
  (value) => {
    draft.value = { ...(value ?? {}) }
  },
)

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(data.value?.settings ?? {}))
const writable = computed(() => data.value?.writable !== false)

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false

  try {
    await api.put(path.value, draft.value)
    await refresh()
    saved.value = true
    emit('saved')
  } catch (cause) {
    // The server's message is shown verbatim: a plan gate the user cannot read
    // is a support ticket. See `PlanLimitError` in the API.
    error.value = cause instanceof ApiError ? cause.message : 'Could not save these settings.'
  } finally {
    saving.value = false
  }
}

function reset() {
  draft.value = { ...(data.value?.settings ?? {}) }
  error.value = ''
}

defineExpose({ refresh })
</script>

<template>
  <section class="rounded-card border border-line bg-raised">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div class="min-w-0">
        <h2 class="type-button text-ink">{{ title }}</h2>
        <p v-if="description" class="type-caption-12 mt-1 max-w-xl text-soft">{{ description }}</p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <UiBadge v-if="!writable && data?.minimumPlan" tone="warning">
          {{ data.minimumPlan }} plan
        </UiBadge>
        <slot name="actions" />
      </div>
    </header>

    <div class="px-5 py-5">
      <slot :draft="draft" :secrets="data?.secrets ?? []" :writable="writable" :refresh="refresh" />
    </div>

    <!--
      The save bar is part of the section, not a floating global control: two
      sections open at once must never share one "unsaved changes" state.
    -->
    <footer
      v-if="!readOnly && (dirty || error || saved)"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken/50 px-5 py-3"
    >
      <p v-if="error" class="type-caption-12 text-danger" role="alert">{{ error }}</p>
      <p v-else-if="dirty" class="type-caption-12 text-soft">Unsaved changes.</p>
      <p v-else class="type-caption-12 text-positive">Saved.</p>

      <div v-if="dirty" class="ml-auto flex gap-2">
        <UiButton size="sm" :disabled="saving" @click="reset">Discard</UiButton>
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="!writable" @click="save">
          Save changes
        </UiButton>
      </div>
    </footer>
  </section>
</template>
