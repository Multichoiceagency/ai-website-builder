import {
  businessProfileSchema,
  campaignDraftSchema,
  type AdCreative,
  type AdExtension,
  type AdGroup,
  type CampaignBrief,
  type CampaignDraft,
  type CampaignObjective,
  type GeoTarget,
  type Keyword,
  type NegativeKeyword,
  type TrackingEventName,
} from '@platform/schemas'
import { aiGateway } from '../generation/index.js'
import type { CopySlots } from '../ai/gateway.js'

/**
 * AI campaign drafting (§20).
 *
 *   "Create a Google Ads campaign for emergency plumbers in Rotterdam"
 *     → campaign, objective, ad groups, keywords, negatives, ad variants,
 *       extensions, location targeting, a suggested budget and a landing page.
 *
 * Two rules shape everything below.
 *
 * **It produces a draft, never a campaign.** Campaign creation is medium risk
 * (ADR-0007): the output of this module is a proposal a human confirms. There
 * is no code path from here to an ad network.
 *
 * **It reuses the AI Gateway.** Copy comes from `aiGateway` in
 * `lib/generation`, which routes to Anthropic when a key exists and falls back
 * to the deterministic composer when it does not. So drafting works on an
 * installation with zero AI credentials — it just writes plainer ads.
 *
 * Structure (keywords, negatives, match types, targeting) is derived
 * deterministically rather than asked of a model. A hallucinated headline is
 * embarrassing; a hallucinated keyword costs money on every impression.
 */

// region Brief → business facts

/** Words that mean "we are in a hurry", which change intent and bidding. */
const URGENCY_TERMS = ['emergency', 'spoed', 'urgent', '24/7', 'noodgeval', 'direct', 'same day', 'vandaag']

/**
 * Trade words → the industry vocabulary the copy provider already knows. It is
 * a lookup, not a classifier: an unrecognized trade falls through to `local`,
 * which writes correct if unspecific copy rather than confident nonsense.
 */
const INDUSTRY_TERMS: Record<string, string[]> = {
  contractor: ['plumb', 'loodgiet', 'electric', 'elektric', 'roof', 'dak', 'build', 'bouw', 'install', 'cv-ketel', 'timmer', 'schilder', 'stukadoor'],
  healthcare: ['dentist', 'tandarts', 'clinic', 'kliniek', 'physio', 'fysio', 'doctor', 'huisarts', 'zorg', 'therap'],
  beauty: ['salon', 'kapper', 'barber', 'beauty', 'nagel', 'nail', 'spa', 'massage'],
  restaurant: ['restaurant', 'cater', 'pizzeria', 'bistro', 'lunchroom', 'bakker'],
  automotive: ['garage', 'auto', 'car', 'banden', 'tyre', 'apk', 'monteur'],
  legal: ['lawyer', 'advoca', 'notar', 'juridisch', 'legal'],
  accounting: ['account', 'boekhoud', 'administrat', 'belasting', 'tax'],
  real_estate: ['makelaar', 'estate', 'woning', 'vastgoed', 'huur'],
  agency: ['agency', 'bureau', 'marketing', 'reclame', 'design'],
  saas: ['saas', 'software', 'platform', 'app '],
  ecommerce: ['webshop', 'shop', 'store', 'ecommerce', 'winkel'],
  consultant: ['consult', 'advies', 'adviseur', 'coach'],
}

/** Dutch and English prepositions that introduce a place in a one-line brief. */
const LOCATION_MARKERS = [' in ', ' near ', ' around ', ' rondom ', ' omgeving ', ' regio ']

