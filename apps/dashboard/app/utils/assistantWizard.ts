/**
 * Guided A–Z design questionnaire for the assistant (Lovable-style).
 * Answers become a structured brief before tools / generation run.
 */

export type WizardOptionKind = 'choice' | 'palette' | 'multi' | 'text'

export interface WizardOption {
  id: string
  label: string
  /** For palette: 3–5 hex swatches left→right. */
  swatches?: string[]
  description?: string
}

export interface WizardStep {
  id: string
  question: string
  kind: WizardOptionKind
  options?: WizardOption[]
  placeholder?: string
  /** Soft hint under the question. */
  hint?: string
}

export interface WizardAnswers {
  [stepId: string]: string | string[]
}

/** Detect when free text should open the guided design flow instead of a one-shot reply. */
/**
 * A spec already carries the answers the wizard would ask for. Thresholds
 * mirror the server's code-brief.ts; if one moves, the other must.
 */
export function isBuildSpec(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.length >= 240 ||
    /(<style|<script|@media|@keyframes|position\s*:\s*fixed|self-contained html|html file|dependencies\s*:)/i.test(trimmed)
  )
}

export function wantsGuidedDesign(text: string): boolean {
  const lower = text.trim().toLowerCase()
  if (!lower) return false
  if (isBuildSpec(text)) return false
  if (/^(hi|hello|hey|thanks|thank you)\b/.test(lower) && lower.length < 24) return false
  return (
    /\b(landing\s*page|website|web\s*site|homepage|home\s*page)\b/.test(lower) ||
    (/\b(create|build|make|design|generate|redesign|start)\b/.test(lower) &&
      /\b(page|site|web|brand|shop|store|landing)\b/.test(lower)) ||
    /\b(new site|new website|build me|make me)\b/.test(lower)
  )
}

export const DESIGN_WIZARD_STEPS: WizardStep[] = [
  {
    id: 'goal',
    question: 'What are we building?',
    kind: 'choice',
    hint: 'This shapes structure and sections.',
    options: [
      { id: 'landing', label: 'Landing page', description: 'One polished page to convert' },
      { id: 'multipage', label: 'Multi-page site', description: 'Home + services + about + contact' },
      { id: 'shop', label: 'Shop / catalogue', description: 'Products with a storefront feel' },
      { id: 'portfolio', label: 'Portfolio', description: 'Work-first, light chrome' },
    ],
  },
  {
    id: 'palette',
    question: 'Which colour palette fits best?',
    kind: 'palette',
    hint: 'You can refine tokens later in Style Guide.',
    options: [
      {
        id: 'ink-ocean',
        label: 'Ink & ocean',
        swatches: ['#0b1220', '#1d4ed8', '#6366f1', '#eef2ff'],
      },
      {
        id: 'charcoal-signal',
        label: 'Charcoal & signal',
        swatches: ['#18181b', '#3f3f46', '#ef4444', '#fafafa'],
      },
      {
        id: 'warm-earth',
        label: 'Warm earth',
        swatches: ['#f5f0e8', '#c4a574', '#5c4033', '#1c1917'],
      },
      {
        id: 'teal-mint',
        label: 'Teal & mint',
        swatches: ['#0f3d3e', '#0d9488', '#99f6e4', '#f0fdfa'],
      },
      {
        id: 'forest',
        label: 'Forest',
        swatches: ['#14532d', '#16a34a', '#dcfce7', '#f7fee7'],
      },
      {
        id: 'slate-sky',
        label: 'Slate & sky',
        swatches: ['#0f172a', '#0284c7', '#e0f2fe', '#f8fafc'],
      },
    ],
  },
  {
    id: 'type',
    question: 'How should the type feel?',
    kind: 'choice',
    options: [
      { id: 'clean-sans', label: 'Clean sans', description: 'Modern product / SaaS' },
      { id: 'editorial', label: 'Editorial serif', description: 'Brand stories & studios' },
      { id: 'bold-display', label: 'Bold display', description: 'Campaign energy' },
      { id: 'friendly', label: 'Friendly rounded', description: 'Local services & lifestyle' },
    ],
  },
  {
    id: 'tone',
    question: 'What tone should the copy use?',
    kind: 'choice',
    options: [
      { id: 'professional', label: 'Professional' },
      { id: 'friendly', label: 'Friendly' },
      { id: 'premium', label: 'Premium' },
      { id: 'playful', label: 'Playful' },
      { id: 'reassuring', label: 'Reassuring' },
      { id: 'technical', label: 'Technical' },
    ],
  },
  {
    id: 'audience',
    question: 'Who is this for?',
    kind: 'text',
    placeholder: 'e.g. homeowners in Rotterdam booking conservatories',
    hint: 'One sentence is enough.',
  },
  {
    id: 'sections',
    question: 'Which sections matter most?',
    kind: 'multi',
    hint: 'Pick a few — we will sequence them sensibly.',
    options: [
      { id: 'hero', label: 'Hero' },
      { id: 'features', label: 'Features / services' },
      { id: 'social-proof', label: 'Reviews / logos' },
      { id: 'gallery', label: 'Gallery / work' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'faq', label: 'FAQ' },
      { id: 'cta', label: 'Strong CTA' },
      { id: 'contact', label: 'Contact' },
    ],
  },
  {
    id: 'source',
    question: 'Any existing website to learn from?',
    kind: 'text',
    placeholder: 'https://… or leave blank',
    hint: 'Optional. We can discover brand colours and facts from a public URL.',
  },
]

export function formatWizardBrief(goalText: string, answers: WizardAnswers): string {
  const lines = [
    `User request: ${goalText}`,
    'Design choices from guided questionnaire:',
  ]
  for (const step of DESIGN_WIZARD_STEPS) {
    const value = answers[step.id]
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
      lines.push(`- ${step.id}: (skipped)`)
      continue
    }
    lines.push(`- ${step.id}: ${Array.isArray(value) ? value.join(', ') : value}`)
  }
  lines.push(
    'Produce a concrete next step for the platform: recommend onboarding generate, theme apply, or page structure. Be concise.',
  )
  return lines.join('\n')
}

/** Map palette option → theme seed hex for themeFromSeed. */
export function seedFromPaletteAnswer(paletteId: string): string {
  const option = DESIGN_WIZARD_STEPS.find((step) => step.id === 'palette')?.options?.find(
    (entry) => entry.id === paletteId,
  )
  return option?.swatches?.[1] || option?.swatches?.[0] || '#1d4ed8'
}

export function fontPairFromTypeAnswer(typeId: string): { heading: string; body: string } {
  switch (typeId) {
    case 'editorial':
      return { heading: 'Instrument Serif', body: 'Rubik' }
    case 'bold-display':
      return { heading: 'Google Sans', body: 'Rubik' }
    case 'friendly':
      return { heading: 'Rubik', body: 'Rubik' }
    default:
      return { heading: 'Google Sans', body: 'Rubik' }
  }
}
