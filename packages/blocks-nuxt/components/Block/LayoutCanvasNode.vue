<script setup lang="ts">
/**
 * Recursive painter for layout-canvas nodes.
 * Maps typed node styles → CSS (Frappe-like Style/Spacing/Typography/Hover).
 */
import { computed, inject, unref, type ComputedRef } from 'vue'
import {
  resolveLayoutBind,
  type LayoutButtonStyles,
  type LayoutContainerStyles,
  type LayoutHoverStyles,
  type LayoutImageStyles,
  type LayoutNode,
  type LayoutTextStyles,
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
const bindContext = inject<
  ComputedRef<{ query?: Record<string, string | undefined>; cms?: unknown }> | {
    query?: Record<string, string | undefined>
    cms?: unknown
  }
>('layoutBindContext', { query: {}, cms: undefined })

const emptyChrome = computed(() => props.showEmptyChrome || layoutCanvasEditing === true)

function nodeBind() {
  return props.node.type === 'container' ? undefined : props.node.bind
}

const resolvedBind = computed(() => resolveLayoutBind(nodeBind(), unref(bindContext)))

const textContent = computed(() => {
  if (props.node.type !== 'text') return ''
  const bind = nodeBind()
  if (bind && bind.path !== 'href' && bind.path !== 'src' && bind.path !== 'alt') {
    return resolvedBind.value ?? props.node.content ?? ''
  }
  return props.node.content ?? ''
})

const imageSrc = computed(() => {
  if (props.node.type !== 'image') return ''
  const bind = nodeBind()
  if (bind && bind.path !== 'alt' && bind.path !== 'href') {
    return resolvedBind.value ?? props.node.src ?? ''
  }
  return props.node.src ?? ''
})

const imageAlt = computed(() => {
  if (props.node.type !== 'image') return ''
  const bind = nodeBind()
  if (bind?.path === 'alt') return resolvedBind.value ?? props.node.alt ?? ''
  return props.node.alt ?? ''
})

const buttonLabel = computed(() => {
  if (props.node.type !== 'button') return ''
  const bind = nodeBind()
  if (bind && bind.path !== 'href') return resolvedBind.value ?? props.node.label ?? 'Button'
  return props.node.label || 'Button'
})

const buttonHref = computed(() => {
  if (props.node.type !== 'button') return '#'
  const bind = nodeBind()
  if (bind?.path === 'href') return resolvedBind.value ?? props.node.href ?? '#'
  return props.node.href || '#'
})

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
  const map: Array<[string, string]> = [
    ['width', 'width'],
    ['height', 'height'],
    ['minWidth', 'min-width'],
    ['minHeight', 'min-height'],
    ['maxWidth', 'max-width'],
    ['maxHeight', 'max-height'],
    ['padding', 'padding'],
    ['paddingTop', 'padding-top'],
    ['paddingRight', 'padding-right'],
    ['paddingBottom', 'padding-bottom'],
    ['paddingLeft', 'padding-left'],
    ['margin', 'margin'],
    ['marginTop', 'margin-top'],
    ['marginRight', 'margin-right'],
    ['marginBottom', 'margin-bottom'],
    ['marginLeft', 'margin-left'],
    ['background', 'background'],
    ['borderRadius', 'border-radius'],
    ['borderTopLeftRadius', 'border-top-left-radius'],
    ['borderTopRightRadius', 'border-top-right-radius'],
    ['borderBottomRightRadius', 'border-bottom-right-radius'],
    ['borderBottomLeftRadius', 'border-bottom-left-radius'],
    ['borderWidth', 'border-width'],
    ['borderStyle', 'border-style'],
    ['borderColor', 'border-color'],
    ['boxShadow', 'box-shadow'],
    ['overflow', 'overflow'],
    ['overflowX', 'overflow-x'],
    ['overflowY', 'overflow-y'],
    ['cursor', 'cursor'],
    ['left', 'left'],
    ['top', 'top'],
    ['right', 'right'],
    ['bottom', 'bottom'],
    ['visibility', 'visibility'],
  ]
  const record = styles as Record<string, unknown>
  for (const [key, css] of map) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') out[css] = String(value)
  }
  if (typeof styles.opacity === 'number') out.opacity = String(styles.opacity)
  if (typeof styles.flexGrow === 'number') out['flex-grow'] = String(styles.flexGrow)
  if (typeof styles.flexShrink === 'number') out['flex-shrink'] = String(styles.flexShrink)
  if (styles.alignSelf) out['align-self'] = styles.alignSelf
  if (styles.position) out.position = styles.position
  if (typeof styles.zIndex === 'number') out['z-index'] = String(styles.zIndex)
  if (styles.rotate) out.transform = `rotate(${styles.rotate})`
  if (styles.locked && layoutCanvasEditing) out['pointer-events'] = 'none'
  return out
}