interface BriefFacts {
  service: string
  city: string
  industry: string
  urgent: boolean
  dutch: boolean
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Pull the two facts that actually change the campaign — what is sold and
 * where — out of a free-text brief.
 *
 * Everything it cannot establish becomes an entry in `assumptions`, which the
 * confirmation screen shows before anyone spends. Guessing quietly is the
 * failure mode this exists to avoid.
 */
export function extractBriefFacts(brief: CampaignBrief): BriefFacts {
  const prompt = brief.prompt.trim()
  const lower = prompt.toLowerCase()
  const dutch = brief.locale.startsWith('nl')

  // Strip the instruction half of the sentence so it cannot become a keyword.
  const subject = lower
    .replace(/^(create|make|build|maak|bouw|schrijf|zet op)\b/, '')
    .replace(/\ba\b|\ban\b|\been\b/g, ' ')
    .replace(/\b(google ads|meta|facebook|instagram|ads?|campagne|campaign|advertentie)\b/g, ' ')
    .replace(/\bfor\b|\bvoor\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let service = subject
  let city = ''

  for (const marker of LOCATION_MARKERS) {
    const at = subject.indexOf(marker)
    if (at === -1) continue
    service = subject.slice(0, at).trim()
    city = subject
      .slice(at + marker.length)
      .split(/[,.]/)[0]!
      .trim()
    break
  }

  const industry =
    Object.entries(INDUSTRY_TERMS).find(([, terms]) => terms.some((term) => lower.includes(term)))?.[0] ?? 'local'

  return {
    service: service || (dutch ? 'onze diensten' : 'our services'),
    city: city ? titleCase(city) : '',
    industry,
    urgent: URGENCY_TERMS.some((term) => lower.includes(term)),
    dutch,
  }
}

// endregion

// region Copy

/**
 * Words a headline must never end on. Trimming to a length limit on a word
 * boundary is not enough: "Emergency Plumbers in" is a whole word and still
 * reads as a sentence someone forgot to finish.
 */
const DANGLING_WORDS = new Set(['in', 'en', 'of', 'for', 'and', 'the', 'de', 'het', 'een', 'met', 'voor', 'bij', 'op', 'to', 'at', 'your', 'uw'])

/** Trim to a length limit on a word boundary. A mid-word cut is a rejected ad. */
function fit(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  // Under the limit it is already whole: a full stop the writer meant to be
  // there must survive.
  if (clean.length <= limit) return clean

  const cut = clean.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  const truncated = (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, '')

  const words = truncated.split(' ')
  while (words.length > 1 && DANGLING_WORDS.has(words[words.length - 1]!.toLowerCase())) {
    words.pop()
  }

  return words.join(' ').replace(/[\s,.;:-]+$/, '')
}

function uniqueFitted(candidates: string[], limit: number, max: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const candidate of candidates) {
    const value = fit(candidate ?? '', limit)
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
    if (result.length >= max) break
  }

  return result
}

/**
 * Copy slots → ad variants.
 *
 * Networks assemble headlines and descriptions themselves, so more distinct
 * options is strictly better — but only if they are genuinely distinct, hence
 * the dedupe. Padding a pool with near-duplicates trains the network on noise.
 */
function buildCreative(copy: CopySlots, facts: BriefFacts, finalUrl: string): AdCreative {
  const subject = titleCase(facts.service)

  const headlines = uniqueFitted(
    [
      copy.heroHeadline,
      // Both forms, longest first: `fit` keeps whichever survives 30
      // characters intact, and drops the preposition rather than the city.
      facts.city ? `${subject} in ${facts.city}` : subject,
      facts.city ? `${subject} ${facts.city}` : subject,
      copy.heroEyebrow,
      copy.primaryCta,
      ...copy.features.map((feature) => feature.title),
      copy.servicesHeading,
      copy.seoTitle,
      copy.secondaryCta,
      facts.urgent ? (facts.dutch ? 'Vandaag nog geholpen' : 'Same-day service') : '',
      copy.ctaHeading,
    ],
    30,
    15,
  )

  const descriptions = uniqueFitted(
    [copy.heroSubheadline, copy.ctaBody, copy.seoDescription, ...copy.features.map((feature) => feature.description)],
    90,
    4,
  )

  return {
    format: 'responsive_search',
    // The schema demands at least one of each; the deterministic provider
    // always returns a headline and a subheadline, so these fallbacks are a
    // guard rather than a normal path.
    headlines: headlines.length ? headlines : [fit(titleCase(facts.service), 30)],
    descriptions: descriptions.length ? descriptions : [fit(copy.seoDescription || copy.heroSubheadline, 90)],
    finalUrl,
    displayPath: facts.city ? [fit(facts.service.split(' ')[0] ?? '', 15), fit(facts.city, 15)] : [],
    mediaUrls: [],
    callToAction: copy.primaryCta,
  }
}

// endregion

// region Structure

/**
 * Keyword permutations for one theme.
 *
 * Match types are deliberately conservative: exact and phrase carry the budget,
 * broad is present only for the head term so the network has room to learn
 * without being handed the whole budget to explore with.
 */
function keywordsFor(theme: string, city: string, dutch: boolean): Keyword[] {
  const head = theme.toLowerCase().replace(/\s+/g, ' ').trim()
  const withCity = city ? `${head} ${city.toLowerCase()}` : ''
  const modifiers = dutch ? ['kosten', 'prijs', 'offerte', 'bedrijf'] : ['cost', 'price', 'quote', 'company']

  const candidates: Keyword[] = [
    { text: head, matchType: 'exact' },
    { text: head, matchType: 'phrase' },
    { text: head, matchType: 'broad' },
    ...(withCity ? ([{ text: withCity, matchType: 'exact' }, { text: withCity, matchType: 'phrase' }] as Keyword[]) : []),
    ...modifiers.map((modifier): Keyword => ({ text: `${head} ${modifier}`, matchType: 'phrase' })),
  ]

  const seen = new Set<string>()
  return candidates.filter((keyword) => {
    const key = `${keyword.text}|${keyword.matchType}`
    if (seen.has(key) || keyword.text.length > 80) return false
    seen.add(key)
    return true
  })
}

/**
 * Negatives that apply to almost every commercial campaign.
 *
 * These are the searches that look relevant and convert at zero: people looking
 * for a job, a free option, a definition or a DIY guide. Starting a campaign
 * without them is how the first week's budget disappears.
 */
function baselineNegatives(dutch: boolean): NegativeKeyword[] {
  const terms = dutch
    ? ['gratis', 'vacature', 'vacatures', 'baan', 'salaris', 'cursus', 'opleiding', 'zelf doen', 'tweedehands', 'betekenis', 'wikipedia', 'klacht']
    : ['free', 'job', 'jobs', 'vacancy', 'salary', 'course', 'training', 'diy', 'second hand', 'meaning', 'wikipedia', 'complaint']

  return terms.map((text) => ({ text, matchType: 'phrase', scope: 'campaign' }))
}

/**
 * Which of *our* tracking events this campaign optimizes towards.
 *
 * Named in the platform vocabulary, so the same choice works for whichever
 * network the campaign is on. Turning it into a conversion action is the
 * adapter's problem, and the mapping lives in `ads_conversion_mappings`.
 */
function conversionEventsFor(objective: CampaignObjective): TrackingEventName[] {
  switch (objective) {
    case 'sales':
      return ['purchase', 'begin_checkout']
    case 'calls':
      return ['phone_click', 'lead']
    case 'traffic':
      return ['service_view']
    case 'awareness':
      return ['page_view']
    case 'app_installs':
      return ['lead']
    case 'leads':
    default:
      return ['lead', 'form_submit', 'quote_requested']
  }
}

function extensionsFor(copy: CopySlots, facts: BriefFacts): AdExtension[] {
  const extensions: AdExtension[] = copy.features.slice(0, 4).map((feature) => ({
    type: 'callout',
    label: fit(feature.title, 25),
    description: '',
    url: '',
    items: [],
  }))

  extensions.push({
    type: 'sitelink',
    label: facts.dutch ? 'Diensten' : 'Services',
    description: fit(copy.servicesIntro, 160),
    url: facts.dutch ? '/diensten' : '/services',
    items: [],
  })
  extensions.push({
    type: 'sitelink',
    label: 'Contact',
    description: fit(copy.ctaBody, 160),
    url: '/contact',
    items: [],
  })

  if (facts.city) {
    extensions.push({
      type: 'structured_snippet',
      label: facts.dutch ? 'Werkgebied' : 'Service area',
      description: '',
      url: '',
      items: [facts.city],
    })
  }

  return extensions
}

function geoTargetsFor(facts: BriefFacts, locale: string): GeoTarget[] {
  if (facts.city) {
    return [{ type: 'radius', value: facts.city, radiusKm: 25, exclude: false }]
  }
  return [{ type: 'country', value: locale.slice(-2).toUpperCase() === 'NL' || locale.startsWith('nl') ? 'NL' : 'GB', exclude: false }]
}

// endregion

// region Draft

/**
 * A budget nobody asked for.
 *
 * €20/day is enough for a search campaign to gather signal and small enough
 * that a mistaken confirmation is an annoyance rather than an incident. It is
 * only ever used when the brief carries no budget, and it always lands in
 * `assumptions` so the confirmation screen states it plainly. Nothing here ever
 * proposes *more* than the user asked for.
 */
const DEFAULT_DAILY_BUDGET_MINOR = 20_00

export interface DraftedCampaign {
  draft: CampaignDraft
  model: string
}

export async function draftCampaign(brief: CampaignBrief): Promise<DraftedCampaign> {
  const facts = extractBriefFacts(brief)
  const objective = brief.objective ?? (facts.urgent ? 'calls' : 'leads')
  const channel = brief.channel ?? (brief.provider === 'meta_ads' ? 'social' : 'search')

  const assumptions: string[] = []
  const warnings: string[] = []

  // A profile assembled only from what the brief actually said. The copy
  // provider can then only write things the brief supports — the same rule the
  // website generator follows.
  const profile = businessProfileSchema.parse({
    company: {
      name: facts.city ? `${titleCase(facts.service)} ${facts.city}` : titleCase(facts.service),
      // The extracted subject, not the raw prompt. Feeding the instruction back
      // in is how "Create a Google Ads campaign for…" ends up as ad copy.
      shortDescription: facts.city
        ? `${titleCase(facts.service)} in ${facts.city}`
        : titleCase(facts.service),
      industry: facts.industry,
    },
    locations: facts.city ? [{ city: facts.city }] : [],
    // Empty rather than absent: the brief carries no contact details, and the
    // copy provider must be able to see that it has none rather than fail.
    contact: {},
    services: [{ name: titleCase(facts.service), description: '', prominence: 1 }],
    locale: brief.locale.slice(0, 2),
  })

  const written = await aiGateway.generateCopy({
    profile,
    locale: brief.locale,
    goal: `ads:${objective}`,
  })
  const copy = written.slots

  if (!facts.city) {
    assumptions.push('No location was given, so targeting is country-wide. Narrow it before publishing.')
  } else {
    assumptions.push(`Targeting a ${25} km radius around ${facts.city}.`)
  }

  const budgetMinor = brief.dailyBudgetMinor ?? DEFAULT_DAILY_BUDGET_MINOR
  if (brief.dailyBudgetMinor === undefined) {
    assumptions.push(
      `No budget was given, so this draft suggests ${(DEFAULT_DAILY_BUDGET_MINOR / 100).toFixed(2)} ${brief.currency} per day. Change it before you confirm.`,
    )
  }

  const finalUrl = brief.landingPageUrl.trim()
  if (!finalUrl) {
    warnings.push('No landing page was given. Every ad currently points at the site root, which converts far worse than a page about this service.')
  }

  if (brief.provider === 'meta_ads') {
    warnings.push('Meta has no keywords. These search terms become interest targeting, which is an approximation — review it before publishing.')
  }

  const creative = buildCreative(copy, facts, finalUrl || '/')
  if (creative.headlines.length < 3) {
    warnings.push('Fewer than three distinct headlines could be written from this brief. Add more detail, or write the extra variants by hand.')
  }

  const generalName = facts.dutch ? titleCase(facts.service) : titleCase(facts.service)
  const adGroups: AdGroup[] = [
    {
      name: facts.city ? `${generalName} — ${facts.city}` : generalName,
      theme: facts.service,
      keywords: keywordsFor(facts.service, facts.city, facts.dutch),
      negativeKeywords: [],
      ads: [creative],
      defaultBidMinor: undefined,
    },
  ]

  // Urgency is a different searcher with a different budget tolerance, so it
  // gets its own group rather than being buried in a shared one.
  if (facts.urgent) {
    const urgentTheme = facts.dutch ? `spoed ${facts.service}` : `emergency ${facts.service}`
    adGroups.push({
      name: facts.dutch ? 'Spoed' : 'Emergency',
      theme: urgentTheme,
      keywords: keywordsFor(urgentTheme, facts.city, facts.dutch),
      negativeKeywords: [],
      ads: [creative],
      defaultBidMinor: undefined,
    })
  }

  const draft = campaignDraftSchema.parse({
    provider: brief.provider,
    accountId: brief.accountId,
    name: facts.city ? `${generalName} — ${facts.city}` : `${generalName} — ${objective}`,
    objective,
    channel,
    budget: { amountMinor: budgetMinor, currency: brief.currency, period: 'daily' },
    bidding: { type: objective === 'sales' ? 'maximize_conversion_value' : 'maximize_conversions' },
    geoTargets: geoTargetsFor(facts, brief.locale),
    languages: [brief.locale.slice(0, 2)],
    startDate: null,
    endDate: null,
    landingPageUrl: finalUrl,
    adGroups,
    // Negatives sit at campaign level so every group inherits them.
    extensions: extensionsFor(copy, facts),
    conversionEvents: conversionEventsFor(objective),
    source: 'ai',
    assumptions,
    warnings,
  })

  return {
    draft: {
      ...draft,
      adGroups: draft.adGroups.map((group, index) => ({
        ...group,
        negativeKeywords: index === 0 ? baselineNegatives(facts.dutch) : group.negativeKeywords,
      })),
    },
    model: written.model,
  }
}

// endregion
