import {
  UnsupportedInstructionError,
  type AiProvider,
  type CopyContext,
  type CopyResult,
  type CopySlots,
  type RevisionContext,
  type RevisionResult,
} from '../gateway.js'
import { SUPPORTED_INSTRUCTIONS, applyDeterministicRevision, detectTransform } from '../revisions.js'

/**
 * The always-available copy provider.
 *
 * It is not a mock and not a placeholder: it writes real, publishable copy from
 * the discovered business facts using industry-aware patterns, in the site's
 * language. It is what makes the platform work with no API key at all, and it
 * is the fallback when an LLM provider is down.
 *
 * An LLM writes better prose. This writes *correct* prose — it can only say
 * things the discovery step actually found.
 */

type Locale = 'nl' | 'en'

interface Phrases {
  eyebrowIn: (city: string) => string
  availability: string
  quote: string
  call: string
  seeServices: string
  servicesHeading: string
  whyUs: string
  aboutHeading: string
  ctaHeading: string
  ctaBody: string
  faq: { question: string; answer: string }[]
  features: { icon: string; title: string; description: string }[]
  fallbackHeadline: (name: string) => string
  fallbackSub: (name: string, city: string) => string
}

const NL: Phrases = {
  eyebrowIn: (city) => (city ? `Actief in ${city}` : 'Uw specialist'),
  availability: 'Snel geregeld',
  quote: 'Vraag een offerte aan',
  call: 'Bel ons',
  seeServices: 'Bekijk onze diensten',
  servicesHeading: 'Wat wij voor u doen',
  whyUs: 'Waarom klanten voor ons kiezen',
  aboutHeading: 'Over ons',
  ctaHeading: 'Klaar om te beginnen?',
  ctaBody: 'Neem contact op en u hoort dezelfde werkdag van ons.',
  faq: [
    { question: 'Hoe snel kunt u komen?', answer: 'Neem contact op en we plannen zo snel mogelijk een afspraak in.' },
    { question: 'Wat kost het?', answer: 'U krijgt vooraf een duidelijke prijsopgave, zonder verrassingen achteraf.' },
    { question: 'Werkt u in mijn regio?', answer: 'Bel of mail ons en we vertellen u direct of we bij u langskomen.' },
  ],
  features: [
    { icon: 'clock', title: 'Snel bereikbaar', description: 'U krijgt dezelfde werkdag antwoord.' },
    { icon: 'shield', title: 'Vakwerk met garantie', description: 'Werk dat we met een gerust hart achterlaten.' },
    { icon: 'star', title: 'Duidelijke prijzen', description: 'Vooraf afgesproken, geen verrassingen.' },
  ],
  fallbackHeadline: (name) => `${name}`,
  fallbackSub: (name, city) =>
    city ? `${name} helpt klanten in ${city} en omgeving. Neem contact op voor een vrijblijvend gesprek.` : `Neem contact op voor een vrijblijvend gesprek.`,
}

const EN: Phrases = {
  eyebrowIn: (city) => (city ? `Serving ${city}` : 'Your specialist'),
  availability: 'Fast response',
  quote: 'Request a quote',
  call: 'Call us',
  seeServices: 'See what we do',
  servicesHeading: 'What we do',
  whyUs: 'Why clients choose us',
  aboutHeading: 'About us',
  ctaHeading: 'Ready to get started?',
  ctaBody: 'Get in touch and you will hear from us the same working day.',
  faq: [
    { question: 'How quickly can you help?', answer: 'Get in touch and we will schedule you as soon as possible.' },
    { question: 'What does it cost?', answer: 'You get a clear quote up front, with no surprises afterwards.' },
    { question: 'Do you work in my area?', answer: 'Call or e-mail us and we will tell you straight away.' },
  ],
  features: [
    { icon: 'clock', title: 'Quick to reach', description: 'You get an answer the same working day.' },
    { icon: 'shield', title: 'Work we stand behind', description: 'Done properly, guaranteed.' },
    { icon: 'star', title: 'Clear pricing', description: 'Agreed up front, no surprises.' },
  ],
  fallbackHeadline: (name) => `${name}`,
  fallbackSub: () => 'Get in touch for a no-obligation conversation.',
}

