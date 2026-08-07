<script setup lang="ts">
withDefaults(
  defineProps<{
    id?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    describedBy?: string
    autocomplete?: string
  }>(),
  { id: undefined, type: 'text', placeholder: '', disabled: false, invalid: false, describedBy: undefined, autocomplete: undefined },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    class="h-10 w-full rounded-lg border bg-raised px-3 text-sm text-ink transition-colors duration-150 placeholder:text-faint disabled:cursor-not-allowed disabled:bg-sunken disabled:text-faint"
    :class="invalid ? 'border-danger' : 'border-line hover:border-line-strong'"
  />
</template>
