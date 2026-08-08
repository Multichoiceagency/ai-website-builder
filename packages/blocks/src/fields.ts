import { z } from 'zod'
import type { BlockField } from '@platform/schemas'

/**
 * Shared prop primitives. Every one carries a default — see `defineBlock`.
 */
export const text = (fallback = '') => z.string().max(400).default(fallback)
export const longText = (fallback = '') => z.string().max(4000).default(fallback)
export const href = (fallback = '') => z.string().max(2048).default(fallback)
export const imageUrl = (fallback = '') => z.string().max(2048).default(fallback)
export const bool = (fallback = false) => z.boolean().default(fallback)
export const count = (fallback = 0) => z.number().default(fallback)

/**
 * The icon set renderers can draw. Lucide-aligned names, inline SVG only — a
 * block never pulls an icon font or a network request into a landing page.
 * Keep in sync with `packages/blocks-nuxt/components/Block/Icon.vue` and the
 * matching entries in `packages/ui/components/Ui/Icon.vue`.
 */
export const ICON_NAMES = [
  'check',
  'bolt',
  'shield',
  'clock',
  'star',
  'phone',
  'mail',
  'pin',
  'wrench',
  'chart',
  'sparkles',
  'truck',
  'heart',
  'users',
  'user',
  'building',
  'home',
  'globe',
  'map',
  'calendar',
  'message',
  'camera',
  'image',
  'play',
  'arrow-right',
  'arrow-up-right',
  'plus',
  'search',
  'settings',
  'briefcase',
  'award',
  'target',
  'compass',
  'layers',
  'code',
  'credit-card',
  'package',
  'thumbs-up',
  'eye',
  'lock',
  'key',
  'headphones',
  'send',
  'bookmark',
  'flag',
  'download',
  'shopping-cart',
  'car',
  'plane',
  'lightbulb',
  'rocket',
  'leaf',
  'flame',
  'handshake',
  'wifi',
  'refresh',
] as const
export type IconName = (typeof ICON_NAMES)[number]

const ICON_NAME_SET = new Set<string>(ICON_NAMES)

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && ICON_NAME_SET.has(value)
}

export const icon = (fallback: IconName = 'check') => z.enum(ICON_NAMES).default(fallback)

export const iconOptions = ICON_NAMES.map((name) => ({
  label: name
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' '),
  value: name,
}))

/** Common editor field descriptors, so blocks stay declarative. */
export const field = {
  text: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'text',
    ...extra,
  }),
  textarea: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'textarea',
    ...extra,
  }),
  url: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'url',
    ...extra,
  }),
  image: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'image',
    ...extra,
  }),
  /** Alias of `image` — MediaField / MediaPicker in the section form. */
  media: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'media',
    ...extra,
  }),
  boolean: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'boolean',
    ...extra,
  }),
  icon: (key: string, label: string, extra: Partial<BlockField> = {}): BlockField => ({
    key,
    label,
    type: 'icon',
    ...extra,
  }),
  select: (
    key: string,
    label: string,
    options: { label: string; value: string }[],
    extra: Partial<BlockField> = {},
  ): BlockField => ({ key, label, type: 'select', options, ...extra }),
  items: (
    key: string,
    label: string,
    itemFields: BlockField['itemFields'],
    extra: Partial<BlockField> = {},
  ): BlockField => ({ key, label, type: 'items', itemFields, ...extra }),
}

export const ALIGN_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
]

/** Header chrome layouts: logo/nav/cta arrangement. */
export const HEADER_LAYOUT_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Centre', value: 'center' },
  { label: 'Split', value: 'split' },
]

export const TONE_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Muted', value: 'muted' },
  { label: 'Primary', value: 'primary' },
  { label: 'Dark', value: 'dark' },
]

export const toneSchema = z.enum(['light', 'muted', 'primary', 'dark'])
