import { z } from 'zod'
import { PLANS, type Plan } from './tenant.js'

/**
 * The model registry (§9, §68).
 *
 * Users pick a model; the platform decides what that costs them and whether
 * their plan allows it. Cost is expressed as a **multiplier against the plan's
 * AI credit baseline**, not in dollars — customers should never have to reason
 * about per-token provider pricing, and provider pricing changes without
 * changing what we promised the customer.
 */

export const aiProviderIdSchema = z.enum(['platform', 'anthropic', 'openai', 'google'])
export type AiProviderId = z.infer<typeof aiProviderIdSchema>

export const aiModelSchema = z.object({
  id: z.string().max(64),
  label: z.string().max(60),
  provider: aiProviderIdSchema,
  /** Credit multiplier. 1 is the reference cost for one generation. */
  costMultiplier: z.number().min(0),
  /** Lowest plan that may select this model. */
  minimumPlan: z.enum(PLANS),
  description: z.string().max(200),
  /** Chosen when the user expresses no preference. */
  isDefault: z.boolean().default(false),
})
export type AiModel = z.infer<typeof aiModelSchema>

/**
 * Ordered cheapest-capable first. `platform-composer` is deliberately first and
 * free: it is the model that always works, with no credentials and no credits,
 * which is what keeps the product usable on every plan and during an outage.
 */
export const AI_MODELS: AiModel[] = [
  {
    id: 'platform-composer',
    label: 'Platform Composer',
    provider: 'platform',
    costMultiplier: 0,
    minimumPlan: 'launch',
    description: 'Writes only from what we found about your business. Free, always available.',
    isDefault: true,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    provider: 'anthropic',
    costMultiplier: 0.3,
    minimumPlan: 'launch',
    description: 'Fast and inexpensive. Good for short copy and quick edits.',
    isDefault: false,
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    provider: 'google',
    // $1.50/$7.50 per MTok — half of Sonnet's rate, hence half its multiplier.
    costMultiplier: 0.3,
    minimumPlan: 'launch',
    description: 'Fast and inexpensive. Writes a full website well at a low price.',
    isDefault: false,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    provider: 'anthropic',
    costMultiplier: 0.6,
    minimumPlan: 'grow',
    description: 'The balanced default for writing a full website.',
    isDefault: false,
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5',
    provider: 'anthropic',
    costMultiplier: 1.2,
    minimumPlan: 'scale',
    description: 'Strongest reasoning. Best for brand voice and complex positioning.',
    isDefault: false,
  },
  {
    id: 'claude-fable-5',
    label: 'Fable 5',
    provider: 'anthropic',
    costMultiplier: 1,
    minimumPlan: 'advanced',
    description: 'Creative, editorial writing for brand-led sites.',
    isDefault: false,
  },
]

/** What the picker renders for one tenant: allowed, upgradeable, or unconfigured. */
export const aiModelAvailabilitySchema = aiModelSchema.extend({
  /** Selectable right now. */
  available: z.boolean(),
  /** Blocked by plan rather than by configuration. */
  requiresUpgrade: z.boolean(),
  /** Set when the provider has no credentials on this installation. */
  unavailableReason: z.string().max(200).optional(),
})
export type AiModelAvailability = z.infer<typeof aiModelAvailabilitySchema>

export function planAllowsModel(plan: Plan, model: AiModel): boolean {
  return PLANS.indexOf(plan) >= PLANS.indexOf(model.minimumPlan)
}

/** Formatted for the picker: `0.6×`, `Free`. */
export function formatCostMultiplier(multiplier: number): string {
  if (multiplier === 0) return 'Free'
  return `${multiplier}×`
}
