<script setup lang="ts">
import { Blocks, FileText, Layers, Package } from '@lucide/vue'

/**
 * The editor's left icon rail — Frappe-Builder style.
 *
 * A slim always-visible column of panel switchers. Clicking a tab opens its
 * panel beside the rail; clicking the active tab again collapses the panel so
 * the canvas can take the full width. The rail itself never collapses: the way
 * back into a panel must stay on screen.
 */
const props = defineProps<{
  /** The tab whose panel is (or would be) showing. */
  active: 'blocks' | 'layers' | 'pages' | 'assets'
  /** Whether the panel beside the rail is open. */
  open: boolean
}>()

const emit = defineEmits<{
  select: [tab: 'blocks' | 'layers' | 'pages' | 'assets']
}>()

const TABS = [
  { id: 'blocks', label: 'Blocks', icon: Blocks },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Package },
] as const
</script>

<template>
  <nav
    class="editor-chrome flex w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-paper py-2"
    aria-label="Editor panels"
  >
    <button
      v-for="tab in TABS"
      :key="tab.id"
      type="button"
      class="grid h-9 w-9 place-items-center rounded-lg transition-colors"
      :class="
        props.active === tab.id && props.open
          ? 'bg-brand-soft text-brand'
          : 'text-faint hover:bg-sunken hover:text-ink'
      "
      :aria-label="tab.label"
      :aria-pressed="props.active === tab.id && props.open"
      :title="tab.label"
      @click="emit('select', tab.id)"
    >
      <component :is="tab.icon" class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
    </button>
  </nav>
</template>