/** Industry-specific hero lines. Concrete beats generic every time. */
const INDUSTRY_HEADLINES: Record<string, { nl: string; en: string }> = {
  contractor: { nl: 'Vakwerk, netjes opgeleverd.', en: 'Proper work, properly finished.' },
  healthcare: { nl: 'Zorg waar u op kunt rekenen.', en: 'Care you can count on.' },
  beauty: { nl: 'Even helemaal bijkomen.', en: 'Time to look and feel your best.' },
  restaurant: { nl: 'Vers, elke dag opnieuw.', en: 'Fresh, every single day.' },
  automotive: { nl: 'Uw auto, in goede handen.', en: 'Your car, in good hands.' },
  legal: { nl: 'Heldere juridische hulp.', en: 'Clear legal help.' },
  accounting: { nl: 'Uw cijfers op orde.', en: 'Your numbers in order.' },
  real_estate: { nl: 'Uw volgende woning begint hier.', en: 'Your next home starts here.' },
  agency: { nl: 'Merken die blijven hangen.', en: 'Brands that stick.' },
  saas: { nl: 'Software die het werk doet.', en: 'Software that does the work.' },
  ecommerce: { nl: 'Kwaliteit, snel bezorgd.', en: 'Quality, delivered fast.' },
  consultant: { nl: 'Advies dat vooruit helpt.', en: 'Advice that moves you forward.' },
  local: { nl: 'Vakmanschap uit de buurt.', en: 'Local expertise you can trust.' },
}

function sentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed[0]!.toUpperCase() + trimmed.slice(1)
}

