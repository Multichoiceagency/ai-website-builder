import { z } from 'zod'
import type { AnalyticsLivePresence, AnalyticsLiveRecommendation } from '@platform/schemas'
import { aiGateway } from '../generation/index.js'
import { generateGeminiContent, resolveGeminiModel } from './providers/gemini-client.js'

const recommendationsSchema = z.object({
  recommendations: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(400),
        tone: z.enum(['info', 'action', 'warning']).default('info'),
        href: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(5),
})

/**
 * AI tips for Live View — website + ecommerce actions from the live snapshot.
 * Falls back to the rule-based list already on the presence payload.
 */
export async function recommendFromLivePresence(
  presence: AnalyticsLivePresence,
): Promise<AnalyticsLiveRecommendation[]> {
  const fallback = presence.recommendations
  const available = aiGateway.available()
  if (!available.some((provider) => provider.id === 'google')) return fallback

  const summary = {
    activeCount: presence.activeCount,
    windowMinutes: presence.windowMinutes,
    channels: presence.channels,
    locations: presence.locations.slice(0, 8),
    samplePaths: presence.visitors
      .map((visitor) => visitor.path)
      .filter(Boolean)
      .slice(0, 8),
  }

  const system = `You advise a merchant using a website + ecommerce builder.
Return JSON only matching the schema.
Rules:
- 2 to 4 recommendations max.
- tone is info | action | warning.
- href must be one of: /analytics/tracking, /analytics/live, /commerce/products, /commerce/orders, /commerce/feeds, /website/pages, /growth/seo, /apps
- Base advice only on the live snapshot. Do not invent visitor counts or cities.
- Cover website and ecommerce when both are relevant.`

  try {
    const result = await generateGeminiContent({
      model: resolveGeminiModel(),
      systemInstruction: system,
      userText: `Live presence snapshot:\n${JSON.stringify(summary)}`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          recommendations: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                title: { type: 'STRING' },
                body: { type: 'STRING' },
                tone: { type: 'STRING' },
                href: { type: 'STRING' },
              },
              required: ['id', 'title', 'body', 'tone'],
            },
          },
        },
        required: ['recommendations'],
      },
      maxOutputTokens: 800,
      thinking: 'off',
      timeoutMs: 25_000,
    })
    const parsed = recommendationsSchema.safeParse(JSON.parse(result.text))
    if (parsed.success) return parsed.data.recommendations
  } catch {
    return fallback
  }

  return fallback
}
