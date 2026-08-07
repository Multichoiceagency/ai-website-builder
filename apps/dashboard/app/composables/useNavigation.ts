import type { Component } from 'vue'
import type { Permission } from '@platform/schemas'
import {
  BarChart3,
  FlaskConical,
  Globe,
  Home,
  LayoutGrid,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from '@lucide/vue'

/**
 * Customer dashboard navigation — master plan §39.
 *
 * Destinations that are not shipped yet carry `phase` and still appear in the
 * sidebar so the product map is honest (labelled “soon”), never hidden.
 *
 * Icons are Lucide components. Render with
 * `<component :is="section.icon" :stroke-width="ICON_STROKE" />`.
 */
export interface NavItem {
  label: string
  to: string
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
      { label: 'Pages', to: '/website/pages', permission: 'page:read' },
      { label: 'Blog', to: '/website/blog', permission: 'page:read' },
      { label: 'Navigation', to: '/website/navigation', permission: 'site:read' },
      { label: 'Media', to: '/website/media', permission: 'media:read' },
      { label: 'Theme', to: '/website/theme', permission: 'site:read' },
      { label: 'Style Guide', to: '/website/style-guide', permission: 'site:read' },
      { label: 'Components', to: '/website/components', permission: 'site:read' },
      { label: 'Templates', to: '/website/templates', permission: 'site:read' },
      { label: 'All websites', to: '/sites', permission: 'site:read' },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    to: '/commerce',
    icon: ShoppingBag,
    items: [
      { label: 'Overview', to: '/commerce', permission: 'commerce:read' },
      { label: 'Products', to: '/commerce/products', permission: 'commerce:read' },
      { label: 'Collections', to: '/commerce/collections', permission: 'commerce:read', phase: 5 },
      { label: 'Inventory', to: '/commerce/inventory', permission: 'commerce:read', phase: 5 },
      { label: 'Orders', to: '/commerce/orders', permission: 'order:read' },
      { label: 'Customers', to: '/commerce/customers', permission: 'customer:read' },
      { label: 'Discounts', to: '/commerce/discounts', permission: 'commerce:read' },
      { label: 'Shipping', to: '/commerce/shipping', permission: 'commerce:read', phase: 5 },
      { label: 'Payments', to: '/commerce/payments', permission: 'commerce:read', phase: 5 },
      { label: 'Taxes', to: '/commerce/taxes', permission: 'commerce:read', phase: 5 },
      { label: 'Settings', to: '/commerce/settings', permission: 'commerce:write' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    to: '/growth/seo',
    icon: TrendingUp,
    items: [
      { label: 'SEO', to: '/growth/seo', permission: 'seo:read' },
      { label: 'Google Ads', to: '/growth/google-ads', permission: 'ads:read' },
      { label: 'Meta Ads', to: '/growth/meta-ads', permission: 'ads:read' },
      { label: 'Email', to: '/growth/email', permission: 'email:read' },
      { label: 'Campaigns', to: '/growth/campaigns', permission: 'email:read', phase: 6 },
      { label: 'Google Business', to: '/growth/google-business', permission: 'integration:read' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    to: '/crm',
    icon: Users,
    items: [
      { label: 'Leads', to: '/crm/leads', permission: 'crm:read' },
      { label: 'Pipeline', to: '/crm/pipeline', permission: 'crm:read' },
      { label: 'Contacts', to: '/crm/contacts', permission: 'crm:read' },
      { label: 'Companies', to: '/crm/companies', permission: 'crm:read', phase: 6 },
      { label: 'Tasks', to: '/crm/tasks', permission: 'crm:read', phase: 6 },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    to: '/analytics',
    icon: BarChart3,
    items: [
      { label: 'Overview', to: '/analytics', permission: 'analytics:read' },
      { label: 'Attribution', to: '/analytics/attribution', permission: 'analytics:read' },
      { label: 'Funnels', to: '/analytics/funnels', permission: 'analytics:read', phase: 4 },
      { label: 'Commerce', to: '/analytics/commerce', permission: 'analytics:read', phase: 5 },
      { label: 'Ads', to: '/analytics/ads', permission: 'analytics:read', phase: 6 },
      { label: 'Tracking', to: '/analytics/tracking', permission: 'tracking:read' },
    ],
  },
  {
    id: 'automations',
    label: 'Automations',
    to: '/automations',
    icon: Zap,
    items: [
      { label: 'Workflows', to: '/automations', permission: 'automation:read' },
    ],
  },
  {
    id: 'experiments',
    label: 'Experiments',
    to: '/experiments',
    icon: FlaskConical,
    items: [
      { label: 'Tests', to: '/experiments', permission: 'experiment:read' },
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
      { label: 'Marketplace', to: '/apps', permission: 'app:read' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    items: [
      { label: 'General', to: '/settings', permission: 'tenant:read' },
      { label: 'Team', to: '/settings/team', permission: 'member:read' },
      { label: 'Plan', to: '/settings/plan', permission: 'billing:read' },
      { label: 'Domains', to: '/settings/domains', permission: 'domain:read' },
      { label: 'Integrations', to: '/settings/integrations', permission: 'integration:read' },
      { label: 'AI models', to: '/settings/ai', permission: 'tenant:read' },
      { label: 'Notifications', to: '/settings/notifications', permission: 'tenant:read' },
      { label: 'Developer', to: '/settings/developer', permission: 'developer:read' },
      { label: 'Audit log', to: '/settings/audit', permission: 'audit:read' },
      { label: 'Data', to: '/settings/data', permission: 'tenant:read' },
      { label: 'Onboarding', to: '/settings/onboarding', permission: 'tenant:read' },
    ],
  },
]

/** The section that owns the current route, for rail + sidebar highlighting. */
export function sectionForPath(path: string): NavSection | undefined {
  // The visual editor lives at /pages/:id but belongs to Website.
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
