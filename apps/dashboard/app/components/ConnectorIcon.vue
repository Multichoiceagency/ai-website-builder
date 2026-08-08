<script setup lang="ts">
import { computed } from 'vue'
import { Plug } from '@lucide/vue'

/**
 * Brand marks for connector / payment / app catalog IDs.
 * Monochrome SVG paths (Simple Icons–style) so every tile has a visible icon
 * without pulling a large icon package.
 */

interface BrandMark {
  path: string
  /** Accent behind the mark */
  tint: string
}

const MARKS: Record<string, BrandMark> = {
  google: {
    path: 'M12 11.5v2.9h7.1c-.3 1.8-2.1 5.2-7.1 5.2-4.3 0-7.8-3.5-7.8-7.8S7.7 4 12 4c2.4 0 4.1 1 5 1.9l2.4-2.3C17.7 1.9 15.1.7 12 .7 6.2.7 1.5 5.4 1.5 11.2S6.2 21.7 12 21.7c6.1 0 10.1-4.3 10.1-10.3 0-.7-.1-1.2-.2-1.7H12z',
    tint: '#e8f0fe',
  },
  'google-calendar': {
    path: 'M7.5 3.5v1.2H5.8c-.7 0-1.3.6-1.3 1.3v12.2c0 .7.6 1.3 1.3 1.3h12.4c.7 0 1.3-.6 1.3-1.3V6c0-.7-.6-1.3-1.3-1.3h-1.7V3.5h-1.8v1.2H9.3V3.5H7.5zM5.8 9.2h12.4v9H5.8v-9zm2.2 1.8v1.8h1.8V11H8zm3.2 0v1.8h1.8V11H11.2zm3.2 0v1.8H16V11h-1.6zM8 14.2v1.8h1.8v-1.8H8zm3.2 0v1.8h1.8v-1.8H11.2z',
    tint: '#e8f0fe',
  },
  gmail: {
    path: 'M20 18h-1.5V9.2L12 13.6 5.5 9.2V18H4V6h1.3L12 11.1 18.7 6H20v12z',
    tint: '#fce8e6',
  },
  slack: {
    path: 'M6 15.5A2.5 2.5 0 1 1 3.5 13H6v2.5zm.8 0A2.5 2.5 0 1 1 9.3 18V15.5H6.8zm0-8.3H9.3V4.7A2.5 2.5 0 1 0 6.8 7.2zm8.2 0A2.5 2.5 0 1 0 17.5 4.7v2.5H15zm0 0V9.7H17.5A2.5 2.5 0 1 0 15 7.2zm0 8.3h2.5A2.5 2.5 0 1 1 15 18v-2.5zm-8.2 0V15.5H4.3A2.5 2.5 0 1 0 6.8 18zm8.2-8.3H12.5V4.7A2.5 2.5 0 1 1 15 7.2zM9.3 9.7H6.8V7.2h2.5V9.7zm0 5.8H6.8v-2.5h2.5v2.5zm5.7 0H12.5v-2.5H15v2.5zm0-5.8H12.5V7.2H15V9.7z',
    tint: '#f4ebf7',
  },
  stripe: {
    path: 'M13.5 10.3c0-.8-.6-1.1-1.7-1.1-1.5 0-3.4.5-4.9 1.3V6.2C8.5 5.5 10.5 5 12.4 5c3.5 0 5.8 1.8 5.8 4.9v6.6h-2.9v-1.5c-1.2 1.1-2.9 1.8-4.9 1.8-3.1 0-5.1-1.8-5.1-4.6 0-2.9 2.4-4.6 6.2-4.6.7 0 1.3.1 1.9.2v2.5zm-2.8 4.3c1.5 0 2.6-.7 2.6-1.9v-1.3c-.5-.1-1-.2-1.6-.2-1.6 0-2.5.7-2.5 1.7 0 1 .8 1.7 1.5 1.7z',
    tint: '#ebe8ff',
  },
  mollie: {
    path: 'M4.2 7.2c0-.7.5-1.2 1.2-1.2h2.1c.6 0 1 .3 1.3.8l2.4 4.6 2.4-4.6c.3-.5.7-.8 1.3-.8h2.1c.7 0 1.2.5 1.2 1.2v9.6c0 .7-.5 1.2-1.2 1.2h-1.5c-.7 0-1.2-.5-1.2-1.2V11l-2.1 3.9c-.3.5-.7.8-1.3.8h-.6c-.6 0-1-.3-1.3-.8L7.1 11v5.8c0 .7-.5 1.2-1.2 1.2H4.4c-.7 0-1.2-.5-1.2-1.2V7.2zm14.2-.2c1.8 0 3.1 1.1 3.1 2.7s-1.3 2.7-3.1 2.7h-1.1v2.6c0 .7-.5 1.2-1.2 1.2h-1.4c-.7 0-1.2-.5-1.2-1.2V7.2c0-.7.5-1.2 1.2-1.2h3.7zm-.3 3.7c.5 0 .9-.3.9-.8s-.4-.8-.9-.8h-1.1v1.6h1.1z',
    tint: '#e8f7f3',
  },
  paypal: {
    path: 'M7.2 19.5 8 14.3h2.3c3.4 0 5.7-1.5 6.3-4.5.1-.4.1-.8.1-1.1 0-.2 0-.4-.1-.6H20c.3 1.5-.1 3.4-1.3 4.8-1.4 1.7-3.6 2.5-6.3 2.5H10l-.7 4.1H7.2zm1.6-7.8.9-5.4h2.4c2.3 0 3.7.9 3.4 3-.3 2.2-1.9 2.4-4.1 2.4H8.8z',
    tint: '#e7f0fb',
  },
  shopify: {
    path: 'M15.3 4.4c-.1 0-.3-.1-.4-.1s-.4.1-.5.3c-.1.1-1.9 4.7-2 4.9-.4-.1-1.1-.2-1.8-.2-1.5 0-2.3.4-2.4.4l-.2-.1C7.8 5.3 6.8 3.3 6.7 3.2c-.1-.2-.3-.3-.5-.3H4.1c-.3 0-.5.2-.5.5 0 .1 1.7 14.4 1.8 14.8.1.4.4.9 1.1 1.1 1 .3 2.9.8 4.4.8 1.7 0 2.8-.4 3-.4.2 0 .4-.1.5-.3.6-1.9 2.7-10.4 2.8-10.6.1-.3-.1-.5-.4-.6l-1.5-.8zM9.6 14.6s-.6-.3-.6-1.3c0-1.6 1.7-2.1 1.7-2.1s1.1.1 1.7.4c0 0-1.8 3.9-2.8 3z',
    tint: '#e3f7e8',
  },
  woocommerce: {
    path: 'M4.2 7.2h2.1l1.5 7.4L10.2 7h2.1l2.3 7.6 1.6-7.4h2.1L15.5 17H13l-2.3-7.2L8.4 17H6L4.2 7.2zm13.1 0h2.2v9.8h-2.2V7.2z',
    tint: '#f3e8ff',
  },
  bigcommerce: {
    path: 'M5 6.5h14v2.2H5V6.5zm0 4.4h14v2.2H5v-2.2zm0 4.4h9.5V17.5H5v-2.2z',
    tint: '#e8f0ff',
  },
  hubspot: {
    path: 'M18.2 11.3V7.7a2.1 2.1 0 0 0 1.2-1.9 2.1 2.1 0 1 0-4.2 0c0 .7.4 1.4 1 1.8v3.5a5 5 0 0 0-2.7 1.3l-5.2-4.1a2.3 2.3 0 1 0-1 .9l5.1 4a5 5 0 1 0 7.8-1.9zM5.5 8.1a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7.7 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z',
    tint: '#ffe8de',
  },
  meta: {
    path: 'M16.5 5.2c-1.6 0-2.9.9-3.7 2.4-.5-.9-1.1-1.6-1.9-2.1C10 4.9 8.9 4.6 7.7 4.6 4.9 4.6 2.5 7.3 2.5 12c0 3.5 1.5 7.4 4.1 7.4 1.1 0 2-.6 2.9-1.9.4-.6 1.6-3.1 2.1-4.2.3.6.8 1.7 1.2 2.5.9 1.8 1.8 2.9 3.1 2.9 2.6 0 4.6-3.9 4.6-7.4 0-3.8-2-5.9-4-5.9zm-6.6 8.9c-.7 1.4-1.4 2-2 2-.9 0-1.7-2.1-1.7-4.7 0-2.9 1.1-4.4 2.4-4.4.6 0 1.2.3 1.8 1.1.3.4 1.6 3.1 1.9 3.8-.7 1.4-1.6 2.2-2.4 2.2zm6.4 2c-.7 0-1.3-.8-2-2.1-.4-.8-1.4-3.1-1.7-3.9.6-1.3 1.6-3.4 2.5-3.4 1.2 0 2.5 1.6 2.5 4.4 0 2.7-.8 5-1.3 5z',
    tint: '#e7f0ff',
  },
  mailchimp: {
    path: 'M12 2.5C7.3 2.5 3.5 5.8 3.5 10.2c0 2.1.9 3.9 2.4 5.2v4.1l3.1-1.7c.9.2 1.9.4 3 .4 4.7 0 8.5-3.3 8.5-7.7S16.7 2.5 12 2.5zm-.2 11.6c-2.4 0-4.1-1.4-4.1-3.5 0-.4.1-.7.3-1l.9.5c-.1.2-.2.4-.2.7 0 1.2 1.1 2 3.1 2 1.9 0 3-.9 3-2.1 0-.8-.5-1.3-1.6-1.7l-.9-.3c-1.6-.6-2.4-1.4-2.4-2.7 0-1.7 1.5-2.9 3.6-2.9 2.1 0 3.5 1.1 3.7 2.7l-1.1.3c-.2-1-.9-1.7-2.5-1.7-1.4 0-2.3.7-2.3 1.6 0 .7.4 1.1 1.5 1.5l.9.3c1.8.7 2.6 1.5 2.6 3 0 1.9-1.6 3.2-4.5 3.2z',
    tint: '#fff3d6',
  },
  notion: {
    path: 'M4.5 4.2c.4-.4 1-.6 1.9-.6h11.4c.3 0 .6.1.8.3l1.4 1.3c.2.2.3.4.3.7v12.4c0 .5-.2.9-.6 1.1l-2.2 1.2c-.3.2-.6.2-.9.1L5.8 19c-.5-.1-.9-.5-.9-1.1V5.1c0-.4.2-.7.6-.9zm3.2 2.6v9.6l7.4 1.1V7.4L7.7 6.8zm1.9 1.5h1.5v6.4H9.6V8.3zm3.2.4 1.6.2v5.7l-1.6-.3V8.7z',
    tint: '#f0f0ee',
  },
  airtable: {
    path: 'M11.4 3.2 2.6 7.4l8.8 4.2 8.8-4.2-8.8-4.2zm.6 9.3v8.3l8.4-4.2V8.3L12 12.5zM3 8.5v8.1l8.2 4.1v-8.3L3 8.5z',
    tint: '#ffe8e8',
  },
  linkedin: {
    path: 'M6.5 9.2H3.7V20h2.8V9.2zM5.1 4C4 4 3.2 4.8 3.2 5.9S4 7.8 5.1 7.8s1.9-.8 1.9-1.9S6.2 4 5.1 4zM20.3 13.3c0-3.2-1.7-4.6-4-4.6-1.8 0-2.7.9-3.2 1.6V9.2h-2.8c0 .8 0 10.8 0 10.8h2.8v-6c.1-.4.3-1 1-1 1 0 1.4.7 1.4 1.9V20h2.8v-6.7z',
    tint: '#e1effa',
  },
  salesforce: {
    path: 'M10 6.2c.8-.7 1.9-1.1 3.1-1.1 1.6 0 3 .8 3.8 2 .7-.3 1.5-.5 2.3-.5 2.4 0 4.3 1.8 4.3 4.1 0 2.3-1.9 4.1-4.3 4.1-.3 0-.6 0-.9-.1-.7 1.5-2.2 2.5-4 2.5-1 0-1.9-.3-2.6-.9-.8.9-2 1.4-3.3 1.4-1.8 0-3.3-1.1-3.9-2.6-.3.1-.7.1-1 .1C2.2 15.2.5 13.5.5 11.4c0-1.9 1.4-3.4 3.2-3.6.4-1.9 2.1-3.3 4.1-3.3 1 0 1.8.3 2.5.7z',
    tint: '#dceefc',
  },
  intercom: {
    path: 'M5 5.5h14c.8 0 1.5.7 1.5 1.5v8.2c0 .8-.7 1.5-1.5 1.5H13l-3.2 3.1v-3.1H5c-.8 0-1.5-.7-1.5-1.5V7c0-.8.7-1.5 1.5-1.5zm1.8 3.2v4.6h1.5V8.7H6.8zm3.2 0v4.6h1.5V8.7H10zm3.2 0v4.6h1.5V8.7H13.2zm3.2 0v4.6H18V8.7h-1.6z',
    tint: '#e6f4ff',
  },
  zendesk: {
    path: 'M3.5 4.5h8.2v6.2L3.5 19.5V4.5zm17 15h-8.2v-6.2l8.2-8.8v15z',
    tint: '#e8f7ef',
  },
  pipedrive: {
    path: 'M6.5 4.5h5.2c3.3 0 5.5 1.9 5.5 4.9 0 2.4-1.3 4.1-3.4 4.8l3.9 5.3h-3.5l-3.5-4.9H9.2v4.9H6.5V4.5zm2.7 2.4v4.7h2.4c1.8 0 2.9-.9 2.9-2.4s-1.1-2.3-2.9-2.3H9.2z',
    tint: '#e6f7ef',
  },
  klaviyo: {
    path: 'M4.5 4.5h4.2L16 12l-7.3 7.5H4.5L11.7 12 4.5 4.5zm10.2 0H19.5L12.8 12l6.7 7.5h-4.8L8.5 12l6.2-7.5z',
    tint: '#efe8ff',
  },
  whatsapp: {
    path: 'M12 3.5c-4.7 0-8.5 3.7-8.5 8.4 0 1.5.4 2.9 1.1 4.1L3.5 20.5l4.7-1.2c1.2.6 2.5 1 3.8 1 4.7 0 8.5-3.8 8.5-8.4S16.7 3.5 12 3.5zm4.7 11.9c-.2.6-1.1 1-1.5 1.1-.4.1-.9.1-1.4 0-.3-.1-.7-.2-1.2-.4-2.1-.9-3.5-3.1-3.6-3.2-.1-.1-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4.2.5.6 1.5.6 1.6.1.1.1.3 0 .4l-.3.4c-.1.1-.2.3-.1.5.1.2.4.7.9 1.2.6.6 1.2.8 1.4.9.2.1.4.1.5 0l.7-.8c.1-.2.3-.2.5-.1l1.4.7c.2.1.3.1.4.2.1.2.1.9-.1 1.5z',
    tint: '#e4f8ec',
  },
  'tiktok-ads': {
    path: 'M16.5 5.2c.9 1 2.1 1.7 3.5 1.9V9c-1.2 0-2.3-.3-3.3-.9v5.5c0 3.2-2.6 5.7-5.8 5.7S5.1 16.8 5.1 13.6s2.6-5.7 5.8-5.7c.3 0 .6 0 .9.1v2.5c-.3-.1-.6-.1-.9-.1-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2 3.2-1.4 3.2-3.2V3.5h2.4c0 .6.2 1.2.5 1.7z',
    tint: '#f2f2f2',
  },
  x: {
    path: 'M4.5 5h4l3.6 5.1L16.8 5H19.5l-5.5 7.2L19.8 19h-4l-4-5.6L7.2 19H4.5l5.8-7.6L4.5 5z',
    tint: '#f0f0f0',
  },
}

