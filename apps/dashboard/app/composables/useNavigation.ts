import type { Component } from 'vue'
import type { Permission } from '@platform/schemas'
import {
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Filter,
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
  Megaphone,
  MessageCircle,
  Navigation,
  Package,
  Palette,
  Percent,
  Plug,
  Receipt,
  Rss,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Target,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Workflow,
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
      { label: 'Pages', to: '/website/pages', icon: FileText, permission: 'page:read' },
      { label: 'Blog', to: '/website/blog', icon: LayoutTemplate, permission: 'page:read' },
      { label: 'Navigation', to: '/website/navigation', icon: Navigation, permission: 'site:read' },
      { label: 'Media', to: '/website/media', icon: Image, permission: 'media:read' },
      { label: 'Theme', to: '/website/theme', icon: Palette, permission: 'site:read' },
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
      { label: 'Store builder', to: '/commerce/builder', icon: LayoutTemplate, permission: 'commerce:read', phase: 5 },
      { label: 'Products', to: '/commerce/products', icon: Package, permission: 'commerce:read' },
      { label: 'Collections', to: '/commerce/collections', icon: Tags, permission: 'commerce:read' },
      { label: 'Inventory', to: '/commerce/inventory', icon: Warehouse, permission: 'commerce:read' },
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
    id: 'growth',
    label: 'Growth',
    to: '/growth/seo',
    icon: TrendingUp,
    items: [
      { label: 'SEO', to: '/growth/seo', icon: Target, permission: 'seo:read' },
      { label: 'Google Ads', to: '/growth/google-ads', icon: Megaphone, permission: 'ads:read' },
      { label: 'Meta Ads', to: '/growth/meta-ads', icon: Megaphone, permission: 'ads:read' },
      { label: 'Email', to: '/growth/email', icon: Mail, permission: 'email:read' },
      { label: 'Campaigns', to: '/growth/campaigns', icon: Mail, permission: 'email:read', phase: 6 },
      { label: 'Google Business', to: '/growth/google-business', icon: MapPin, permission: 'integration:read' },
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
      { label: 'Companies', to: '/crm/companies', icon: Building2, permission: 'crm:read', phase: 6 },
      { label: 'Tasks', to: '/crm/tasks', icon: ListOrdered, permission: 'crm:read', phase: 6 },
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
      { label: 'Funnels', to: '/analytics/funnels', icon: Filter, permission: 'analytics:read', phase: 4 },
      { label: 'Commerce', to: '/analytics/commerce', icon: ShoppingBag, permission: 'analytics:read', phase: 5 },
      { label: 'Ads', to: '/analytics/ads', icon: Megaphone, permission: 'analytics:read', phase: 6 },
      { label: 'Tracking', to: '/analytics/tracking', icon: Activity, permission: 'tracking:read' },
    ],
  },
  {
    id: 'automations',
    label: 'Automations',
    to: '/automations',
    icon: Zap,
    items: [
      { label: 'Workflows', to: '/automations', icon: Workflow, permission: 'automation:read' },
    ],
  },
  {
    id: 'experiments',
    label: 'Experiments',
    to: '/experiments',
    icon: FlaskConical,
    items: [
      { label: 'Tests', to: '/experiments', icon: FlaskConical, permission: 'experiment:read' },
    ],
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
export const useActiveSiteId = () => useState<string | null>('active-site', () => null)