function hoverCssVars(hover: LayoutHoverStyles | undefined): Record<string, string> {
  if (!hover) return {}
  const out: Record<string, string> = {}
  if (hover.background) out['--lc-hover-bg'] = hover.background
  if (hover.color) out['--lc-hover-color'] = hover.color
  if (hover.borderColor) out['--lc-hover-border-color'] = hover.borderColor
  if (hover.borderWidth) out['--lc-hover-border-width'] = hover.borderWidth
  if (hover.boxShadow) out['--lc-hover-shadow'] = hover.boxShadow
  if (typeof hover.opacity === 'number') out['--lc-hover-opacity'] = String(hover.opacity)
  if (hover.transform) out['--lc-hover-transform'] = hover.transform
  return out
}

const hasHover = computed(() => Boolean(props.node.stylesHover && Object.keys(props.node.stylesHover).length))

const containerStyle = computed(() => {
  if (props.node.type !== 'container') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    display: styles?.display ?? (styles?.position === 'absolute' ? 'block' : 'flex'),
    ...boxCss(styles),
    ...hoverCssVars(props.node.stylesHover),
  }
  const display = styles?.display ?? (styles?.position === 'absolute' ? 'block' : 'flex')
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
    ...hoverCssVars(props.node.stylesHover),
    color: styles?.color ?? 'var(--site-text)',
    fontFamily: styles?.fontFamily ?? 'var(--site-font-body)',
  }
  if (styles?.fontSize) out['font-size'] = styles.fontSize
  if (styles?.fontWeight !== undefined) out['font-weight'] = String(styles.fontWeight)
  if (styles?.lineHeight) out['line-height'] = styles.lineHeight
  if (styles?.letterSpacing) out['letter-spacing'] = styles.letterSpacing
  if (styles?.textAlign) out['text-align'] = styles.textAlign
  if (styles?.textTransform) out['text-transform'] = styles.textTransform
  return out
})

const imageStyle = computed(() => {
  if (props.node.type !== 'image') return {}
  const styles = props.node.styles
  const out: Record<string, string> = {
    ...boxCss(styles),
    ...hoverCssVars(props.node.stylesHover),
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
    ...hoverCssVars(props.node.stylesHover),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    cursor: styles?.cursor ?? 'pointer',
    background: styles?.background ?? 'var(--site-primary)',
    color: styles?.color ?? 'var(--site-primary-fg, #fff)',
    borderRadius: styles?.borderRadius ?? 'var(--site-radius)',
    padding: styles?.padding ?? '0.75rem 1.25rem',
    fontFamily: styles?.fontFamily ?? 'var(--site-font-body)',
  }
  if (!styles?.borderWidth && !styles?.borderColor) {
    out.border = 'none'
  }
  if (styles?.fontSize) out['font-size'] = styles.fontSize
  if (styles?.fontWeight !== undefined) out['font-weight'] = String(styles.fontWeight)
  if (styles?.lineHeight) out['line-height'] = styles.lineHeight
  if (styles?.letterSpacing) out['letter-spacing'] = styles.letterSpacing
  if (styles?.textTransform) out['text-transform'] = styles.textTransform
  if (styles?.textAlign) out['text-align'] = styles.textAlign
  return out
})
</script>

<template>
  <div
    v-if="node.type === 'container'"
    class="layout-canvas-node layout-canvas-node--container"
    :class="{ 'layout-canvas-node--hoverable': hasHover }"
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
    :class="{ 'layout-canvas-node--hoverable': hasHover }"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :style="textStyle"
  >
    {{ textContent }}
  </component>

  <img
    v-else-if="node.type === 'image' && imageSrc"
    class="layout-canvas-node layout-canvas-node--image"
    :class="{ 'layout-canvas-node--hoverable': hasHover }"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :src="imageSrc"
    :alt="imageAlt"
    :style="imageStyle"
  />

  <a
    v-else-if="node.type === 'button'"
    class="layout-canvas-node layout-canvas-node--button"
    :class="{ 'layout-canvas-node--hoverable': hasHover }"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :href="buttonHref"
    :style="buttonStyle"
  >
    {{ buttonLabel }}
  </a>
</template>

<style>
.layout-canvas-node--hoverable:hover {
  background: var(--lc-hover-bg);
  color: var(--lc-hover-color);
  border-color: var(--lc-hover-border-color);
  border-width: var(--lc-hover-border-width);
  box-shadow: var(--lc-hover-shadow);
  opacity: var(--lc-hover-opacity);
  transform: var(--lc-hover-transform);
}
</style>
