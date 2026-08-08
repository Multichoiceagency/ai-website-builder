<script setup lang="ts">
import { computed, provide } from 'vue'
import {
  resolveContentWidthCss,
  type PublicPage,
  type Theme,
  type ThemeTokens,
} from '@platform/schemas'

const route = useRoute()
const config = useRuntimeConfig()

/**
 * The hostname is the tenant key. On the server it comes from the request;
 * in the browser it comes from the address bar. Never from a query parameter —
 * that would let anyone request any tenant's site.
 *
 * Locally, `127.0.0.1` / `[::1]` are treated as `localhost` so the seeded
 * demo domain resolves whether you open localhost:3001 or 127.0.0.1:3001.
 */
const requestHeaders = useRequestHeaders(['host', 'x-forwarded-host'])
const host = computed(() => {
  const raw = import.meta.client
    ? window.location.host
    : (requestHeaders['x-forwarded-host'] ?? requestHeaders.host ?? 'localhost')
  const hostname = raw.split(':')[0]!.toLowerCase()
  if (hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') return 'localhost'
  return hostname || 'localhost'
})

const path = computed(() => {
  const slug = route.params.slug
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : []
  return parts.length ? `/${parts.join('/')}` : '/'
})

const { data, error } = await useFetch<{ success: true; data: PublicPage }>(
  '/public/pages',
  {
    key: () => `page:${host.value}:${path.value}`,
    query: computed(() => ({ host: host.value, path: path.value })),
  },
)

if (error.value || !data.value?.data) {
  const statusCode = error.value?.statusCode ?? error.value?.status ?? 404
  const apiDown = statusCode === 0 || statusCode >= 500
  throw createError({
    statusCode: apiDown ? 503 : 404,
    statusMessage: apiDown
      ? 'Storefront could not reach the API. Is core-api running on :4000?'
      : `No published page for ${host.value}${path.value}. In the dashboard open Website → Pages and click Publish (drafts are not public). Then open http://${host.value}:3001${path.value}`,
    fatal: true,
  })
}

const page = computed(() => data.value!.data)

provide(
  'platformBrandLogo',
  computed(() => page.value.site.logo?.trim() ?? ''),
)

const RADIUS: Record<Theme['radius'], string> = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
}

/**
 * Only `#rrggbb` reaches the stylesheet.
 *
 * These values arrive as JSON from the API rather than through a Zod parse, and
 * they are interpolated into a `<style>` block rather than set through Vue's
 * style binding — so the escaping the binding would have done has to happen
 * here instead. Anything that is not a plain hex colour is dropped.
 */
const HEX = /^#[0-9a-fA-F]{6}$/
function color(value: string | null | undefined, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}

/**
 * Fallbacks for a theme stored before the palette system existed.
 *
 * Tokens that already existed reproduce exactly what this page emitted before:
 * the same OKLab mix for the divider, the same `#ffffff` that blocks used to
 * hard-code on a primary fill. Tokens that did not exist — the strong line, the
 * status trio — take a value chosen to clear WCAG AA, because a default nobody
 * set should not be a default that fails. These mirror the constants in
 * `@platform/theming`'s `resolveLightTokens`; keep the two in step.
 */
function lightVariables(theme: Theme): Record<string, string> {
  const surface = color(theme.colorSurface, '#ffffff')
  const text = color(theme.colorText, '#18181b')
  const primary = color(theme.colorPrimary, '#1d4ed8')
  const accent = color(theme.colorAccent, '#0f766e')

  return {
    '--site-surface': surface,
    '--site-surface-alt': color(theme.colorSurfaceAlt, '#f5f5f4'),
    '--site-surface-sunken': color(theme.colorSurfaceSunken, `color-mix(in oklab, ${text} 5%, ${surface})`),
    '--site-text': text,
    '--site-text-muted': color(theme.colorTextMuted, '#52525b'),
    '--site-line': color(theme.colorLine, `color-mix(in oklab, ${text} 13%, ${surface})`),
    '--site-line-strong': color(theme.colorLineStrong, `color-mix(in oklab, ${text} 48%, ${surface})`),
    '--site-primary': primary,
    '--site-primary-hover': color(theme.colorPrimaryHover, `color-mix(in oklab, ${primary} 86%, #000000)`),
    '--site-primary-ink': color(theme.colorPrimaryInk, '#ffffff'),
    '--site-accent': accent,
    '--site-accent-ink': color(theme.colorAccentInk, '#ffffff'),
    '--site-positive': color(theme.colorPositive, '#15803d'),
    '--site-warning': color(theme.colorWarning, '#b45309'),
    '--site-danger': color(theme.colorDanger, '#b91c1c'),
    '--site-focus': color(theme.colorFocus, primary),
  }
}

function darkVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--site-surface': color(tokens.surface, '#101014'),
    '--site-surface-alt': color(tokens.surfaceAlt, '#18181b'),
    '--site-surface-sunken': color(tokens.surfaceSunken, '#0b0b0e'),
    '--site-text': color(tokens.text, '#fafafa'),
    '--site-text-muted': color(tokens.textMuted, '#a1a1aa'),
    '--site-line': color(tokens.line, '#27272a'),
    '--site-line-strong': color(tokens.lineStrong, '#3f3f46'),
    '--site-primary': color(tokens.primary, '#60a5fa'),
    '--site-primary-hover': color(tokens.primaryHover, '#93c5fd'),
    '--site-primary-ink': color(tokens.primaryInk, '#0b0b0e'),
    '--site-accent': color(tokens.accent, '#5eead4'),
    '--site-accent-ink': color(tokens.accentInk, '#0b0b0e'),
    '--site-positive': color(tokens.positive, '#4ade80'),
    '--site-warning': color(tokens.warning, '#fbbf24'),
    '--site-danger': color(tokens.danger, '#f87171'),
    '--site-focus': color(tokens.focus, '#60a5fa'),
  }
}

const theme = computed(() => page.value.site.theme)
const darkTokens = computed(() => theme.value.dark ?? null)

function declarations(variables: Record<string, string>): string {
  const lines = Object.entries(variables).map(([name, value]) => `${name}:${value}`)
  return [...lines, `background-color:${variables['--site-surface']}`, `color:${variables['--site-text']}`].join(';')
}

/**
 * Colours ship as a stylesheet, not as inline styles.
 *
 * `prefers-color-scheme` needs a media query, and a media query cannot beat a
 * `style` attribute — so a dark theme delivered inline would never apply. The
 * attribute selectors keep specificity at (0,2,0), well below anything a block
 * declares, and the whole thing is server-rendered so there is no flash.
 */
const themeCss = computed(() => {
  const light = declarations(lightVariables(theme.value))
  const rules = [`[data-site-theme]{${light}}`]

  const dark = darkTokens.value
  if (dark) {
    const declared = declarations(darkVariables(dark))
    rules.push(`[data-site-theme][data-site-mode="dark"]{${declared}}`)
    rules.push(
      `@media (prefers-color-scheme:dark){[data-site-theme][data-site-mode="system"]{${declared}}}`,
    )
  }

  return rules.join('')
})

/** Typography and shape stay inline: Vue's binding escapes them, a stylesheet would not. */
const shapeVars = computed(() => {
  const content = resolveContentWidthCss(theme.value)
  return {
    '--site-radius': RADIUS[theme.value.radius] ?? RADIUS.md,
    '--site-font-heading': `${theme.value.fontHeading}, ui-sans-serif, system-ui, sans-serif`,
    '--site-font-body': `${theme.value.fontBody}, ui-sans-serif, system-ui, sans-serif`,
    '--site-content-width': content,
    '--site-content-max': content,
    fontFamily: `${theme.value.fontBody}, ui-sans-serif, system-ui, sans-serif`,
  }
})

/** Without a dark set, the site is light whatever the visitor's OS says. */
const mode = computed(() => (darkTokens.value ? theme.value.mode : 'light'))

useHead(() => ({
  title: page.value.page.seo.title || page.value.page.title,
  htmlAttrs: { lang: page.value.site.locale },
  meta: [
    { name: 'description', content: page.value.page.seo.description ?? '' },
    ...(page.value.page.seo.noIndex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    { property: 'og:title', content: page.value.page.seo.title || page.value.page.title },
    { property: 'og:description', content: page.value.page.seo.description ?? '' },
    { property: 'og:type', content: 'website' },
    ...(page.value.page.seo.ogImage ? [{ property: 'og:image', content: page.value.page.seo.ogImage }] : []),
    // Lets form controls, scrollbars and the browser's own chrome follow the site.
    { name: 'color-scheme', content: mode.value === 'light' ? 'light' : mode.value === 'dark' ? 'dark' : 'light dark' },
  ],
  link: page.value.page.seo.canonical ? [{ rel: 'canonical', href: page.value.page.seo.canonical }] : [],
  style: [{ key: 'site-theme', textContent: themeCss.value }],
}))
</script>

<template>
  <div data-site-theme :data-site-mode="mode" :style="shapeVars" class="min-h-screen">
    <BlockRenderer :sections="page.page.sections" />
  </div>
</template>
