<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { cn } from '~/utils/cn'

/**
 * Aceternity-style 3D globe (Three.js port for Nuxt/Vue).
 * Avatar pins are live visitors only — never demo stock people.
 */

export interface GlobeMarker {
  id: string
  label: string
  lat: number
  lng: number
  src: string
  channel?: 'website' | 'ecommerce' | 'unknown'
  weight?: number
}

const props = withDefaults(
  defineProps<{
    markers?: GlobeMarker[]
    activeCount?: number
    class?: string
    autoRotateSpeed?: number
  }>(),
  {
    markers: () => [],
    activeCount: 0,
    class: '',
    autoRotateSpeed: 0.35,
  },
)

const EARTH =
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
const BUMP = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png'

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const hovered = ref<GlobeMarker | null>(null)
const ready = ref(false)
const failed = ref(false)
const failReason = ref('')

const RADIUS = 2

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let globeGroup: THREE.Group | null = null
let pinGroup: THREE.Group | null = null
let frame = 0
let disposed = false

interface PinRecord {
  marker: GlobeMarker
  sprite: THREE.Sprite
  line: THREE.Mesh
  world: THREE.Vector3
}

const pins: PinRecord[] = []

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

function applySrgb(texture: THREE.Texture) {
  // three@0.134 uses encoding; newer three uses colorSpace.
  const anyThree = THREE as typeof THREE & { SRGBColorSpace?: string; sRGBEncoding?: number }
  const anyTex = texture as THREE.Texture & { colorSpace?: string; encoding?: number }
  if (anyThree.SRGBColorSpace) anyTex.colorSpace = anyThree.SRGBColorSpace
  else if (typeof anyThree.sRGBEncoding === 'number') anyTex.encoding = anyThree.sRGBEncoding
}

function loadAvatarTexture(src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(
      src,
      (texture) => {
        applySrgb(texture)
        resolve(texture)
      },
      undefined,
      reject,
    )
  })
}

async function loadEarthMaterial(): Promise<THREE.MeshStandardMaterial> {
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  try {
    const [earth, bump] = await Promise.all([loader.loadAsync(EARTH), loader.loadAsync(BUMP)])
    applySrgb(earth)
    earth.anisotropy = 16
    bump.anisotropy = 8
    return new THREE.MeshStandardMaterial({
      map: earth,
      bumpMap: bump,
      bumpScale: 0.25,
      roughness: 0.7,
      metalness: 0,
    })
  } catch {
    // CDN / offline — still show a readable globe shell
    return new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: false,
    })
  }
}

async function rebuildPins(markers: GlobeMarker[]) {
  if (!pinGroup || !globeGroup) return

  while (pinGroup.children.length) {
    const child = pinGroup.children[0]!
    pinGroup.remove(child)
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const material = child.material
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose())
      else material.dispose()
    } else if (child instanceof THREE.Sprite) {
      const material = child.material
      material.map?.dispose()
      material.dispose()
    }
  }
  pins.length = 0

  for (const marker of markers) {
    try {
      const texture = await loadAvatarTexture(marker.src)
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
      })
      const sprite = new THREE.Sprite(material)
      const size = 0.22 + Math.min(0.12, (marker.weight ?? 1) * 0.02)
      sprite.scale.set(size, size, 1)

      const surface = latLngToVector3(marker.lat, marker.lng, RADIUS * 1.001)
      const top = latLngToVector3(marker.lat, marker.lng, RADIUS * 1.18)
      sprite.position.copy(top)

      const direction = top.clone().sub(surface).normalize()
      const height = top.distanceTo(surface)
      const lineGeo = new THREE.CylinderGeometry(0.008, 0.008, height, 6)
      const lineMat = new THREE.MeshBasicMaterial({
        color: marker.channel === 'ecommerce' ? 0xf59e0b : 0x94a3b8,
        transparent: true,
        opacity: 0.7,
      })
      const line = new THREE.Mesh(lineGeo, lineMat)
      line.position.copy(surface.clone().lerp(top, 0.5))
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      )
      tip.position.copy(surface)

      pinGroup.add(line, tip, sprite)
      pins.push({ marker, sprite, line, world: top.clone() })
    } catch {
      /* skip broken avatar URL — still place a tip so lat/lng counts */
      try {
        const surface = latLngToVector3(marker.lat, marker.lng, RADIUS * 1.001)
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 12, 12),
          new THREE.MeshBasicMaterial({
            color: marker.channel === 'ecommerce' ? 0xf59e0b : 0x94a3b8,
          }),
        )
        tip.position.copy(surface)
        pinGroup.add(tip)
      } catch {
        /* ignore */
      }
    }
  }
}

function resize() {
  if (!rootEl.value || !renderer || !camera) return
  const width = rootEl.value.clientWidth
  const height = rootEl.value.clientHeight
  if (width < 2 || height < 2) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
}

