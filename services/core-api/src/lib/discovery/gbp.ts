import type { BusinessLocation, OpeningHours } from '@platform/schemas'
import type { GoogleBusinessLocation } from '../integrations/google.js'
import type { PlacesEnrichment } from './places.js'

/**
 * Map a cached / live Google Business Profile location into the same shape
 * Places enrichment uses, so discovery can treat GBP as authoritative.
 */

const DAY_MAP: Record<string, OpeningHours['day']> = {
  MONDAY: 'mon',
  TUESDAY: 'tue',
  WEDNESDAY: 'wed',
  THURSDAY: 'thu',
  FRIDAY: 'fri',
  SATURDAY: 'sat',
  SUNDAY: 'sun',
}

function formatTime(value?: { hours?: number; minutes?: number }): string | undefined {
  if (value?.hours === undefined) return undefined
  const hours = String(value.hours).padStart(2, '0')
  const minutes = String(value.minutes ?? 0).padStart(2, '0')
  return `${hours}:${minutes}`
}

function hoursFromGbp(location: GoogleBusinessLocation): OpeningHours[] {
  const periods = location.regularHours?.periods ?? []
  const byDay = new Map<OpeningHours['day'], OpeningHours>()

  for (const period of periods) {
    const day = period.openDay ? DAY_MAP[period.openDay] : undefined
    if (!day) continue
    byDay.set(day, {
      day,
      opens: formatTime(period.openTime),
      closes: formatTime(period.closeTime),
      closed: false,
    })
  }

  return [...byDay.values()]
}

export function enrichmentFromGbpLocation(
  location: GoogleBusinessLocation,
  locationId: string,
): PlacesEnrichment {
  const address = location.storefrontAddress
  const category = location.categories?.primaryCategory?.displayName?.trim()

  const mapped: BusinessLocation = {
    label: location.title || '',
    street: address?.addressLines?.join(', ') ?? '',
    postalCode: address?.postalCode ?? '',
    city: address?.locality ?? '',
    region: address?.administrativeArea ?? '',
    country: address?.regionCode ?? '',
    hours: hoursFromGbp(location),
  }

  return {
    companyName: location.title || undefined,
    description: category ? `${location.title} — ${category}` : location.title || undefined,
    phone: location.phoneNumbers?.primaryPhone || undefined,
    website: location.websiteUri || undefined,
    categories: category ? [category] : [],
    location: mapped.city || mapped.street ? mapped : null,
    services: [],
    reviews: [],
    media: [],
    placeId: locationId,
    warnings: [],
  }
}

export function isGbpLocationPayload(value: unknown): value is GoogleBusinessLocation {
  return Boolean(value && typeof value === 'object' && 'name' in value)
}
