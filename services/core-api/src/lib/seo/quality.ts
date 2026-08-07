import { getBlock } from '@platform/blocks'
import type { ContentQualityReport, ContentQualitySignal, Section, Seo } from '@platform/schemas'
import { collectCopyValues, collectLinks, collectText, countWords, heroSections, internalPath } from './document.js'

/**
 * The content-quality gate (§15).
 *
 * Programmatic and local-SEO pages are the fastest way to turn a good site into
 * a thin-content penalty: fifty city pages that differ by one word each. This
 * decides whether a generated page says enough to deserve publishing, and it is
 * deliberately a pure function of the document so the Phase 2 generator can call
 * it inline, before anything is written.
 *
 * It answers "is there substance here", not "is this good writing". No model is
 * involved and none should be — a gate that needs an API key is a gate that is
 * skipped when the key is missing.
 */

export const DEFAULT_CONTENT_THRESHOLD = 60

/** Enough words that the page is worth a result of its own. */
const TARGET_WORDS = 300
const TARGET_SECTIONS = 5
const TARGET_DISTINCT_BLOCKS = 4
const TARGET_INTERNAL_LINKS = 2

export interface ContentQualityInput {
  title: string
  seo: Seo
  sections: Section[]
}

function ratio(value: number, target: number): number {
  if (target <= 0) return 1
  return Math.max(0, Math.min(1, value / target))
}

/**
 * How much of the copy is still the block's own default text.
 *
 * The registry knows every block's defaults, so "did anyone actually write
 * this page" is answerable without heuristics about lorem ipsum.
 */
function untouchedCopyRatio(sections: Section[]): { ratio: number; total: number } {
  let total = 0
  let untouched = 0

  for (const section of sections) {
    const definition = getBlock(section.block)
    if (!definition) continue

    const defaults = definition.schema.safeParse({})
    if (!defaults.success) continue

    const defaultCopy = new Set(
      collectCopyValues([{ ...section, props: defaults.data as Record<string, unknown> }]),
    )

    for (const value of collectCopyValues([section])) {
      total += 1
      if (defaultCopy.has(value)) untouched += 1
    }
  }

  return { ratio: total === 0 ? 1 : untouched / total, total }
}

function signal(
  id: ContentQualitySignal['id'],
  label: string,
  value: number,
  weight: number,
  detail: string,
): ContentQualitySignal {
  return { id, label, value: Math.max(0, Math.min(1, value)), weight, detail }
}

/**
 * Score a page document out of 100. Weights sum to 1; word count carries the
 * most because it is the signal thin pages actually fail on.
 */
export function evaluateContentQuality(
  input: ContentQualityInput,
  options: { threshold?: number } = {},
): ContentQualityReport {
  const threshold = options.threshold ?? DEFAULT_CONTENT_THRESHOLD

  const text = collectText(input.sections)
  const words = countWords(text)
  const sectionCount = input.sections.length
  const distinctBlocks = new Set(input.sections.map((section) => section.block)).size
  const heroes = heroSections(input.sections).length
  const description = (input.seo.description ?? '').trim()
  const internalLinks = new Set(
    collectLinks(input.sections)
      .map(internalPath)
      .filter((path): path is string => Boolean(path)),
  ).size
  const untouched = untouchedCopyRatio(input.sections)

  const signals: ContentQualitySignal[] = [
    signal('word_count', 'Amount of copy', ratio(words, TARGET_WORDS), 0.3, `${words} words (target ${TARGET_WORDS}).`),
    signal(
      'section_count',
      'Page structure',
      ratio(sectionCount, TARGET_SECTIONS),
      0.15,
      `${sectionCount} sections (target ${TARGET_SECTIONS}).`,
    ),
    signal(
      'section_variety',
      'Variety of sections',
      ratio(distinctBlocks, TARGET_DISTINCT_BLOCKS),
      0.1,
      `${distinctBlocks} different block types.`,
    ),
    signal(
      'has_heading',
      'One clear headline',
      heroes === 1 ? 1 : 0,
      0.1,
      heroes === 1 ? 'Exactly one hero section.' : `${heroes} hero sections — a page needs exactly one.`,
    ),
    signal(
      'has_meta_description',
      'Meta description',
      description.length >= 70 && description.length <= 155 ? 1 : description ? 0.6 : 0,
      0.1,
      description ? `${description.length} characters.` : 'No meta description.',
    ),
    signal(
      'internal_links',
      'Links to other pages',
      ratio(internalLinks, TARGET_INTERNAL_LINKS),
      0.1,
      `${internalLinks} internal link target(s).`,
    ),
    signal(
      'original_copy',
      'Written, not templated',
      1 - untouched.ratio,
      0.15,
      untouched.total === 0
        ? 'No copy on the page.'
        : `${Math.round(untouched.ratio * 100)}% of the copy is still the block default.`,
    ),
  ]

  const score = Math.round(signals.reduce((total, entry) => total + entry.value * entry.weight, 0) * 100)

  const blockers = score >= threshold ? [] : signals.filter((entry) => entry.value < 0.5).map((entry) => `${entry.label}: ${entry.detail}`)

  return {
    score,
    threshold,
    passed: score >= threshold,
    wordCount: words,
    sectionCount,
    signals,
    blockers,
  }
}
