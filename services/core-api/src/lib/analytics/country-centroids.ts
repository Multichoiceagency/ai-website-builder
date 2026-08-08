/**
 * Coarse country centroids for Live View pins.
 *
 * Used only when a real session signal yields an ISO country (locale region
 * or CDN country header stored on the event). Never invents visitors.
 */

export interface CountryPoint {
  code: string
  name: string
  lat: number
  lng: number
}

const CENTROIDS: Record<string, CountryPoint> = {
  US: { code: 'US', name: 'United States', lat: 39.8283, lng: -98.5795 },
  GB: { code: 'GB', name: 'United Kingdom', lat: 54.7024, lng: -3.2766 },
  NL: { code: 'NL', name: 'Netherlands', lat: 52.1326, lng: 5.2913 },
  BE: { code: 'BE', name: 'Belgium', lat: 50.5039, lng: 4.4699 },
  DE: { code: 'DE', name: 'Germany', lat: 51.1657, lng: 10.4515 },
  FR: { code: 'FR', name: 'France', lat: 46.2276, lng: 2.2137 },
  ES: { code: 'ES', name: 'Spain', lat: 40.4637, lng: -3.7492 },
  IT: { code: 'IT', name: 'Italy', lat: 41.8719, lng: 12.5674 },
  PT: { code: 'PT', name: 'Portugal', lat: 39.3999, lng: -8.2245 },
  IE: { code: 'IE', name: 'Ireland', lat: 53.1424, lng: -7.6921 },
  SE: { code: 'SE', name: 'Sweden', lat: 60.1282, lng: 18.6435 },
  NO: { code: 'NO', name: 'Norway', lat: 60.472, lng: 8.4689 },
  DK: { code: 'DK', name: 'Denmark', lat: 56.2639, lng: 9.5018 },
  FI: { code: 'FI', name: 'Finland', lat: 61.9241, lng: 25.7482 },
  PL: { code: 'PL', name: 'Poland', lat: 51.9194, lng: 19.1451 },
  AT: { code: 'AT', name: 'Austria', lat: 47.5162, lng: 14.5501 },
  CH: { code: 'CH', name: 'Switzerland', lat: 46.8182, lng: 8.2275 },
  CZ: { code: 'CZ', name: 'Czechia', lat: 49.8175, lng: 15.473 },
  AU: { code: 'AU', name: 'Australia', lat: -25.2744, lng: 133.7751 },
  NZ: { code: 'NZ', name: 'New Zealand', lat: -40.9006, lng: 174.886 },
  CA: { code: 'CA', name: 'Canada', lat: 56.1304, lng: -106.3468 },
  MX: { code: 'MX', name: 'Mexico', lat: 23.6345, lng: -102.5528 },
  BR: { code: 'BR', name: 'Brazil', lat: -14.235, lng: -51.9253 },
  AR: { code: 'AR', name: 'Argentina', lat: -38.4161, lng: -63.6167 },
  IN: { code: 'IN', name: 'India', lat: 20.5937, lng: 78.9629 },
  JP: { code: 'JP', name: 'Japan', lat: 36.2048, lng: 138.2529 },
  KR: { code: 'KR', name: 'South Korea', lat: 35.9078, lng: 127.7669 },
  CN: { code: 'CN', name: 'China', lat: 35.8617, lng: 104.1954 },
  SG: { code: 'SG', name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  AE: { code: 'AE', name: 'United Arab Emirates', lat: 23.4241, lng: 53.8478 },
  SA: { code: 'SA', name: 'Saudi Arabia', lat: 23.8859, lng: 45.0792 },
  ZA: { code: 'ZA', name: 'South Africa', lat: -30.5595, lng: 22.9375 },
  EG: { code: 'EG', name: 'Egypt', lat: 26.8206, lng: 30.8025 },
  TR: { code: 'TR', name: 'Türkiye', lat: 38.9637, lng: 35.2433 },
  RU: { code: 'RU', name: 'Russia', lat: 61.524, lng: 105.3188 },
  UA: { code: 'UA', name: 'Ukraine', lat: 48.3794, lng: 31.1656 },
  IL: { code: 'IL', name: 'Israel', lat: 31.0461, lng: 34.8516 },
  TH: { code: 'TH', name: 'Thailand', lat: 15.87, lng: 100.9925 },
  ID: { code: 'ID', name: 'Indonesia', lat: -0.7893, lng: 113.9213 },
  MY: { code: 'MY', name: 'Malaysia', lat: 4.2105, lng: 101.9758 },
  PH: { code: 'PH', name: 'Philippines', lat: 12.8797, lng: 121.774 },
  VN: { code: 'VN', name: 'Vietnam', lat: 14.0583, lng: 108.2772 },
  HK: { code: 'HK', name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  TW: { code: 'TW', name: 'Taiwan', lat: 23.6978, lng: 120.9605 },
}

/** BCP-47 / Accept-Language region → ISO 3166-1 alpha-2. */
export function countryFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null
  const trimmed = locale.trim()
  const match = trimmed.match(/^[a-z]{2,3}[-_]([A-Za-z]{2})\b/) || trimmed.match(/^([A-Za-z]{2})$/)
  if (!match?.[1]) return null
  const code = match[1].toUpperCase()
  return CENTROIDS[code] ? code : null
}

export function countryPoint(code: string | null | undefined): CountryPoint | null {
  if (!code) return null
  return CENTROIDS[code.toUpperCase()] ?? null
}
