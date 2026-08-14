<script setup lang="ts">
/**
 * layout-canvas-01 — empty / manual nestable flex-grid section (ADR-0003).
 *
 * Props are a typed node tree only. Motionsites islands stay separate sections.
 * CMS / URL binds resolve at render time; custom scripts are HTTPS src only.
 */
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, unref, type ComputedRef, type Ref } from 'vue'
import {
  DEFAULT_LAYOUT_CANVAS_ROOT,
  findLayoutCmsBind,
  type LayoutCustomScript,
  type LayoutNode,
} from '@platform/schemas'

const props = withDefaults(
  defineProps<{
    root?: LayoutNode
    customScripts?: LayoutCustomScript[]
  }>(),
  {
    root: () => ({ ...DEFAULT_LAYOUT_CANVAS_ROOT, children: [] }),
    customScripts: () => [],
  },
)

const route = useRoute()
const config = useRuntimeConfig()
const editing = inject<boolean>('layoutCanvasEditing', false)
const cmsSiteId = inject<ComputedRef<string> | Ref<string> | string | undefined>('layoutCmsSiteId', undefined)
const cmsTenantId = inject<ComputedRef<string | null> | Ref<string | null> | string | undefined>(
  'layoutCmsTenantId',
  undefined,
)

const queryMap = computed(() => {
  const out: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') out[key] = value
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0]
  }
  return out
})

const cmsBind = computed(() => findLayoutCmsBind(props.root))

const cmsSlug = computed(() => {
  const bind = cmsBind.value
  if (!bind) return ''
  return (
    bind.slug ||
    queryMap.value[bind.queryKey || ''] ||
    queryMap.value.entry ||
    queryMap.value.slug ||
    'home'
  )
})

const { data: cmsEntry } = await useAsyncData(
  () =>
    `layout-cms:${cmsBind.value?.provider ?? 'platform'}:${cmsBind.value?.collection ?? ''}:${cmsSlug.value}`,
  async () => {
    const bind = cmsBind.value
    if (!bind?.collection) return null
    const provider = bind.provider ?? 'platform'
    const collection = bind.collection
    const slug = cmsSlug.value
    const surface = String(config.public.surface ?? '')
    try {
      if (surface === 'dashboard') {
        const siteId = unref(cmsSiteId) || ''
        if (!siteId) return null
        const tenant = unref(cmsTenantId)
        const payload = await $fetch<{ data?: { entry: Record<string, unknown> | null } }>(
          '/api/v1/cms/resolve',
          {
            query: { siteId, provider, collection, slug },
            headers: tenant ? { 'x-tenant-id': String(tenant) } : undefined,
            credentials: 'include',
          },
        )
        return payload.data?.entry ?? null
      }
      const host = import.meta.client
        ? window.location.hostname
        : (useRequestURL().hostname || 'localhost')
      const payload = await $fetch<{ data?: { entry: Record<string, unknown> | null } }>('/public/cms', {
        query: { host, provider, collection, slug },
      })
      return payload.data?.entry ?? null
    } catch {
      return null
    }
  },
  { watch: [cmsBind, cmsSlug] },
)

const bindContext = computed(() => ({
  query: queryMap.value,
  cms: cmsEntry.value ?? undefined,
}))

provide('layoutBindContext', bindContext)

const injected = ref<HTMLScriptElement[]>([])

onMounted(() => {
  if (editing || !import.meta.client) return
  for (const script of props.customScripts ?? []) {
    if (!script.src.startsWith('https://')) continue
    if (document.querySelector(`script[data-layout-canvas-script="${script.id}"]`)) continue
    const el = document.createElement('script')
    el.src = script.src
    el.async = true
    el.dataset.layoutCanvasScript = script.id
    document.body.appendChild(el)
    injected.value.push(el)
  }
})

onBeforeUnmount(() => {
  for (const el of injected.value) el.remove()
  injected.value = []
})
</script>

<template>
  <div class="layout-canvas w-full" data-layout-canvas>
    <BlockLayoutCanvasNode :node="root" />
  </div>
</template>
