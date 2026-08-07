<script setup lang="ts">
import { useId } from 'vue'

/**
 * Label, control and message as one unit. Wiring `for`/`id`/`aria-describedby`
 * here is what stops every form in the product from doing it differently — or
 * not at all.
 */
withDefaults(defineProps<{ label: string; help?: string; error?: string; required?: boolean }>(), {
  help: '',
  error: '',
  required: false,
})

const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-[0.8125rem] font-medium text-soft">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>

    <slot :id="id" :described-by="help || error ? `${id}-message` : undefined" />

    <p v-if="error" :id="`${id}-message`" class="text-[0.8125rem] text-danger" role="alert">{{ error }}</p>
    <p v-else-if="help" :id="`${id}-message`" class="text-[0.8125rem] text-faint">{{ help }}</p>
  </div>
</template>
