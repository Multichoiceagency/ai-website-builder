<script setup lang="ts">
/**
 * Design import: HTML file, Figma clipboard paste tip, .fig phased message.
 */
import { ref } from 'vue'
import type { LayoutContainerNode } from '@platform/schemas'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  imported: [root: LayoutContainerNode]
}>()

const api = useApi()
const busy = ref(false)
const error = ref('')
const figMessage = ref('')
const htmlPreview = ref('')

async function importHtml(html: string) {
  error.value = ''
  figMessage.value = ''
  busy.value = true
  try {
    const result = await api.post<{ ok: true; root: LayoutContainerNode }>('/api/v1/ai/design-import', {
      format: 'html',
      html,
    })
    emit('imported', result.root)
    open.value = false
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Import failed.'
  } finally {
    busy.value = false
  }
}

async function onHtmlFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const text = await file.text()
  htmlPreview.value = text.slice(0, 200)
  await importHtml(text)
}

async function onFigFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  busy.value = true
  try {
    const result = await api.post<{
      ok: false
      message: string
      hint?: string
    }>('/api/v1/ai/design-import', {
      format: 'fig',
      filename: file.name,
    })
    figMessage.value = [result.message, result.hint].filter(Boolean).join(' ')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not read that file.'
  } finally {
    busy.value = false
  }
}

async function pasteHtml() {
  error.value = ''
  try {
    const html = await navigator.clipboard.readText()
    if (!html.trim()) {
      error.value = 'Clipboard was empty. Copy from Figma or paste HTML.'
      return
    }
    // Prefer text/html when available
    let payload = html
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html')
          payload = await blob.text()
          break
        }
      }
    } catch {
      /* text fallback */
    }
    await importHtml(payload)
  } catch {
    error.value = 'Could not read the clipboard. Use Import HTML instead.'
  }
}
</script>

<template>
  <UiDialog v-model:open="open" title="Import into Design" description="HTML or Figma clipboard. No Motionsites templates.">
    <div class="flex flex-col gap-4 p-1">
      <p class="type-caption-12 leading-relaxed text-soft">
        Imports become basic layout nodes (frame, text, image, button) on the artboard.
      </p>

      <div class="flex flex-wrap gap-2">
        <label class="inline-flex cursor-pointer">
          <input type="file" accept=".html,.htm,text/html" class="sr-only" @change="onHtmlFile" />
          <span class="type-button-12 inline-flex h-8 items-center rounded-md bg-ink px-3 text-paper">Import HTML</span>
        </label>
        <UiButton size="sm" variant="ghost" :disabled="busy" @click="pasteHtml">Paste from Figma</UiButton>
        <label class="inline-flex cursor-pointer">
          <input type="file" accept=".fig,application/octet-stream" class="sr-only" @change="onFigFile" />
          <span class="type-button-12 inline-flex h-8 items-center rounded-md border border-line px-3 text-ink">Upload .fig</span>
        </label>
      </div>

      <p v-if="figMessage" class="rounded-lg border border-line bg-sunken/60 px-3 py-2 type-caption-12 text-soft">
        {{ figMessage }}
      </p>
      <p v-if="error" class="type-caption-12 text-danger">{{ error }}</p>
      <p v-if="htmlPreview" class="type-button-10 truncate text-faint">Loaded HTML…</p>
    </div>
  </UiDialog>
</template>
