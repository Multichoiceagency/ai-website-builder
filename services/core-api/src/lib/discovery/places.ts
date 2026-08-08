import type { BusinessLocation, BusinessReview, BusinessService } from '@platform/schemas'
import { env } from '../../config/env.js'

/**
 * Places API (New) + Geocoding enrichment for onboarding discovery.
 * Uses platform `GOOGLE_API_KEY` — never the user's OAuth token.
 */

export interface PlacesEnrichment {
  companyName?: string
  description?: string
  phone?: string
  website?: string
  categories: string[]
  location: BusinessLocation | null
  services: BusinessService[]
  reviews: BusinessReview[]
  media: string[]
  placeId?: string
  warnings: string[]
}

function apiKey(): string | undefined {
  const key = env.GOOGLE_API_KEY?.trim()
  return key || undefined
}

export function isPlacesConfigured(): boolean {
  return Boolean(apiKey())
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const key = apiKey()
  if (!key) return null
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', key)
  const response = await fetch(url)
  if (!response.ok) return null
  const payload = (await response.json()) as {
    status: string
    results?: { formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }[]
  }
  if (payload.status !== 'OK' || !payload.results?.[0]?.geometry?.location) return null
  const hit = payload.results[0]
  return {
    lat: hit.geometry!.location!.lat,
    lng: hit.geometry!.location!.lng,
    formatted: hit.formatted_address ?? address,
  }
}

/**
 * Text Text (Places API New) for a business name near a city.
 */
export async function enrichFromPlaces(input: {
  businessName: string
  city?: string
  locale?: string
}): Promise<PlacesEnrichment> {
  const warnings: string[] = []
  const empty: PlacesEnrichment = {
    categories: [],
    location: null,
    services: [],
    reviews: [],
    media: [],
    warnings,
  }

  const key = apiKey()
  if (!key) {
    warnings.push('GOOGLE_API_KEY is not set, so Places enrichment was skipped.')
    return empty
  }

  const query = [input.businessName.trim(), input.city?.trim()].filter(Boolean).join(' ')
  if (query.length < 2) {
    warnings.push('Need a business name (and preferably a city) for Places search.')
    return empty
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.types',
          'places.rating',
          'places.userRatingCount',
          'places.editorialSummary',
          'places.photos',
          'places.regularOpeningHours',
          'places.addressComponents',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: (input.locale ?? 'nl').slice(0, 2),
        maxResultCount: 1,
      }),
    })

    if (!response.ok) {
      warnings.push(`Places search failed (${response.status}).`)
      return empty
    }

    const payload = (await response.json()) as { places?: Record<string, unknown>[] }
    const place = payload.places?.[0]
    if (!place) {
      warnings.push(`No Places match for “${query}”.`)
      // Still try geocoding the city alone so the profile has coordinates.
      if (input.city) {
        const geo = await geocodeAddress(`${input.businessName}, ${input.city}`)
        if (geo) {
          return {
            ...empty,
            location: {
              label: input.businessName,
              street: '',
              postalCode: '',
              city: input.city,
              region: '',
              country: '',
              latitude: geo.lat,
              longitude: geo.lng,
              hours: [],
            },
            warnings: [...warnings, 'Geocoded name+city without a Places match.'],
          }
        }
      }
      return empty
    }

    const components = (place.addressComponents as { longText?: string; types?: string[] }[] | undefined) ?? []
    const component = (type: string) =>
      components.find((entry) => entry.types?.includes(type))?.longText ?? ''

    const locationCoords = place.location as { latitude?: number; longitude?: number } | undefined
    let latitude = locationCoords?.latitude
    let longitude = locationCoords?.longitude

    if ((latitude == null || longitude == null) && place.formattedAddress) {
      const geo = await geocodeAddress(String(place.formattedAddress))
      if (geo) {
        latitude = geo.lat
        longitude = geo.lng
      }
    }

    const displayName = (place.displayName as { text?: string } | undefined)?.text
    const editorial = (place.editorialSummary as { text?: string } | undefined)?.text
    const types = (place.types as string[] | undefined) ?? []
    const photos = (place.photos as { name?: string }[] | undefined) ?? []

    const media = photos
      .slice(0, 6)
      .map((photo) => photo.name)
      .filter(Boolean)
      .map((name) => `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&key=${key}`)

    const rating = typeof place.rating === 'number' ? place.rating : undefined
    const reviews: BusinessReview[] =
      rating != null
        ? [
            {
              author: 'Google',
              rating,
              text: `${place.userRatingCount ?? 0} Google reviews`,
              source: 'google_places',
            },
          ]
        : []

    return {
      companyName: displayName,
      description: editorial,
      phone: typeof place.nationalPhoneNumber === 'string' ? place.nationalPhoneNumber : undefined,
      website: typeof place.websiteUri === 'string' ? place.websiteUri : undefined,
      categories: types.filter((type) => !type.startsWith('geocode')).slice(0, 8),
      location: {
        label: displayName ?? input.businessName,
        street: [component('route'), component('street_number')].filter(Boolean).join(' '),
        postalCode: component('postal_code'),
        city: component('locality') || component('postal_town') || input.city || '',
        region: component('administrative_area_level_1'),
        country: component('country'),
        latitude,
        longitude,
        hours: [],
      },
      services: [],
      reviews,
      media,
      placeId: typeof place.id === 'string' ? place.id : undefined,
      warnings,
    }
  } catch {
    warnings.push('Places enrichment failed unexpectedly.')
    return empty
  }
}
