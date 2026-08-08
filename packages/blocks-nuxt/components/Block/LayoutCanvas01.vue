<script setup lang="ts">
/**
 * layout-canvas-01 — empty / manual nestable flex-grid section (ADR-0003).
 *
 * Props are a typed node tree only. Motionsites islands stay separate sections.
 */
import type { LayoutNode } from '@platform/schemas'
import { DEFAULT_LAYOUT_CANVAS_ROOT } from '@platform/schemas'

withDefaults(
  defineProps<{
    root?: LayoutNode
  }>(),
  {
    root: () => ({ ...DEFAULT_LAYOUT_CANVAS_ROOT, children: [] }),
  },
)
</script>

<template>
  <div class="layout-canvas w-full" data-layout-canvas>
    <BlockLayoutCanvasNode :node="root" />
  </div>
</template>
