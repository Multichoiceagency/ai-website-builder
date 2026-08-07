<script setup lang="ts">
import { computed } from 'vue'

/**
 * Curated semantic icons for option grids and block fields (motion presets,
 * style tiles, device/align/tone glyphs, the twelve block icons).
 *
 * App chrome (nav rail, toolbars, empty states) uses `@lucide/vue` /
 * `@heroicons/vue` instead — see `packages/ui/utils/icons.ts`. This component
 * stays a fixed path map so OptionGrid tiles never depend on a dynamic import
 * and so `@platform/ui` does not reach into `@platform/blocks-nuxt`.
 *
 * Everything here is drawn on a 24×24 grid at stroke 1.75 with round joins, so
 * it sits beside Lucide (`ICON_STROKE`) without looking like a second family.
 */
type IconPath = string | { d: string; dash: string }

const PATHS: Record<string, IconPath[]> = {
  // --- motion presets ------------------------------------------------------
  // A frame is the section; the cue says what happens to it.
  'motion-none': ['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M4.8 19.2 19.2 4.8'],
  // A circle whose second half is dashed — the conventional opacity glyph, and
  // the only one of these that stays legible at 18px. A half-dashed *square*
  // was tried first and read as a broken bracket.
  'motion-fade': ['M12 3a9 9 0 0 1 0 18', { d: 'M12 3a9 9 0 0 0 0 18', dash: '2.5 2.5' }],
  'motion-fade-up': ['M5 3h14v9H5z', 'M12 21v-6', 'M9.5 17.5 12 15l2.5 2.5'],
  'motion-fade-down': ['M5 12h14v9H5z', 'M12 3v6', 'M9.5 6.5 12 9l2.5-2.5'],
  'motion-slide-left': ['M4 5h9v14H4z', 'M22 12h-5', 'M19.5 9.5 17 12l2.5 2.5'],
  'motion-slide-right': ['M11 5h9v14h-9z', 'M2 12h5', 'M4.5 9.5 7 12l-2.5 2.5'],
  'motion-scale': ['M8 8h8v8H8z', 'M4 9V4h5', 'M20 15v5h-5'],
  'motion-blur': ['M4 7h16', { d: 'M4 12h16', dash: '4 2.5' }, { d: 'M4 17h16', dash: '1.5 2.5' }],
  'motion-stagger': ['M3 6h8', 'M7 12h10', 'M11 18h8'],
  'motion-hero': [
    'M4 4h16v16H4z',
    'm12 8.5 1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z',
  ],
  'motion-product': ['M12 2 3 7v10l9 5 9-5V7z', 'M3 7l9 5 9-5', 'M12 12v10'],

  // --- motion triggers -----------------------------------------------------
  'trigger-viewport': ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'trigger-load': ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 4v5h-5'],
  'trigger-never': ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M5.6 5.6 18.4 18.4'],

  // --- breakpoints ---------------------------------------------------------
  'device-mobile': ['M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18.5h2'],
  'device-tablet': ['M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11.25 18.5h1.5'],
  'device-desktop': ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],

  // --- alignment -----------------------------------------------------------
  'align-left': ['M3 6h18', 'M3 12h10', 'M3 18h14'],
  'align-center': ['M3 6h18', 'M7 12h10', 'M5 18h14'],
  'align-right': ['M3 6h18', 'M11 12h10', 'M7 18h14'],

  // --- surface tone --------------------------------------------------------
  'tone-light': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
  'tone-muted': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', { d: 'M6 15 15 6', dash: '2.5 2.5' }],
  'tone-primary': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z'],
  'tone-dark': ['M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5a8.5 8.5 0 1 0 11.3 11.3z'],

  // --- style directions ----------------------------------------------------
  'style-auto': ['m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z', 'M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  'style-modern': ['M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z', 'M9 11h6', 'M9 15h4'],
  'style-minimal': ['M4 9h16', 'M4 15h9'],
  'style-premium': ['M12 3 21 12l-9 9-9-9z', 'M12 8.5 15.5 12 12 15.5 8.5 12z'],
  // A display "A" rather than a slashed square: the slashed square was almost
  // indistinguishable from `motion-none` at tile size.
  'style-bold': ['M5 20 12 4l7 16', 'M8.5 15h7'],
  'style-editorial': ['M4 4h7v16H4z', 'M14 5h6', 'M14 9h6', 'M14 13h6', 'M14 17h4'],

  // --- speed & intensity ---------------------------------------------------
  'speed-slow': ['M9 6l6 6-6 6'],
  'speed-medium': ['M5 6l6 6-6 6', 'M13 6l6 6-6 6'],
  'speed-fast': ['M2 6l5 6-5 6', 'M9.5 6l5 6-5 6', 'M17 6l5 6-5 6'],
  'intensity-subtle': ['M3 12h4l2-2.5 2 5 2-2.5h8'],
  'intensity-pronounced': ['M3 12h3l2-7 3 14 2-7h8'],

  // --- block icon set (mirrors Block/Icon.vue + ICON_NAMES) -----------------
  check: ['M20 6 9 17l-5-5'],
  bolt: ['M13 2 3 14h8l-1 8 10-12h-8l1-8z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  clock: ['M12 6v6l4 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
  star: ['m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1z'],
  phone: [
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z',
  ],
  mail: ['M4 4h16v16H4z', 'M22 6l-10 7L2 6'],
  pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  wrench: ['M14.7 6.3a4 4 0 0 0 5 5l-9.3 9.3a2.8 2.8 0 0 1-4-4L15.7 7.3z', 'M14.7 6.3 17 4'],
  chart: ['M3 3v18h18', 'M7 15l4-5 3 3 5-7'],
  sparkles: [
    'm12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z',
    'M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  ],
  truck: ['M1 3h15v13H1z', 'M16 8h4l3 3v5h-7z', 'M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M18.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  heart: ['M19 14c1.5-1.5 2-3 2-4.5A4.5 4.5 0 0 0 12 6a4.5 4.5 0 0 0-9 3.5c0 1.5.5 3 2 4.5l7 7z'],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  building: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z', 'M6 12h12', 'M10 6h4', 'M10 10h4', 'M10 14h4', 'M10 18h4'],
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-6h6v6'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20', 'M12 2a15 15 0 0 0 0 20'],
  map: ['M14.5 4.5 9.5 7l-5-2.5v14.5l5 2.5 5-2.5 5 2.5V4.5l-5-2.5z', 'M9.5 7v14.5', 'M14.5 4.5v14.5'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  camera: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  ],
  image: [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M21 15l-5-5L5 21',
  ],
  play: ['M6 4.5v15l13-7.5z'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  settings: [
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  ],
  briefcase: [
    'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  ],
  award: ['M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M8.2 13.5 7 22l5-2 5 2-1.2-8.5'],
  target: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
    'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],
  compass: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M16.2 7.8l-2.4 6-6 2.4 2.4-6z'],
  layers: ['M12 2 2 7l10 5 10-5z', 'M2 12l10 5 10-5', 'M2 17l10 5 10-5'],
  code: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
  'credit-card': ['M2 7h20v12H2z', 'M2 11h20', 'M6 16h4'],
  package: [
    'M16.5 9.4 7.5 4.2',
    'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z',
    'M3.3 7 12 12l8.7-5',
    'M12 22V12',
  ],
  'thumbs-up': [
    'M7 10v12',
    'M15 5.9A2.4 2.4 0 0 0 12.6 4c-.8 0-1.5.4-1.9 1.1L8 10H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-1.7l1.4-8A2 2 0 0 0 18.2 8H15',
  ],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  lock: ['M7 11V7a5 5 0 0 1 10 0v4', 'M5 11h14v10H5z'],
  key: ['M21 2l-2 2m-7.6 7.6A4.5 4.5 0 1 1 6.4 6.4a4.5 4.5 0 0 1 5 5z', 'M11 11l9 9', 'M16.5 15.5 19 18'],
  headphones: [
    'M3 14v-3a9 9 0 0 1 18 0v3',
    'M21 16a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z',
    'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  send: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4z'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  'shopping-cart': [
    'M1 1h3l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 5H6',
    'M9.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    'M18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  ],
  car: ['M5 17h14v-5l-2-5H7L5 12z', 'M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M5 12h14'],
  plane: [
    'M17.8 19.2 16 11l5.5-4.2c.4-.3.2-1-.3-1L4 8.5 2.3 6.7A1 1 0 0 0 .8 7.4l1.5 5.1L16 15l-1.2 4.4a1 1 0 0 0 1.5 1.1l1.5-1.3z',
  ],
  lightbulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z'],
  rocket: [
    'M4.5 16.5c-1.5 1.3-2 3.5-2 3.5s2.2-.5 3.5-2c.3-.3.5-.7.5-1.1a1.5 1.5 0 0 0-1.5-1.5c-.4 0-.8.2-1.1.5z',
    'M12 15l-3-3a22 22 0 0 1 2-9.95A12.8 12.8 0 0 1 22 2c0 2.7-.8 6.5-2.95 9A22 22 0 0 1 12 15z',
    'M9 12H4s.5-1 2-2c1.4-.9 2.5-.9 2.5-.9',
    'M15 12v5s1 .5 2 2c1 1.4 1 2.5 1 2.5',
  ],
  leaf: ['M11 20A7 7 0 0 1 9.2 6.5C14 4 20 5 22 12c0 0-1.5 2-5 2a7 7 0 0 1-6-6', 'M2 21c0-3 1.9-6 5.5-8'],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1.5-3C9 10 8 11 8 12.5a2.5 2.5 0 0 0 .5 2z',
    'M12 2c1.5 3 3.5 4.5 3.5 8a5.5 5.5 0 1 1-11 0c0-2 1.5-4 3.5-6 .5 2 1.5 3 2.5 3.5.5-1.5 1-2.5 1.5-3.5z',
  ],
  handshake: [
    'M11 17l2 2a1 1 0 1 0 1.4-1.4l-2-2',
    'M16 14.5 14 16.5a1 1 0 0 1-1.4 0L10 14',
    'M3 10l4-4a2.1 2.1 0 0 1 3 0l2 2',
    'M21 10l-4-4a2.1 2.1 0 0 0-3 0l-1 1',
    'M8 14l-2.5 2.5A2.1 2.1 0 0 0 8.5 19.5L11 17',
    'M16 14l2.5 2.5a2.1 2.1 0 0 1-3 3L13 17',
  ],
  wifi: ['M12 20h.01', 'M2 8.8a16 16 0 0 1 20 0', 'M5.5 12.5a11 11 0 0 1 13 0', 'M9 16a6 6 0 0 1 6 0'],
  refresh: ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v5h-5'],

  // Fallback. Deliberately plain and obviously wrong-looking in a tile grid, so
  // a typo in an icon name is spotted in review rather than shipped invisibly.
  dot: ['M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
}

/**
 * `name` is a plain string rather than a union: components auto-import across
 * Nuxt layers but types do not, so a union here would not actually be checked
 * at the call sites in `apps/dashboard`. Unknown names fall back to `dot`.
 */
const props = withDefaults(defineProps<{ name: string; class?: string }>(), { class: '' })

const paths = computed(() => PATHS[props.name] ?? PATHS.dot!)

function d(path: IconPath): string {
  return typeof path === 'string' ? path : path.d
}

function dash(path: IconPath): string | undefined {
  return typeof path === 'string' ? undefined : path.dash
}
</script>

<template>
  <svg
    :class="props.class"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(path, index) in paths" :key="index" :d="d(path)" :stroke-dasharray="dash(path)" />
  </svg>
</template>
