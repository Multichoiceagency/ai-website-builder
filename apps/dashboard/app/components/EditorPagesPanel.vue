<script setup lang="ts">
import type { PageSummary } from '@platform/schemas'

/**
 * The docked Pages panel: the site's other pages, one click away.
 *
 * Navigation only — creating and organising pages stays in the Pages
 * dashboard, where destructive actions have room to explain themselves.
 */
defineProps<{
  siblings: PageSummary[]
  currentId: string
}>()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
    <NuxtLink
      v-for="sibling in siblings"
      :key="sibling.id"
      :to="`/pages/${sibling.id}`"
      class="flex items-center gap-2 rounded-md px-2 py-1.5 no-underline transition-colors"
      :class="sibling.id === currentId ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-sunken'"
    >
      <span class="min-w-0 flex-1">
        <span class="type-button-12 block truncate">{{ sibling.title }}</span>
        <span class="type-button-10 block truncate text-faint">{{ sibling.path }}</span>
      </span>
      <span
        v-if="sibling.hasUnpublishedChanges"
        class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
        aria-label="Unpublished changes"
      />
    </NuxtLink>
  </div>
</template>
