import { computed, watch, type Ref } from 'vue'
import type { WhiteLabelSettings } from '@platform/schemas'
import { ensureGoogleFont } from './useGoogleFont'

const STORAGE_SIDEBAR = 'dashboard.sidebarCollapsed'

const DEFAULTS: WhiteLabelSettings = {
  brandName: null,
  logoUrl: null,
  faviconUrl: null,
  colorPrimary: '#c2410c',
  colorAccent: '#0f766e',
  colorSurface: '#fafaf9',
  colorSurfaceAlt: '#ffffff',
  colorText: '#18181b',
  fontHeading: 'Figtree',
  fontBody: 'Rubik',
  customDomain: null,
  hidePlatformBranding: false,
  supportEmail: null,
  updatedAt: null,
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null
  return {
    r: Number.parseInt(cleaned.slice(0, 2), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    b: Number.parseInt(cleaned.slice(4, 6), 16),
  }
}

function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0.5
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

function mixHex(hex: string, toward: 'white' | 'black', amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const target = toward === 'white' ? 255 : 0
  const mix = (c: number) => Math.round(c + (target - c) * amount)
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(mix(rgb.r))}${to(mix(rgb.g))}${to(mix(rgb.b))}`
}

function absoluteMediaUrl(url: string | null | undefined, coreApiUrl: string): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  if (url.startsWith('/')) return `${coreApiUrl.replace(/\/$/, '')}${url}`
  return url
}

/** Paint tenant branding onto `:root` so Tailwind token classes pick it up. */
export function applyDashboardBrandingVars(settings: WhiteLabelSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const primary = settings.colorPrimary || DEFAULTS.colorPrimary
  const soft = mixHex(primary, 'white', 0.88)
  const hover = mixHex(primary, 'black', 0.12)
  const brandInk = luminance(primary) > 0.55 ? '#18181b' : '#ffffff'

  root.style.setProperty('--brand', primary)
  root.style.setProperty('--brand-hover', hover)
  root.style.setProperty('--brand-soft', soft)
  root.style.setProperty('--brand-ink', brandInk)
  root.style.setProperty('--focus', primary)
  root.style.setProperty('--paper', settings.colorSurface || DEFAULTS.colorSurface)
  root.style.setProperty('--paper-raised', settings.colorSurfaceAlt || DEFAULTS.colorSurfaceAlt)
  root.style.setProperty('--paper-sunken', mixHex(settings.colorSurface || DEFAULTS.colorSurface, 'black', 0.03))
  root.style.setProperty('--ink', settings.colorText || DEFAULTS.colorText)

  ensureGoogleFont(settings.fontHeading || DEFAULTS.fontHeading)
  ensureGoogleFont(settings.fontBody || DEFAULTS.fontBody)
  root.style.setProperty(
    '--font-heading',
    `"${settings.fontHeading || DEFAULTS.fontHeading}", ui-sans-serif, system-ui, sans-serif`,
  )
  root.style.setProperty(
    '--font-body',
    `"${settings.fontBody || DEFAULTS.fontBody}", ui-sans-serif, system-ui, sans-serif`,
  )
  root.style.fontFamily = `var(--font-body)`
}

/**
 * Load white-label settings for the active workspace and drive shell chrome
 * (logo, colours, fonts, collapsible sidebar).
 */
export function useDashboardBranding() {
  const api = useApi()
  const config = useRuntimeConfig()
  const tenantId = useActiveTenantId()

  const { data: branding, refresh } = useAsyncData(
    () => `dashboard:branding:${tenantId.value ?? 'none'}`,
    async () => {
      if (!tenantId.value) return DEFAULTS
      try {
        return await api.get<WhiteLabelSettings>('/api/v1/agency/white-label')
      } catch {
        return DEFAULTS
      }
    },
    { default: () => DEFAULTS, watch: [tenantId] },
  )

  const logoUrl = computed(() =>
    absoluteMediaUrl(branding.value?.logoUrl, String(config.public.coreApiUrl ?? '')),
  )
  const brandName = computed(
    () => branding.value?.brandName?.trim() || null,
  )
  const hidePlatformBranding = computed(() => Boolean(branding.value?.hidePlatformBranding))

  const sidebarCollapsed: Ref<boolean> = useState(STORAGE_SIDEBAR, () => {
    if (import.meta.client) {
      try {
        return localStorage.getItem(STORAGE_SIDEBAR) === '1'
      } catch {
        return false
      }
    }
    return false
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_SIDEBAR, sidebarCollapsed.value ? '1' : '0')
      } catch {
        /* ignore quota */
      }
    }
  }

  watch(
    branding,
    (next) => {
      if (next) applyDashboardBrandingVars(next)
    },
    { immediate: true, deep: true },
  )

  return {
    branding,
    logoUrl,
    brandName,
    hidePlatformBranding,
    sidebarCollapsed,
    toggleSidebar,
    refresh,
    defaults: DEFAULTS,
  }
}
