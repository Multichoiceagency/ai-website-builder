import type {
  AnalyticsLiveChannel,
  AnalyticsLivePresence,
  AnalyticsLiveRecommendation,
  AnalyticsLiveVisitor,
} from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import { countryFromLocale, countryPoint } from './country-centroids.js'

const ECOMMERCE_EVENTS = new Set([
  'purchase',
  'add_to_cart',
  'begin_checkout',
  'view_item',
  'view_item_list',
  'remove_from_cart',
])

interface LiveSessionRow {
  session_id: string
  anonymous_id: string
  site_id: string
  last_event_at: Date
  event_count: number
  landing_url: string
  locale: string | null
  country: string | null
  path: string | null
  recent_names: string[] | null
}

function avatarUrl(anonymousId: string): string {
  const seed = encodeURIComponent(anonymousId.slice(0, 32))
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&size=64`
}

function channelOf(names: string[] | null): AnalyticsLiveChannel {
  if (!names?.length) return 'unknown'
  if (names.some((name) => ECOMMERCE_EVENTS.has(name))) return 'ecommerce'
  if (names.some((name) => name === 'page_view' || name === 'form_submit' || name === 'lead')) {
    return 'website'
  }
  return 'unknown'
}

function pathLabel(path: string | null, landingUrl: string): string {
  if (path?.trim()) return path.trim().slice(0, 120)
  try {
    const url = new URL(landingUrl)
    return `${url.pathname}${url.search}`.slice(0, 120) || '/'
  } catch {
    return landingUrl.slice(0, 120) || 'Visit'
  }
}

function buildRecommendations(input: {
  activeCount: number
  mapped: number
  ecommerce: number
  website: number
}): AnalyticsLiveRecommendation[] {
  const items: AnalyticsLiveRecommendation[] = []

  if (input.activeCount === 0) {
    items.push({
      id: 'no-traffic',
      title: 'No live visitors yet',
      body: 'Confirm the tracking snippet is on published pages, then open Live View again.',
      tone: 'warning',
      href: '/analytics/tracking',
    })
    return items
  }

  if (input.mapped === 0) {
    items.push({
      id: 'no-geo',
      title: 'Visitors are live, but not mapped',
      body: 'Country pins appear when the browser locale includes a region (e.g. nl-NL) or a country is stored on the session.',
      tone: 'info',
      href: '/analytics/tracking',
    })
  }

  if (input.ecommerce === 0 && input.website > 0) {
    items.push({
      id: 'shop-path',
      title: 'Website traffic, no shop signals',
      body: 'Visitors are browsing pages. Add product blocks or a shop CTA if you want ecommerce events on this globe.',
      tone: 'action',
      href: '/commerce/products',
    })
  }

  if (input.ecommerce > 0) {
    items.push({
      id: 'commerce-live',
      title: 'Shoppers on the map',
      body: `${input.ecommerce} active session${input.ecommerce === 1 ? '' : 's'} touched commerce events — watch checkout and inventory.`,
      tone: 'action',
      href: '/commerce/orders',
    })
  }

  items.push({
    id: 'ask-ai',
    title: 'Ask AI what to do next',
    body: 'Open the assistant with this live snapshot for tailored website and ecommerce recommendations.',
    tone: 'info',
    href: '/analytics/live',
  })

  return items.slice(0, 4)
}

/**
 * Active sessions in the last `windowMinutes`, with optional country pins.
 */
export async function buildLivePresence(
  tx: Tx,
  tenantId: string,
  options: { siteId?: string; windowMinutes?: number },
): Promise<AnalyticsLivePresence> {
  const windowMinutes = options.windowMinutes ?? 15
  const since = new Date(Date.now() - windowMinutes * 60_000)

  const rows = await tx<LiveSessionRow[]>`
    SELECT
      s.session_id,
      s.anonymous_id,
      s.site_id,
      s.last_event_at,
      s.event_count,
      s.landing_url,
      (
        SELECT e.context->>'locale'
        FROM tracking_events e
        WHERE e.tenant_id = ${tenantId}
          AND e.session_id = s.session_id
          AND e.context->>'locale' IS NOT NULL
          AND e.context->>'locale' <> ''
        ORDER BY e.occurred_at DESC
        LIMIT 1
      ) AS locale,
      (
        SELECT COALESCE(e.properties->>'country', e.context->>'country')
        FROM tracking_events e
        WHERE e.tenant_id = ${tenantId}
          AND e.session_id = s.session_id
          AND (
            (e.properties->>'country') IS NOT NULL
            OR (e.context->>'country') IS NOT NULL
          )
        ORDER BY e.occurred_at DESC
        LIMIT 1
      ) AS country,
      (
        SELECT NULLIF(regexp_replace(COALESCE(e.context->>'url', ''), '^https?://[^/]+', ''), '')
        FROM tracking_events e
        WHERE e.tenant_id = ${tenantId}
          AND e.session_id = s.session_id
        ORDER BY e.occurred_at DESC
        LIMIT 1
      ) AS path,
      (
        SELECT array_agg(DISTINCT e.name)
        FROM tracking_events e
        WHERE e.tenant_id = ${tenantId}
          AND e.session_id = s.session_id
          AND e.occurred_at >= ${since}
      ) AS recent_names
    FROM tracking_sessions s
    WHERE s.tenant_id = ${tenantId}
      AND s.last_event_at >= ${since}
      ${options.siteId ? tx`AND s.site_id = ${options.siteId}` : tx``}
    ORDER BY s.last_event_at DESC
    LIMIT 80
  `

  const visitors: AnalyticsLiveVisitor[] = rows.map((row) => {
    const code =
      (row.country && /^[A-Za-z]{2}$/.test(row.country) ? row.country.toUpperCase() : null) ??
      countryFromLocale(row.locale)
    const point = countryPoint(code)
    const channel = channelOf(row.recent_names)
    const path = pathLabel(row.path, row.landing_url)

    return {
      id: row.session_id,
      anonymousId: row.anonymous_id,
      sessionId: row.session_id,
      siteId: row.site_id,
      label: point ? `${point.name} · ${path}` : path,
      countryCode: point?.code ?? null,
      countryName: point?.name ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      avatarUrl: avatarUrl(row.anonymous_id),
      channel,
      path,
      lastSeenAt: row.last_event_at.toISOString(),
      eventCount: row.event_count,
    }
  })

  const locationMap = new Map<string, { countryCode: string; countryName: string; visitors: number }>()
  for (const visitor of visitors) {
    if (!visitor.countryCode || !visitor.countryName) continue
    const existing = locationMap.get(visitor.countryCode)
    if (existing) existing.visitors += 1
    else {
      locationMap.set(visitor.countryCode, {
        countryCode: visitor.countryCode,
        countryName: visitor.countryName,
        visitors: 1,
      })
    }
  }

  const channels = {
    website: visitors.filter((entry) => entry.channel === 'website').length,
    ecommerce: visitors.filter((entry) => entry.channel === 'ecommerce').length,
    unknown: visitors.filter((entry) => entry.channel === 'unknown').length,
  }

  const mapped = visitors.filter((entry) => entry.lat != null && entry.lng != null).length

  return {
    activeCount: visitors.length,
    windowMinutes,
    asOf: new Date().toISOString(),
    siteId: options.siteId ?? null,
    visitors,
    locations: [...locationMap.values()].sort((a, b) => b.visitors - a.visitors),
    channels,
    recommendations: buildRecommendations({
      activeCount: visitors.length,
      mapped,
      ecommerce: channels.ecommerce,
      website: channels.website,
    }),
  }
}
