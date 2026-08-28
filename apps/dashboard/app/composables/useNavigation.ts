import type { Component } from 'vue'
import type { Permission } from '@platform/schemas'
import {
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  CreditCard,
  Database,
  FileText,
  FlaskConical,
  FolderKanban,
  Gift,
  Globe,
  Home,
  Image,
  LayoutGrid,
  LayoutTemplate,
  Link2,
  ListOrdered,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Palette,
  PanelBottom,
  PanelTop,
  Percent,
  Plug,
  Plus,
  Receipt,
  Rss,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Target,
  Truck,
  Users,
  Warehouse,
  Zap,
} from '@lucide/vue'

/**
 * Customer dashboard navigation — master plan §39.
 *
 * Every item carries a Lucide icon so collapsed rails stay readable (no
 * single-letter placeholders). Destinations that are not shipped yet carry
 * `phase` and still appear, labelled “soon”.
 */
export interface NavItem {
  label: string
  to: string
  icon: Component
  permission?: Permission
  /** Spec phase when the destination is not implemented yet. */
  phase?: number
}

export interface NavSection {
  id: string
  label: string
  icon: Component
  to: string
  items: NavItem[]
  /** Set on sections with no children, which have no item to carry the gate. */
  permission?: Permission
  phase?: number
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: 'Home',
    to: '/',
    icon: Home,
    items: [],
  },
  {
    id: 'website',
    label: 'Website',
    to: '/website/pages',
    icon: Globe,
    items: [
      { label: 'Make website', to: '/website/new', icon: Plus, permission: 'site:write' },
      { label: 'Pages', to: '/website/pages', icon: FileText, permission: 'page:read' },
      { label: 'CMS', to: '/website/cms', icon: Database, permission: 'page:read' },
      { label: 'Top bar', to: '/website/header', icon: PanelTop, permission: 'page:write' },
      { label: 'Footer', to: '/website/footer', icon: PanelBottom, permission: 'page:write' },
      { label: 'Blog', to: '/website/blog', icon: LayoutTemplate, permission: 'page:read' },
      { label: 'Menu links', to: '/website/navigation', icon: Navigation, permission: 'site:read' },
      { label: 'Photos & files', to: '/website/media', icon: Image, permission: 'media:read' },
      { label: 'Colors & fonts', to: '/website/theme', icon: Palette, permission: 'site:read' },
      { label: 'Style Guide', to: '/website/style-guide', icon: Sparkles, permission: 'site:read' },
      { label: 'Components', to: '/website/components', icon: Boxes, permission: 'site:read' },
      { label: 'Templates', to: '/website/templates', icon: LayoutGrid, permission: 'site:read' },
      { label: 'All websites', to: '/sites', icon: Globe, permission: 'site:read' },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    to: '/commerce',
    icon: ShoppingBag,
    items: [
      { label: 'Overview', to: '/commerce', icon: Store, permission: 'commerce:read' },
      { label: 'Make a webshop', to: '/commerce/builder', icon: LayoutTemplate, permission: 'commerce:read' },
      { label: 'Top bar', to: '/commerce/header', icon: PanelTop, permission: 'page:write' },
      { label: 'Footer', to: '/commerce/footer', icon: PanelBottom, permission: 'page:write' },
      { label: 'Products', to: '/commerce/products', icon: Package, permission: 'commerce:read' },
      { label: 'Collections', to: '/commerce/collections', icon: Tags, permission: 'commerce:read' },
      { label: 'Stock', to: '/commerce/inventory', icon: Warehouse, permission: 'commerce:read' },
      { label: 'Orders', to: '/commerce/orders', icon: ListOrdered, permission: 'order:read' },
      { label: 'Customers', to: '/commerce/customers', icon: Users, permission: 'customer:read' },
      { label: 'Discounts', to: '/commerce/discounts', icon: Percent, permission: 'commerce:read' },
      { label: 'Shipping', to: '/commerce/shipping', icon: Truck, permission: 'commerce:read' },
      { label: 'Payments', to: '/commerce/payments', icon: CreditCard, permission: 'commerce:read' },
      { label: 'Taxes', to: '/commerce/taxes', icon: Receipt, permission: 'commerce:read' },
      { label: 'Feeds', to: '/commerce/feeds', icon: Rss, permission: 'commerce:read' },
      { label: 'Settings', to: '/commerce/settings', icon: Settings, permission: 'commerce:write' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    to: '/crm',
    icon: Users,
    items: [
      { label: 'Leads', to: '/crm/leads', icon: Target, permission: 'crm:read' },
      { label: 'Pipeline', to: '/crm/pipeline', icon: FolderKanban, permission: 'crm:read' },
      { label: 'Contacts', to: '/crm/contacts', icon: Users, permission: 'crm:read' },
      { label: 'Support desk', to: '/crm/support', icon: MessageCircle, permission: 'crm:read' },
      { label: 'WhatsApp agents', to: '/crm/whatsapp-agents', icon: MessageCircle, permission: 'crm:read' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    to: '/analytics',
    icon: BarChart3,
    items: [
      { label: 'Overview', to: '/analytics', icon: BarChart3, permission: 'analytics:read' },
      { label: 'Live View', to: '/analytics/live', icon: Activity, permission: 'analytics:read' },
      { label: 'Google Analytics', to: '/analytics/google', icon: Globe, permission: 'analytics:read' },
      { label: 'Attribution', to: '/analytics/attribution', icon: Link2, permission: 'analytics:read' },
      { label: 'Tracking', to: '/analytics/tracking', icon: Activity, permission: 'tracking:read' },
    ],
  },
  {
    id: 'automations',
    label: 'Automations',
    to: '/automations',
    icon: Zap,
    permission: 'automation:read',
    items: [],
  },
  {
    id: 'experiments',
    label: 'Experiments',
    to: '/experiments',
    icon: FlaskConical,
    permission: 'experiment:read',
    items: [],
  },
  {
    id: 'ai',
    label: 'AI Assistant',
    to: '/',
    icon: Sparkles,
    items: [],
    phase: 2,
  },
  {
    id: 'apps',
    label: 'Apps',
    to: '/apps',
    icon: LayoutGrid,
    items: [
      { label: 'Marketplace', to: '/apps', icon: Gift, permission: 'app:read' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    items: [
      { label: 'General', to: '/settings', icon: Settings, permission: 'tenant:read' },
      { label: 'Team', to: '/settings/team', icon: Users, permission: 'member:read' },
      { label: 'Plan', to: '/settings/plan', icon: CreditCard, permission: 'billing:read' },
      { label: 'Domains', to: '/settings/domains', icon: Globe, permission: 'domain:read' },
      { label: 'Integrations', to: '/settings/integrations', icon: Plug, permission: 'integration:read' },
      { label: 'Google Business', to: '/settings/google-business', icon: MapPin, permission: 'integration:read' },
      { label: 'AI models', to: '/settings/ai', icon: Sparkles, permission: 'tenant:read' },
      { label: 'Notifications', to: '/settings/notifications', icon: Mail, permission: 'tenant:read' },
      { label: 'Developer', to: '/settings/developer', icon: Briefcase, permission: 'developer:read' },
      { label: 'Audit log', to: '/settings/audit', icon: FileText, permission: 'audit:read' },
      { label: 'Data', to: '/settings/data', icon: Boxes, permission: 'tenant:read' },
      { label: 'Onboarding', to: '/settings/onboarding', icon: Sparkles, permission: 'tenant:read' },
    ],
  },
]

/** The section that owns the current route, for rail + sidebar highlighting. */
export function sectionForPath(path: string): NavSection | undefined {
  if (path.startsWith('/pages/') || path === '/pages') {
    return NAV_SECTIONS.find((section) => section.id === 'website')
  }

  const match = NAV_SECTIONS.filter((section) => section.id !== 'home').find(
    (section) =>
      path.startsWith(`/${section.id}`) ||
      section.items.some((item) => path === item.to || path.startsWith(`${item.to}/`)) ||
      path.startsWith(section.to),
  )
  return match ?? NAV_SECTIONS[0]
}

/** The site the Website section operates on. Remembered across visits. */
const ACTIVE_SITE_KEY = 'platform.active-site-id'

export const useActiveSiteId = () => {
  const id = useState<string | null>('active-site', () => {
    if (!import.meta.client) return null
    try {
      const stored = localStorage.getItem(ACTIVE_SITE_KEY)
      return stored && /^[0-9a-f-]{36}$/i.test(stored) ? stored : null
    } catch {
      return null
    }
  })

  watch(
    id,
    (value) => {
      if (!import.meta.client) return
      try {
        if (value) localStorage.setItem(ACTIVE_SITE_KEY, value)
        else localStorage.removeItem(ACTIVE_SITE_KEY)
      } catch {
        // Ignore quota / private mode.
      }
    },
    { flush: 'post' },
  )

  return id
}

/**
 * Keep `activeSiteId` pointing at a real site from the current tenant list.
 * Clears stale ids and picks the first site when none is selected.
 * When `preferKind` is set, prefer that kind (e.g. website pages vs shop builder).
 */
export function syncActiveSiteId(
  sites: { id: string; kind?: string }[] | null | undefined,
  options?: { preferKind?: 'website' | 'ecommerce' },
) {
  const activeSiteId = useActiveSiteId()
  const list = sites ?? []
  if (!list.length) {
    if (activeSiteId.value) activeSiteId.value = null
    return
  }

  const preferred = options?.preferKind
    ? list.filter((site) => (site.kind ?? 'website') === options.preferKind)
    : list
  const pool = preferred.length ? preferred : list

  if (!activeSiteId.value || !pool.some((site) => site.id === activeSiteId.value)) {
    activeSiteId.value = pool[0]!.id
  }
}
