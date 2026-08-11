<script setup lang="ts">
/**
 * Recursive painter for layout-canvas nodes.
 * Maps typed node styles → CSS flex/grid/gap/padding/align (no framework source).
 */
import { computed, inject } from 'vue'
import type {
  LayoutButtonStyles,
  LayoutContainerStyles,
  LayoutImageStyles,
  LayoutNode,
  LayoutTextStyles,
} from '@platform/schemas'

const props = withDefaults(
  defineProps<{
    node: LayoutNode
    /** Editor-only empty hit target; prefer inject `layoutCanvasEditing`. */
    showEmptyChrome?: boolean
  }>(),
  { showEmptyChrome: false },
)

defineOptions({ name: 'BlockLayoutCanvasNode' })

/** Provided by EditorCanvas so storefront/preview stay chrome-free. */
const layoutCanvasEditing = inject<boolean>('layoutCanvasEditing', false)

const emptyChrome = computed(() => props.showEmptyChrome || layoutCanvasEditing === true)

const isEmptyContainer = computed(
  () => props.node.type === 'container' && !(props.node.children?.length),
)

type AnyStyles =
  | LayoutContainerStyles
  | LayoutTextStyles
  | LayoutImageStyles
  | LayoutButtonStyles
  | undefined

function boxCss(styles: AnyStyles): Record<string, string> {
  if (!styles) return {}
  const out: Record<string, string> = {}
  const map: Array<[keyof typeof styles & string, string]> = [
    ['width', 'width'],
    ['height', 'height'],
    ['minWidth', 'min-width'],
    ['minHeight', 'min-height'],
    ['maxWidth', 'max-width'],
    ['maxHeight', 'max-height'],
    ['padding', 'padding'],
    ['margin', 'margin'],
    ['background', 'background'],
    ['borderRadius', 'border-radius'],
  ]
  for (const [key, css] of map) {
    const value = styles[key as keyof typeof styles]
    if (value !== undefined && value !== null && value !== '') out[css] = String(value)
  }
  if (typeof styles.opacity === 'number') out.opacity = String(styles.opacity)
  if (typeof styles.flexGrow === 'number') out['flex-grow'] = String(styles.flexGrow)
  if (typeof styles.flexShrink === 'number') out['flex-shrink'] = String(styles.flexShrink)
  if (styles.alignSelf) out['align-self'] = styles.alignSelf
  return out
}

const containerStyle = computed(() => {
  if (props.node.type !== 'container') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    display: styles?.display ?? 'flex',
    ...boxCss(styles),
  }
  const display = styles?.display ?? 'flex'
  if (display === 'flex' || display === 'grid') {
    if (display === 'flex') {
      out['flex-direction'] = styles?.flexDirection ?? 'column'
      if (styles?.flexWrap) out['flex-wrap'] = styles.flexWrap
      if (styles?.justifyContent) out['justify-content'] = styles.justifyContent
      if (styles?.alignItems) out['align-items'] = styles.alignItems
    }
    if (display === 'grid') {
      if (styles?.gridTemplateColumns) out['grid-template-columns'] = styles.gridTemplateColumns
      if (styles?.gridTemplateRows) out['grid-template-rows'] = styles.gridTemplateRows
      if (styles?.justifyContent) out['justify-content'] = styles.justifyContent
      if (styles?.alignItems) out['align-items'] = styles.alignItems
    }
    if (styles?.gap) out.gap = styles.gap
    if (styles?.rowGap) out['row-gap'] = styles.rowGap
    if (styles?.columnGap) out['column-gap'] = styles.columnGap
  }
  // Empty containers without editor chrome still need a modest hit/layout box.
  if (isEmptyContainer.value && !emptyChrome.value && !out['min-height']) {
    out['min-height'] = '3rem'
  }
  return out
})

const textStyle = computed(() => {
  if (props.node.type !== 'text') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    ...boxCss(styles),
    color: styles?.color ?? 'var(--site-text)',
    fontFamily: 'var(--site-font-body)',
  }
  if (styles?.fontSize) out['font-size'] = styles.fontSize
  if (styles?.fontWeight !== undefined) out['font-weight'] = String(styles.fontWeight)
  if (styles?.lineHeight) out['line-height'] = styles.lineHeight
  if (styles?.letterSpacing) out['letter-spacing'] = styles.letterSpacing
  if (styles?.textAlign) out['text-align'] = styles.textAlign
  return out
})

const imageStyle = computed(() => {
  if (props.node.type !== 'image') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    ...boxCss(styles),
    display: 'block',
    maxWidth: styles?.maxWidth ?? '100%',
  }
  if (styles?.objectFit) out['object-fit'] = styles.objectFit
  return out
})

const buttonStyle = computed(() => {
  if (props.node.type !== 'button') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    ...boxCss(styles),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    background: styles?.background ?? 'var(--site-primary)',
    color: styles?.color ?? 'var(--site-primary-fg, #fff)',
    borderRadius: styles?.borderRadius ?? 'var(--site-radius)',
    padding: styles?.padding ?? '0.75rem 1.25rem',
    fontFamily: 'var(--site-font-body)',
  }
  if (styles?.fontSize) out['font-size'] = styles.fontSize
  if (styles?.fontWeight !== undefined) out['font-weight'] = String(styles.fontWeight)
  if (styles?.textAlign) out['text-align'] = styles.textAlign
  return out
})
</script>

<template>
  <div
    v-if="node.type === 'container'"
    class="layout-canvas-node layout-canvas-node--container"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :style="containerStyle"
  >
    <BlockLayoutCanvasNode
      v-for="child in node.children ?? []"
      :key="child.id"
      :node="child"
    />
    <div
      v-if="emptyChrome && isEmptyContainer"
      class="layout-canvas-node__empty flex min-h-[3rem] items-center justify-center border border-dashed px-3 py-2 text-center text-[0.75rem] leading-snug"
      style="
        border-color: color-mix(in oklab, var(--site-text) 22%, transparent);
        color: var(--site-text-muted);
        opacity: 0.65;
      "
      aria-hidden="true"
    >
      Empty — select and add in Structure
    </div>
  </div>

  <component
    :is="node.tag || 'p'"
    v-else-if="node.type === 'text'"
    class="layout-canvas-node layout-canvas-node--text"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :style="textStyle"
  >
    {{ node.content }}
  </component>

  <img
    v-else-if="node.type === 'image' && node.src"
    class="layout-canvas-node layout-canvas-node--image"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :src="node.src"
    :alt="node.alt || ''"
    :style="imageStyle"
  />

  <a
    v-else-if="node.type === 'button'"
    class="layout-canvas-node layout-canvas-node--button"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :href="node.href || '#'"
    :style="buttonStyle"
  >
    {{ node.label || 'Button' }}
  </a>
</template>
