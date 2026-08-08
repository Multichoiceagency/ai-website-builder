<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface ScrubStep {
  at?: string
  headline?: string
  body?: string
}

const props = withDefaults(
  defineProps<{
    video?: string
    mediaId?: string
    frameCount?: number
    frameFps?: number
    scrollHeightVh?: '200' | '300' | '400' | '500'
    steps?: ScrubStep[]
  }>(),
  {
    video: '',
    mediaId: '',
    frameCount: 0,
    frameFps: 24,
    scrollHeightVh: '300',
    steps: () => [],
  },
)

const config = useRuntimeConfig()
const root = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const progress = ref(0)
const frameIndex = ref(0)
const reduced = ref(false)
const ready = ref(false)
const bitmaps = ref<(ImageBitmap | null)[]>([])

let raf = 0
let observer: IntersectionObserver | null = null

const UUID_IN_URL = /\/media\/([0-9a-fA-F-]{36})(?:\/|$)/

const resolvedMediaId = computed(() => {
  if (props.mediaId.trim()) return props.mediaId.trim()
  const match = props.video.match(UUID_IN_URL)
  return match?.[1] ?? ''
})

const count = computed(() => Math.max(0, Math.floor(Number(props.frameCount) || 0)))

const scrollStyle = computed(() => ({
  height: `${props.scrollHeightVh}vh`,
}))

function absoluteUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = String(config.public.coreApiUrl ?? '').replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function frameUrl(index: number): string {
  const id = resolvedMediaId.value
  if (!id) return ''
  return absoluteUrl(`/api/v1/content/public/media/${id}/frames/${index}.jpg`)
}

const activeStep = computed(() => {
  const list = props.steps ?? []
  if (!list.length) return null
  let current = list[0]!
  for (const step of list) {
    const at = Number.parseFloat(String(step.at ?? '0'))
    if (Number.isFinite(at) && progress.value >= at) current = step
  }
  return current
})

function measure() {
  const element = root.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const total = rect.height - window.innerHeight
  const travelled = -rect.top
  progress.value = total > 0 ? Math.min(Math.max(travelled / total, 0), 1) : 0
  const max = Math.max(count.value - 1, 0)
  frameIndex.value = Math.round(progress.value * max)
  paint()
  raf = requestAnimationFrame(measure)
}

function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function paint() {
  const canvas = canvasEl.value
  const bitmap = bitmaps.value[frameIndex.value]
  if (!canvas || !bitmap) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width <= 0 || height <= 0) return

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const scale = Math.max(width / bitmap.width, height / bitmap.height)
  const drawW = bitmap.width * scale
  const drawH = bitmap.height * scale
  ctx.drawImage(bitmap, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)
}

async function loadFrames() {
  bitmaps.value.forEach((bitmap) => bitmap?.close())
  bitmaps.value = []
  ready.value = false

  const total = count.value
  const id = resolvedMediaId.value
  if (!id || total <= 0) return

  const next: (ImageBitmap | null)[] = Array.from({ length: total }, () => null)
  const concurrency = 6
  let cursor = 0

  async function worker() {
    while (cursor < total) {
      const index = cursor
      cursor += 1
      try {
        const response = await fetch(frameUrl(index))
        if (!response.ok) continue
        const blob = await response.blob()
        next[index] = await createImageBitmap(blob)
      } catch {
        next[index] = null
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  bitmaps.value = next
  ready.value = next.some(Boolean)

  if (reduced.value) {
    frameIndex.value = Math.floor((total - 1) * 0.5)
    progress.value = 0.5
    paint()
  }
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  void loadFrames()

  if (reduced.value || typeof IntersectionObserver === 'undefined') {
    progress.value = 1
    frameIndex.value = Math.max(count.value - 1, 0)
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(measure)
        } else {
          stop()
        }
      }
    },
    { threshold: 0 },
  )
  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  bitmaps.value.forEach((bitmap) => bitmap?.close())
})

watch(
  () => [resolvedMediaId.value, count.value] as const,
  () => void loadFrames(),
)
</script>

<template>
  <div ref="root" class="relative w-full bg-black text-white" :style="scrollStyle">
    <div class="sticky top-0 h-[100dvh] w-full overflow-hidden">
      <canvas ref="canvasEl" class="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div
        v-if="!ready && count > 0"
        class="absolute inset-0 grid place-items-center text-sm text-white/70"
      >
        Loading frames…
      </div>

      <div
        v-else-if="!count || !resolvedMediaId"
        class="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/70"
      >
        Pick a library video with scroll frames ready to scrub this section.
      </div>

      <div
        v-if="activeStep"
        class="absolute inset-x-0 bottom-[12%] z-10 mx-auto max-w-2xl px-6 text-center transition-opacity duration-300"
      >
        <h2
          v-if="activeStep.headline"
          class="text-[clamp(1.75rem,1rem+3vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ activeStep.headline }}
        </h2>
        <p
          v-if="activeStep.body"
          class="mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/80"
        >
          {{ activeStep.body }}
        </p>
      </div>
    </div>
  </div>
</template>
