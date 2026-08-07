<script setup lang="ts">
withDefaults(
  defineProps<{ id?: string; placeholder?: string; rows?: number; describedBy?: string }>(),
  { id: undefined, placeholder: '', rows: 3, describedBy: undefined },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    :id="id"
    v-model="model"
    :rows="rows"
    :placeholder="placeholder"
    :aria-describedby="describedBy"
    class="w-full resize-y rounded-lg border border-line bg-raised px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors duration-150 placeholder:text-faint hover:border-line-strong"
  />
</template>
