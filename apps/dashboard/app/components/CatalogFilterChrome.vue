<script setup lang="ts">
/**
 * Shared filter chrome for Website → Templates / Components.
 * Mirrors InsertPanel search + facet controls (labels stay aligned there).
 */
withDefaults(
  defineProps<{
    search: string
    searchPlaceholder?: string
    resultLabel?: string
    showPageTarget?: boolean
    pageTarget?: string
    pageOptions?: { label: string; value: string }[]
  }>(),
  {
    searchPlaceholder: 'Search…',
    resultLabel: '',
    showPageTarget: false,
    pageTarget: '',
    pageOptions: () => [],
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'update:pageTarget': [value: string]
}>()
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <UiInput
        :model-value="search"
        :placeholder="searchPlaceholder"
        class="sm:col-span-2 lg:col-span-2 xl:col-span-2"
        @update:model-value="emit('update:search', String($event ?? ''))"
      />
      <slot name="filters" />
    </div>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <p v-if="resultLabel" class="text-[0.8125rem] text-soft">{{ resultLabel }}</p>
      <div
        v-if="showPageTarget && pageOptions.length"
        class="flex min-w-[16rem] flex-1 flex-col gap-1 sm:max-w-xs sm:ml-auto"
      >
        <label class="text-[0.75rem] font-medium text-soft">Add sections to</label>
        <UiSelect
          :model-value="pageTarget"
          :options="pageOptions"
          @update:model-value="emit('update:pageTarget', String($event ?? ''))"
        />
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>
