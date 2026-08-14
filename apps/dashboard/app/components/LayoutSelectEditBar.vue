<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUp, Link2, MousePointer2, Sparkles, Trash2, Type } from '@lucide/vue'
import type { LayoutNode } from '@platform/schemas'

/**
 * Readdy-style Edit Bar: Prompt in Place, parent, link, text, delete.
 * Anchored above the selected node. Parent owns apply / AI send.
 */
const props = defineProps<{
  node: LayoutNode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'prompt-in-place': [text: string]
  'select-parent': []
  delete: []
  patch: [patch: Partial<LayoutNode>]
  'pick-image': []
}>()

const prompt = ref('')
const linkOpen = ref(false)
const linkValue = ref('')
const textOpen = ref(false)
const textValue = ref('')

const tag = computed(() => props.node.type)

function sendPrompt() {
  const text = prompt.value.trim()
  if (!text || props.disabled) return
  emit('prompt-in-place', text)
  prompt.value = ''
}

function openLink() {
  if (props.node.type !== 'button' && props.node.type !== 'image') return
  linkValue.value = props.node.type === 'button' ? (props.node.href ?? '') : ''
  linkOpen.value = true
  textOpen.value = false
}

function saveLink() {
  if (props.node.type === 'button') emit('patch', { href: linkValue.value.trim() || '#' })
  linkOpen.value = false
}

function openText() {
  if (props.node.type === 'text') textValue.value = props.node.content ?? ''
  else if (props.node.type === 'button') textValue.value = props.node.label ?? ''
  else return
  textOpen.value = true
  linkOpen.value = false
}

function saveText() {
  if (props.node.type === 'text') emit('patch', { content: textValue.value })
  else if (props.node.type === 'button') emit('patch', { label: textValue.value })
  textOpen.value = false
}
</script>

<template>
  <div
    class="pointer-events-auto flex min-w-[16rem] max-w-[min(28rem,70vw)] flex-col gap-1 rounded-lg border border-line bg-paper/95 p-1 shadow-raised backdrop-blur-md"
    @pointerdown.stop
    @click.stop
  >
    <div class="flex items-center gap-1">
      <span class="type-button-10 inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-1 uppercase tracking-wide text-faint">
        <MousePointer2 class="h-3 w-3" :stroke-width="1.75" aria-hidden="true" />
        {{ tag }}
      </span>
      <input
        v-model="prompt"
        type="text"
        class="min-w-0 flex-1 rounded-md border border-line bg-raised px-2 py-1 text-[0.75rem] text-ink outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ink/20"
        placeholder="Prompt in place…"
        :disabled="disabled"
        @keydown.enter.prevent="sendPrompt"
      />
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-md text-ink hover:bg-sunken disabled:opacity-40"
        title="Send prompt"
        :disabled="disabled || !prompt.trim()"
        @click="sendPrompt"
      >
        <Sparkles class="h-3.5 w-3.5" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.6875rem] font-medium text-soft hover:bg-sunken hover:text-ink"
        title="Select parent"
        @click="emit('select-parent')"
      >
        <ArrowUp class="h-3.5 w-3.5" :stroke-width="1.75" aria-hidden="true" />
        Parent
      </button>
      <button
        v-if="node.type === 'text' || node.type === 'button'"
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.6875rem] font-medium text-soft hover:bg-sunken hover:text-ink"
        title="Edit text"
        :disabled="disabled"
        @click="openText"
      >
        <Type class="h-3.5 w-3.5" :stroke-width="1.75" aria-hidden="true" />
        Text
      </button>
      <button
        v-if="node.type === 'button'"
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.6875rem] font-medium text-soft hover:bg-sunken hover:text-ink"
        title="Edit link"
        :disabled="disabled"
        @click="openLink"
      >
        <Link2 class="h-3.5 w-3.5" :stroke-width="1.75" aria-hidden="true" />
        Link
      </button>
      <button
        v-if="node.type === 'image'"
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[0.6875rem] font-medium text-soft hover:bg-sunken hover:text-ink"
        title="Replace image"
        :disabled="disabled"
        @click="emit('pick-image')"
      >
        Image
      </button>
      <button
        type="button"
        class="ml-auto grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger-soft disabled:opacity-40"
        title="Delete"
        :disabled="disabled"
        @click="emit('delete')"
      >
        <Trash2 class="h-3.5 w-3.5" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>
    <div v-if="textOpen" class="flex gap-1 px-0.5 pb-0.5">
      <input
        v-model="textValue"
        type="text"
        class="min-w-0 flex-1 rounded-md border border-line bg-raised px-2 py-1 text-[0.75rem] text-ink outline-none"
        @keydown.enter.prevent="saveText"
        @keydown.escape="textOpen = false"
      />
      <UiButton size="sm" :disabled="disabled" @click="saveText">Save</UiButton>
    </div>
    <div v-if="linkOpen" class="flex gap-1 px-0.5 pb-0.5">
      <input
        v-model="linkValue"
        type="text"
        class="min-w-0 flex-1 rounded-md border border-line bg-raised px-2 py-1 text-[0.75rem] text-ink outline-none"
        placeholder="/contact or https://…"
        @keydown.enter.prevent="saveLink"
        @keydown.escape="linkOpen = false"
      />
      <UiButton size="sm" :disabled="disabled" @click="saveLink">Save</UiButton>
    </div>
  </div>
</template>
