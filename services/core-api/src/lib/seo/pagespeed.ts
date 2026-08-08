import { env } from '../../config/env.js'

/**
 * PageSpeed Insights (platform API key) for SEO QA.
 */

export interface PageSpeedResult {
  url: string
  strategy: 'mobile' | 'desktop'
  performanceScore: number | null
  seoScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  lcpMs: number | null
  cls: number | null
  inpMs: number | null
  fetchTime: string
  warnings: string[]
}

function apiKey(): string | undefined {
  return env.GOOGLE_API_KEY?.trim() || undefined
}

export function isPageSpeedConfigured(): boolean {
  return Boolean(apiKey())
}

function categoryScore(payload: Record<string, unknown>, id: string): number | null {
  const categories = payload.lighthouseResult as
    | { categories?: Record<string, { score?: number | null }> }
    | undefined
  const score = categories?.categories?.[id]?.score
  if (typeof score !== 'number') return null
  return Math.round(score * 100)
}

function auditNumeric(payload: Record<string, unknown>, id: string): number | null {
  const audits = (payload.lighthouseResult as { audits?: Record<string, { numericValue?: number }> } | undefined)
    ?.audits
  const value = audits?.[id]?.numericValue
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function runPageSpeed(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
): Promise<PageSpeedResult> {
  const warnings: string[] = []
  const key = apiKey()
  if (!key) {
    return {
      url,
      strategy,
      performanceScore: null,
      seoScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      fetchTime: new Date().toISOString(),
      warnings: ['GOOGLE_API_KEY is not set — PageSpeed was skipped.'],
    }
  }

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('strategy', strategy)
  endpoint.searchParams.set('key', key)
  for (const category of ['performance', 'seo', 'accessibility', 'best-practices']) {
    endpoint.searchParams.append('category', category)
  }

  const response = await fetch(endpoint)
  if (!response.ok) {
    warnings.push(`PageSpeed failed (${response.status}).`)
    return {
      url,
      strategy,
      performanceScore: null,
      seoScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      fetchTime: new Date().toISOString(),
      warnings,
    }
  }

  const payload = (await response.json()) as Record<string, unknown>
  return {
    url,
    strategy,
    performanceScore: categoryScore(payload, 'performance'),
    seoScore: categoryScore(payload, 'seo'),
    accessibilityScore: categoryScore(payload, 'accessibility'),
    bestPracticesScore: categoryScore(payload, 'best-practices'),
    lcpMs: auditNumeric(payload, 'largest-contentful-paint'),
    cls: auditNumeric(payload, 'cumulative-layout-shift'),
    inpMs: auditNumeric(payload, 'interaction-to-next-paint'),
    fetchTime: new Date().toISOString(),
    warnings,
  }
}
