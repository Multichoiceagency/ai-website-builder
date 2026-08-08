import { googleAccessTokenFor, hasGoogleConnection } from '../integrations/google-token.js'
import { isGoogleConfigured } from '../integrations/google.js'
import { AppError } from '../errors.js'

/**
 * GA4 Data API — observed traffic for a property the tenant already granted
 * via Google OAuth (`analytics.readonly`).
 */

export interface Ga4PropertySummary {
  property: string
  displayName: string
}

export interface Ga4OverviewMetrics {
  sessions: number
  totalUsers: number
  screenPageViews: number
  bounceRate: number | null
  averageSessionDuration: number | null
}

export interface Ga4SeriesPoint {
  date: string
  sessions: number
  totalUsers: number
  screenPageViews: number
}

export interface Ga4DimensionRow {
  key: string
  label: string
  sessions: number
  totalUsers: number
}

export class Ga4NotConnectedError extends AppError {
  constructor(reason: string) {
    super(409, 'ga4_not_connected', reason)
  }
}

export function isGa4Configured(): boolean {
  return isGoogleConfigured()
}

export async function listGa4Properties(tenantId: string): Promise<Ga4PropertySummary[]> {
  if (!isGa4Configured()) {
    throw new Ga4NotConnectedError('Google OAuth is not configured on this environment.')
  }
  if (!(await hasGoogleConnection(tenantId))) {
    throw new Ga4NotConnectedError('Connect Google under Settings → Integrations first.')
  }

  const token = await googleAccessTokenFor(tenantId)
  // Admin API account summaries → property ids.
  const response = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',
    { headers: { authorization: `Bearer ${token}` } },
  )
  if (!response.ok) {
    throw new Ga4NotConnectedError(`GA4 Admin list failed (${response.status}). Enable Analytics Admin API.`)
  }
  const payload = (await response.json()) as {
    accountSummaries?: {
      propertySummaries?: { property?: string; displayName?: string }[]
    }[]
  }

  const rows: Ga4PropertySummary[] = []
  for (const account of payload.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      if (!property.property) continue
      rows.push({
        property: property.property,
        displayName: property.displayName ?? property.property,
      })
    }
  }
  return rows
}

export async function runGa4Overview(
  tenantId: string,
  property: string,
  days = 28,
): Promise<Ga4OverviewMetrics> {
  if (!isGa4Configured()) {
    throw new Ga4NotConnectedError('Google OAuth is not configured on this environment.')
  }
  const token = await googleAccessTokenFor(tenantId)
  const propertyName = property.startsWith('properties/') ? property : `properties/${property}`

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyName}:runReport`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Ga4NotConnectedError(`GA4 Data API failed (${response.status}).`)
  }

  const payload = (await response.json()) as {
    rows?: { metricValues?: { value?: string }[] }[]
  }
  const values = payload.rows?.[0]?.metricValues ?? []
  const num = (index: number) => {
    const raw = values[index]?.value
    if (raw == null || raw === '') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  return {
    sessions: num(0) ?? 0,
    totalUsers: num(1) ?? 0,
    screenPageViews: num(2) ?? 0,
    bounceRate: num(3),
    averageSessionDuration: num(4),
  }
}

async function ga4RunReport(
  tenantId: string,
  property: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (!isGa4Configured()) {
    throw new Ga4NotConnectedError('Google OAuth is not configured on this environment.')
  }
  const token = await googleAccessTokenFor(tenantId)
  const propertyName = property.startsWith('properties/') ? property : `properties/${property}`
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyName}:runReport`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!response.ok) {
    throw new Ga4NotConnectedError(`GA4 Data API failed (${response.status}).`)
  }
  return response.json()
}

export async function runGa4Series(
  tenantId: string,
  property: string,
  days = 28,
): Promise<Ga4SeriesPoint[]> {
  const payload = (await ga4RunReport(tenantId, property, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  })) as {
    rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[]
  }

  return (payload.rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value ?? ''
    const date =
      raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw
    const metrics = row.metricValues ?? []
    const num = (index: number) => {
      const parsed = Number(metrics[index]?.value ?? 0)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return {
      date,
      sessions: num(0),
      totalUsers: num(1),
      screenPageViews: num(2),
    }
  })
}

export async function runGa4Breakdown(
  tenantId: string,
  property: string,
  dimension: 'country' | 'sessionSource' | 'deviceCategory' | 'landingPage',
  days = 28,
): Promise<Ga4DimensionRow[]> {
  const payload = (await ga4RunReport(tenantId, property, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 25,
  })) as {
    rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[]
  }

  return (payload.rows ?? []).map((row) => {
    const label = row.dimensionValues?.[0]?.value || '(not set)'
    const metrics = row.metricValues ?? []
    const num = (index: number) => {
      const parsed = Number(metrics[index]?.value ?? 0)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return {
      key: label,
      label,
      sessions: num(0),
      totalUsers: num(1),
    }
  })
}