/** Nango unique keys / payment aliases → catalog mark id */
const ALIASES: Record<string, string> = {
  facebook: 'meta',
  instagram: 'meta',
  twitter: 'x',
  'google-mail': 'gmail',
  'google_mail': 'gmail',
  'whatsapp-business': 'whatsapp',
  whatsapp_business: 'whatsapp',
  'google-pay': 'google',
  google_pay: 'google',
  tiktok: 'tiktok-ads',
}

function resolveMarkId(raw: string): string {
  const key = raw.trim().toLowerCase()
  if (!key) return key
  if (MARKS[key]) return key
  if (ALIASES[key]) return ALIASES[key]!
  // Marketplace slugs like "stripe-checkout" / "meta-ads" (skip short ids e.g. "x")
  const ids = Object.keys(MARKS).sort((a, b) => b.length - a.length)
  for (const id of ids) {
    if (id.length < 3) continue
    if (key.startsWith(`${id}-`) || key.endsWith(`-${id}`) || key.includes(`-${id}-`)) {
      return id
    }
  }
  return key
}

const props = withDefaults(
  defineProps<{
    id: string
    /** Optional accessible name; decorative by default when nested in a labelled card. */
    label?: string
    size?: 'sm' | 'md'
  }>(),
  { label: undefined, size: 'md' },
)

const mark = computed(() => MARKS[resolveMarkId(props.id)] ?? null)
const boxClass = computed(() => (props.size === 'sm' ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl'))
const svgClass = computed(() => (props.size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'))
</script>

<template>
  <span
    class="grid shrink-0 place-items-center text-ink"
    :class="boxClass"
    :style="{ background: mark?.tint ?? 'linear-gradient(135deg, #f4f0ea, #e8eef5)' }"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : true"
    role="img"
  >
    <svg
      v-if="mark"
      :class="svgClass"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path :d="mark.path" />
    </svg>
    <Plug v-else :class="svgClass" :stroke-width="1.75" />
  </span>
</template>
