import {
  businessProfileSchema,
  type BusinessProfile,
  type GenerateFromPromptInput,
} from '@platform/schemas'
import { generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'
import { getPrompt } from './prompt-registry.js'
import { discoverBusiness } from '../discovery/index.js'
import { normalizeUrl } from '../discovery/fetch.js'

/**
 * One-prompt website builder — Ambora-style.
 * URL in prompt → discover; otherwise LLM / heuristic BusinessProfile, then
 * the same /generate pipeline.
 */

const URL_IN_PROMPT =
  /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)(?:\/[^\s]*)?/i

function extractWebsite(prompt: string): string | undefined {
  const match = prompt.match(URL_IN_PROMPT)
  if (!match?.[0]) return undefined
  try {
    return normalizeUrl(match[0]).toString()
  } catch {
    return undefined
  }
}

function heuristicProfile(input: GenerateFromPromptInput): BusinessProfile {
  const prompt = input.prompt.trim()
  const dutch = input.locale.toLowerCase().startsWith('nl')
  const nameMatch =
    prompt.match(/(?:for|voor|called|named|genaamd)\s+["']?([A-Z][\w &'.-]{2,60})/i) ??
    prompt.match(/^([A-Z][\w &'.-]{2,40})\s+(?:is|is een|is a)\b/)
  const name = nameMatch?.[1]?.trim() || (dutch ? 'Nieuw bedrijf' : 'New business')

  const lower = prompt.toLowerCase()
  let industry = 'local'
  if (/(restaurant|café|cafe|bistro|bakker)/.test(lower)) industry = 'restaurant'
  else if (/(agency|bureau|studio|design)/.test(lower)) industry = 'agency'
  else if (/(shop|store|winkel|ecommerce|webshop)/.test(lower)) industry = 'ecommerce'
  else if (/(saas|software|platform|app\b)/.test(lower)) industry = 'saas'
  else if (/(loodgiet|plumb|elektricien|installat|dakdekk)/.test(lower)) industry = 'local'

  return businessProfileSchema.parse({
    company: {
      name,
      legalName: '',
      description: prompt.slice(0, 2000),
      shortDescription: prompt.slice(0, 280),
      industry,
      categories: [],
    },
    locations: [],
    contact: { phone: '', email: '', website: '', whatsapp: '' },
    services: [],
    brand: {
      logo: '',
      colors: [],
      primaryColor: '',
      fonts: [],
      tone: industry === 'agency' ? 'premium' : 'professional',
      adjectives: [],
      audience: '',
      positioning: prompt.slice(0, 300),
      prohibitedWords: [],
    },
    reviews: [],
    socials: [],
    media: [],
    locale: input.locale,
    sources: [{ source: 'manual', confidence: 0.7 }],
    crawledUrls: [],
    warnings: ['Profile synthesized from prompt — review facts before publishing.'],
  })
}

async function profileWithModel(input: GenerateFromPromptInput): Promise<BusinessProfile | null> {
  const system =
    getPrompt('site-builder.system')?.text ??
    `You turn a short website brief into a BusinessProfile JSON object.
Return ONLY JSON with keys: company{name,description,shortDescription,industry,categories[]},
contact{phone,email,website}, services[{name,description,prominence}], brand{tone,positioning,audience},
locale. industry one of: local,saas,agency,ecommerce,restaurant,healthcare,automotive,legal,accounting,real_estate,consultant,beauty.
No HTML. Match the brief language (${input.locale}).`

  try {
    const result = await generateGeminiContent({
      model: resolveGeminiModel(),
      systemInstruction: system,
      userText: input.prompt,
      responseMimeType: 'application/json',
      maxOutputTokens: 2_048,
    })
    if (!result?.text) return null
    const parsed = JSON.parse(result.text) as Record<string, unknown>
    const base = heuristicProfile(input)
    return businessProfileSchema.parse({
      ...base,
      ...parsed,
      company: {
        ...base.company,
        ...((parsed.company as object) ?? {}),
      },
      contact: {
        ...base.contact,
        ...((parsed.contact as object) ?? {}),
      },
      brand: {
        ...base.brand,
        ...((parsed.brand as object) ?? {}),
      },
      locale: input.locale,
      sources: [{ source: 'manual', confidence: 0.8 }],
      crawledUrls: [],
      warnings: [],
    })
  } catch {
    return null
  }
}

export async function profileFromPrompt(input: GenerateFromPromptInput): Promise<BusinessProfile> {
  const website = extractWebsite(input.prompt)
  if (website) {
    const discovered = await discoverBusiness({
      website,
      locale: input.locale,
      socialUrls: [],
      maxPages: 8,
    })
    return discovered.profile
  }

  return (await profileWithModel(input)) ?? heuristicProfile(input)
}