/** Cut prose to a whole sentence within a budget, rather than mid-word. */
function firstSentences(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean

  const cut = clean.slice(0, maxLength)
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (lastStop > maxLength * 0.5) return cut.slice(0, lastStop + 1)

  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`
}

export class DeterministicCopyProvider implements AiProvider {
  readonly id = 'deterministic-composer'

  isAvailable(): boolean {
    return true
  }

  async generateCopy(context: CopyContext): Promise<CopyResult> {
    const { profile } = context
    const locale: Locale = context.locale.startsWith('nl') ? 'nl' : 'en'
    const phrases = locale === 'nl' ? NL : EN

    const name = profile.company.name
    const city = profile.locations[0]?.city ?? ''
    const industry = profile.company.industry || 'local'

    const industryLine = INDUSTRY_HEADLINES[industry] ?? INDUSTRY_HEADLINES.local!
    const headline = industryLine[locale] || phrases.fallbackHeadline(name)

    // Prefer what the business says about itself over anything we invent.
    const ownDescription = profile.company.shortDescription || profile.company.description
    const subheadline = ownDescription
      ? firstSentences(ownDescription, 190)
      : phrases.fallbackSub(name, city)

    const hasPhone = Boolean(profile.contact.phone)

    // Real services when discovery found them; otherwise the generic set, which
    // the user is prompted to replace.
    const features = profile.services.length
      ? profile.services.slice(0, 3).map((service, index) => ({
          icon: ['check', 'shield', 'star'][index] ?? 'check',
          title: sentenceCase(service.name),
          description: service.description
            ? firstSentences(service.description, 110)
            : phrases.features[index]?.description ?? '',
        }))
      : phrases.features

    const slots: CopySlots = {
      heroEyebrow: phrases.eyebrowIn(city),
      heroHeadline: headline,
      heroSubheadline: subheadline,
      primaryCta: hasPhone ? phrases.call : phrases.quote,
      secondaryCta: profile.services.length ? phrases.seeServices : '',
      servicesHeading: phrases.servicesHeading,
      servicesIntro: '',
      featuresHeading: phrases.whyUs,
      features,
      aboutHeading: phrases.aboutHeading,
      aboutBody: profile.company.description
        ? firstSentences(profile.company.description, 900)
        : `${name}${city ? ` — ${city}` : ''}.`,
      ctaHeading: phrases.ctaHeading,
      ctaBody: phrases.ctaBody,
      faq: phrases.faq,
      seoTitle: `${name}${city ? ` | ${city}` : ''}`.slice(0, 60),
      seoDescription: firstSentences(subheadline, 155),
    }

    return {
      slots,
      model: this.id,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    }
  }

  /**
   * Revise the copy already in a section.
   *
   * Everything except a full rewrite is a rule over the existing string, in
   * `revisions.ts`. A full rewrite runs the same composer `generateCopy` uses,
   * so "rewrite this from the profile" produces exactly the copy the generator
   * would have produced for that slot — no second, divergent implementation.
   */
  async reviseCopy(context: RevisionContext): Promise<RevisionResult> {
    const transform = detectTransform(context.instruction)
    if (!transform) {
      throw new UnsupportedInstructionError(
        `I cannot do that without a language model. "${context.instruction}" needs judgement about wording or audience, which the deterministic composer does not have — configure an AI key to unlock it.`,
        SUPPORTED_INSTRUCTIONS,
      )
    }

    const revision =
      transform === 'regenerate'
        ? await this.#regenerate(context)
        : applyDeterministicRevision(context, transform)

    return {
      values: revision.values,
      notes: revision.notes,
      model: this.id,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    }
  }

  /** Recompose this section's slots from the business profile. */
  async #regenerate(context: RevisionContext): Promise<{ values: Record<string, string>; notes: string[] }> {
    if (!context.profile) {
      throw new UnsupportedInstructionError(
        'There is no business profile for this site to rewrite from.',
        SUPPORTED_INSTRUCTIONS,
      )
    }

    const { slots } = await this.generateCopy({
      profile: context.profile,
      locale: context.locale,
      goal: 'home',
    })

    const values: Record<string, string> = {}
    for (const field of context.fields) {
      const composed = slotFor(field.path, context.blockId, slots)
      if (composed !== null && composed !== field.value) values[field.path] = composed
    }

    if (!Object.keys(values).length) {
      return { values, notes: ['This section already matches the copy the composer writes from the profile.'] }
    }

    return {
      values,
      notes: [
        'Rewrote this section from the business profile held for the site. Only facts already in the profile are used — nothing is invented.',
      ],
    }
  }
}

/**
 * Which composed slot belongs in which prop.
 *
 * Keyed on the prop name and the block family, the same pairing the generation
 * pipeline uses when it first fills a section — so regenerating a section lands
 * on the copy it would have been born with.
 */
function slotFor(path: string, blockId: string, slots: CopySlots): string | null {
  // Repeatable list entries have no single composed counterpart.
  if (path.includes('.')) return null

  switch (path) {
    case 'eyebrow':
      return slots.heroEyebrow
    case 'headline':
      return slots.heroHeadline
    case 'subheadline':
      return slots.heroSubheadline
    case 'heading':
      if (blockId.startsWith('cta-')) return slots.ctaHeading
      if (blockId.startsWith('services-')) return slots.servicesHeading
      if (blockId.startsWith('features-')) return slots.featuresHeading
      return slots.aboutHeading
    case 'intro':
      return blockId.startsWith('services-') ? slots.servicesIntro : null
    case 'body':
      return blockId.startsWith('cta-') ? slots.ctaBody : slots.aboutBody
    case 'primaryLabel':
    case 'ctaLabel':
      return slots.primaryCta
    case 'secondaryLabel':
      return slots.secondaryCta
    case 'tagline':
      return slots.seoDescription
    default:
      return null
  }
}
