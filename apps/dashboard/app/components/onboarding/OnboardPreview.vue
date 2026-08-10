<script setup lang="ts">
import { computed, onUnmounted, provide, ref, watch } from 'vue'
import type { GenerationResult, Page, Section, Theme } from '@platform/schemas'

/**
 * Step 8 — preview the generated site before domain / go-live.
 *
 * Drafts are not public on the storefront host, so we render the real
 * BlockRenderer from the authenticated page API (same as the editor).
 * Confetti celebrates the first successful paint.
 */

const props = defineProps<{
  generated: GenerationResult | null
}>()

const emit = defineEmits<{
  continue: []
}>()

const api = useApi()
const config = useRuntimeConfig()

provide('platformBlockPreview', true)

const page = ref<Page | null>(null)
const theme = ref<Theme | null>(null)
const loadingPreview = ref(false)
const previewError = ref('')
const confettiDone = ref(false)
let confettiCleanup: (() => void) | null = null

const previewUrl = computed(() => {
  if (!props.generated) return ''
  const host = props.generated.previewHostname || `${props.generated.siteSlug}.localhost`
  try {
    const base = new URL(String(config.public.storefrontUrl || 'http://localhost:3001'))
    // Prefer the storefront origin when the preview host is unreachable (Coolify).
    if (host.endsWith('.localhost') && base.hostname !== 'localhost' && !base.hostname.endsWith('.localhost')) {
      return base.origin
    }
    return `${base.protocol}//${host}${base.port ? `:${base.port}` : ''}`
  } catch {
    return `http://${host}:3001`
  }
})

const editorUrl = computed(() =>
  props.generated ? `/pages/${props.generated.homePageId || props.generated.pageIds[0]}` : '',
)

const sections = computed<Section[]>(() => page.value?.sections ?? [])

const themeVars = computed(() => {
  const t = theme.value
  if (!t) return {}
  return {
    '--site-surface': t.colorSurface,
    '--site-surface-alt': t.colorSurfaceAlt,
    '--site-text': t.colorText,
    '--site-text-muted': t.colorTextMuted,
    '--site-line': t.colorLine,
    '--site-primary': t.colorPrimary,
    '--site-accent': t.colorAccent,
    color: t.colorText,
    backgroundColor: t.colorSurface,
    fontFamily: t.fontBody,
  } as Record<string, string>
})

async function loadPreview() {
  previewError.value = ''
  page.value = null
  theme.value = null
  if (!props.generated?.homePageId) return

  loadingPreview.value = true
  try {
    const loaded = await api.get<Page>(`/api/v1/pages/${props.generated.homePageId}`)
    page.value = loaded
    const site = await api.get<{ theme: Theme }>(`/api/v1/sites/${props.generated.siteId}`)
    theme.value = site.theme
    void burstConfetti()
  } catch (caught) {
    previewError.value =
      caught instanceof ApiError ? caught.message : 'Could not load the preview. Open the editor instead.'
  } finally {
    loadingPreview.value = false
  }
}

function burstConfetti() {
  if (confettiDone.value || import.meta.server) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  confettiDone.value = true

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText =
    'pointer-events:none;position:fixed;inset:0;width:100%;height:100%;z-index:80'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const colors = ['#c45c26', '#111827', '#0d9488', '#f59e0b', '#e11d48']
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.3,
    r: 3 + Math.random() * 5,
    c: colors[Math.floor(Math.random() * colors.length)]!,
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    a: Math.random() * Math.PI,
    va: -0.2 + Math.random() * 0.4,
  }))

  let frame = 0
  let raf = 0
  const tick = () => {
    frame += 1
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const p of pieces) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.a += p.va
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.a)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      ctx.restore()
    }
    if (frame < 120) {
      raf = requestAnimationFrame(tick)
    } else {
      canvas.remove()
      window.removeEventListener('resize', resize)
      confettiCleanup = null
    }
  }
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(tick)
  confettiCleanup = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
    window.removeEventListener('resize', resize)
  }
}

watch(
  () => props.generated?.homePageId,
  () => {
    confettiDone.value = false
    void loadPreview()
  },
  { immediate: true },
)

onUnmounted(() => {
  confettiCleanup?.()
})
</script>

<template>
  <div v-if="generated" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
    <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
      <div class="mb-4 flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center rounded-full bg-positive-soft text-positive" aria-hidden="true">
          ✓
        </span>
        <h2 class="text-heading font-semibold text-ink">{{ generated.siteName }} is ready</h2>
      </div>

      <p class="mb-5 text-sm text-soft">
        {{ generated.pageIds.length }} pages, written by {{ generated.model }}.
        {{ generated.published ? 'They are live.' : 'They are drafts until you go live.' }}
      </p>

      <div class="mb-5 overflow-hidden rounded-lg border border-line bg-sunken">
        <div v-if="loadingPreview" class="grid h-[28rem] place-items-center">
          <span class="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
        <div v-else-if="previewError" class="grid h-[28rem] place-items-center px-6 text-center">
          <div>
            <p class="text-sm text-soft">{{ previewError }}</p>
            <UiButton class="mt-3" size="sm" @click="loadPreview">Retry</UiButton>
          </div>
        </div>
        <div v-else-if="sections.length && theme" class="h-[28rem] overflow-auto bg-white">
          <div
            class="origin-top scale-[0.55] sm:scale-[0.65]"
            style="width: 153.8%; transform-origin: top left"
            :style="themeVars"
          >
            <BlockRenderer :sections="sections" />
          </div>
        </div>
        <div v-else class="grid h-[28rem] place-items-center px-6 text-center">
          <p class="text-sm text-soft">Preview is empty. Open the editor to review sections.</p>
        </div>
      </div>

      <ul class="flex flex-col divide-y divide-line border-y border-line">
        <li v-for="(planPage, index) in generated.plan.pages" :key="planPage.path" class="flex items-center gap-3 py-2.5">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ planPage.title }}</span>
            <span class="block truncate text-[0.75rem] text-faint">
              {{ planPage.path }} · {{ planPage.blocks.length }} sections
            </span>
          </span>
          <UiButton size="sm" :to="`/pages/${generated.pageIds[index]}`">Edit</UiButton>
        </li>
      </ul>

      <div class="mt-5 flex flex-wrap gap-2">
        <UiButton variant="primary" size="lg" arrow @click="emit('continue')">Continue</UiButton>
        <UiButton v-if="generated.published" :to="previewUrl" target="_blank" external>Open live site</UiButton>
        <UiButton v-if="editorUrl" :to="editorUrl">Open editor</UiButton>
      </div>
    </div>

    <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
      <h2 class="mb-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Quality check</h2>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="(report, key) in generated.quality" :key="key" class="rounded-lg border border-line px-3 py-2.5">
          <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint">{{ key }}</p>
          <p
            class="mt-1 text-[1.5rem] font-semibold leading-none tabular-nums"
            :class="report.score >= 90 ? 'text-positive' : report.score >= 70 ? 'text-warning' : 'text-danger'"
          >
            {{ report.score }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="rounded-xl border border-line bg-raised p-5 text-center">
    <p class="text-sm text-soft">No generated site yet. Go back and build one.</p>
  </div>
</template>
