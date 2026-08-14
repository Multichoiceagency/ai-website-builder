<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { History } from '@lucide/vue'
import type { PageRevision } from '@platform/schemas'

/**
 * Readdy Credit Care / restore: list page versions and restore one.
 */
const props = defineProps<{
  pageId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  restored: []
}>()

const api = useApi()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const revisions = ref<PageRevision[]>([])
const loading = ref(false)
const restoring = ref('')
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    revisions.value = await api.get<PageRevision[]>(`/api/v1/pages/${props.pageId}/revisions`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not load versions.'
  } finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) void load()
}

async function restore(id: string) {
  if (props.disabled) return
  restoring.value = id
  error.value = ''
  try {
    await api.post(`/api/v1/pages/${props.pageId}/revisions/${id}/restore`)
    open.value = false
    emit('restored')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not restore that version.'
  } finally {
    restoring.value = ''
  }
}

function when(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function onDocClick(event: MouseEvent) {
  if (!open.value || !root.value) return
  if (!root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
      title="Version history"
      aria-label="Version history"
      :aria-expanded="open"
      @click="toggle"
    >
      <History class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      class="absolute left-0 top-full z-[var(--z-nav-flyout)] mt-1 w-72 rounded-lg border border-line bg-paper p-2 shadow-raised"
    >
      <p class="type-button-12 px-1 py-1 text-ink">Versions</p>
      <p v-if="loading" class="type-caption-12 px-1 py-2 text-soft">Loading…</p>
      <p v-else-if="error" class="type-caption-12 px-1 py-2 text-danger">{{ error }}</p>
      <p v-else-if="!revisions.length" class="type-caption-12 px-1 py-2 text-soft">
        Save or publish to create a version.
      </p>
      <ul v-else class="flex max-h-64 flex-col gap-0.5 overflow-auto">
        <li
          v-for="revision in revisions.slice(0, 12)"
          :key="revision.id"
          class="flex items-center justify-between gap-2 rounded-md px-1 py-1.5 hover:bg-sunken"
        >
          <span class="min-w-0 truncate type-caption-12 text-soft">
            {{ when(revision.createdAt) }} · {{ revision.reason }}
          </span>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="disabled"
            :loading="restoring === revision.id"
            @click="restore(revision.id)"
          >
            Restore
          </UiButton>
        </li>
      </ul>
    </div>
  </div>
</template>