function animate() {
  if (disposed || !renderer || !scene || !camera || !controls) return
  frame = requestAnimationFrame(animate)
  controls.update()

  // Hide pins on the far side of the globe
  const cameraDir = camera.position.clone().normalize()
  for (const pin of pins) {
    const world = pin.sprite.getWorldPosition(new THREE.Vector3()).normalize()
    const facing = world.dot(cameraDir) > 0.05
    pin.sprite.visible = facing
    pin.line.visible = facing
  }

  renderer.render(scene, camera)
}

async function init() {
  if (!canvasEl.value || !rootEl.value) return
  disposed = false
  failed.value = false
  failReason.value = ''
  ready.value = false

  try {
    const gl = canvasEl.value.getContext('webgl2') || canvasEl.value.getContext('webgl')
    if (!gl) {
      failed.value = true
      failReason.value = 'WebGL is unavailable in this browser.'
      return
    }

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.set(0, 0, RADIUS * 3.5)

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl.value,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)

    controls = new OrbitControls(camera, canvasEl.value)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = props.autoRotateSpeed > 0
    controls.autoRotateSpeed = props.autoRotateSpeed
    controls.minDistance = 5
    controls.maxDistance = 15

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(RADIUS * 5, RADIUS * 2, RADIUS * 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x88ccff, 0.35)
    fill.position.set(-RADIUS * 3, RADIUS, -RADIUS * 2)
    scene.add(fill)

    globeGroup = new THREE.Group()
    pinGroup = new THREE.Group()
    globeGroup.add(pinGroup)
    scene.add(globeGroup)

    const material = await loadEarthMaterial()
    const globe = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 64), material)
    globeGroup.add(globe)

    // Soft atmosphere shell
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.12, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4da6ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    )
    scene.add(atmosphere)

    await rebuildPins(props.markers.filter((marker) => Number.isFinite(marker.lat)))
    resize()
    animate()
    window.addEventListener('resize', resize)
    ready.value = true
  } catch (caught) {
    failed.value = true
    failReason.value = caught instanceof Error ? caught.message : 'Could not start the 3D globe.'
    teardown()
  }
}

function teardown() {
  disposed = true
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', resize)
  controls?.dispose()
  renderer?.dispose()
  controls = null
  renderer = null
  scene = null
  camera = null
  globeGroup = null
  pinGroup = null
  pins.length = 0
}

onMounted(() => {
  void init()
})

onBeforeUnmount(teardown)

watch(
  () => props.markers,
  (next) => {
    if (failed.value || !pinGroup) return
    void rebuildPins(next.filter((marker) => Number.isFinite(marker.lat)))
  },
  { deep: true },
)

watch(
  () => props.autoRotateSpeed,
  (speed) => {
    if (!controls) return
    controls.autoRotate = speed > 0
    controls.autoRotateSpeed = speed
  },
)

const statusLine = computed(() => {
  if (failed.value) return 'Globe unavailable'
  if (props.activeCount > 0) {
    return `${props.activeCount} live visitor${props.activeCount === 1 ? '' : 's'}`
  }
  return 'Waiting for live visitors'
})

const mappedCount = computed(
  () => props.markers.filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng)).length,
)
</script>

<template>
  <div :class="cn('relative mx-auto aspect-square w-full max-w-lg', props.class)">
    <div
      ref="rootEl"
      class="absolute inset-0 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#1a2744,transparent_55%),#0b1220]"
    >
      <canvas v-show="!failed" ref="canvasEl" class="h-full w-full touch-none" />
      <div
        v-if="failed"
        class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <p class="text-[0.875rem] font-medium text-white/90">3D globe could not load</p>
        <p class="text-[0.75rem] text-white/55">
          {{ failReason || 'Counters and visitor list still work below.' }}
        </p>
        <p v-if="mappedCount" class="mt-2 text-[0.8125rem] tabular-nums text-white/80">
          {{ mappedCount }} mapped location{{ mappedCount === 1 ? '' : 's' }} · {{ activeCount }} live
        </p>
      </div>
    </div>
    <div v-if="!failed" class="pointer-events-none absolute inset-x-0 bottom-3 px-3 text-center">
      <p class="text-[0.8125rem] font-medium text-white/95">{{ statusLine }}</p>
      <p class="text-[0.6875rem] text-white/60">
        <template v-if="mappedCount">
          {{ mappedCount }} mapped · avatar pins are real sessions
        </template>
        <template v-else>
          Globe ready — pins appear when live sessions have a country signal
        </template>
      </p>
      <p v-if="hovered" class="mt-1 text-[0.6875rem] text-white/80">{{ hovered.label }}</p>
      <p v-else-if="!ready" class="mt-1 text-[0.6875rem] text-white/45">Loading Earth…</p>
    </div>
  </div>
</template>

