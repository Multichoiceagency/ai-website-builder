<script setup lang="ts">
withDefaults(
  defineProps<{ id?: string; options: { label: string; value: string }[]; describedBy?: string }>(),
  { id: undefined, describedBy: undefined },
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :aria-describedby="describedBy"
    class="h-10 w-full appearance-none rounded-lg border border-line bg-raised bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat px-3 pr-9 text-sm text-ink transition-colors duration-150 hover:border-line-strong"
    style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378787f' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E&quot;)"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
  </select>
</template>
