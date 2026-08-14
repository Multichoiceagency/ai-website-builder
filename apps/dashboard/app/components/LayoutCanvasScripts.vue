<script setup lang="ts">
import { ref } from 'vue'
import type { LayoutCustomScript } from '@platform/schemas'

/**
 * HTTPS-only third-party scripts on a layout canvas. No inline JS in page JSON.
 */
const props = withDefaults(
  defineProps<{
    scripts?: LayoutCustomScript[]
    disabled?: boolean
  }>(),
  { scripts: () => [], disabled: false },
)

const emit = defineEmits<{
  update: [scripts: LayoutCustomScript[]]
}>()

const draftSrc = ref('')
const error = ref('')

function add() {
  error.value = ''
  const src = draftSrc.value.trim()
  if (!src.startsWith('https://')) {
    error.value = 'Script URL must start with https://'
    return
  }
  if (props.scripts.length >= 8) {
    error.value = 'Maximum of 8 scripts per page.'
    return
  }
  emit('update', [...props.scripts, { id: `script_${Date.now().toString(36)}`, src }])
  draftSrc.value = ''
}

function remove(id: string) {
  emit('update', props.scripts.filter((script) => script.id !== id))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="type-caption-12 leading-relaxed text-soft">
      Loaded on the published page only. Use HTTPS URLs — inline JavaScript is not stored in page JSON.
    </p>
    <ul v-if="scripts.length" class="flex flex-col gap-1.5">
      <li
        v-for="script in scripts"
        :key="script.id"
        class="flex items-center gap-2 rounded-md border border-line px-2 py-1.5"
      >
        <code class="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-soft">{{ script.src }}</code>
        <UiButton size="sm" variant="ghost" :disabled="disabled" @click="remove(script.id)">Remove</UiButton>
      </li>
    </ul>
    <div class="flex flex-col gap-2">
      <UiInput
        :disabled="disabled"
        :model-value="draftSrc"
        placeholder="https://cdn.example.com/widget.js"
        @update:model-value="draftSrc = $event"
      />
      <UiButton size="sm" variant="ghost" :disabled="disabled" @click="add">Add script</UiButton>
      <p v-if="error" class="type-caption-12 text-danger">{{ error }}</p>
    </div>
  </div>
</template>
