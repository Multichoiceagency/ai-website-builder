import {
  rendersConfigurableHeading,
  type Navigation,
  type SeoAudit,
  type SeoIssue,
  type SeoIssueCode,
  type SeoIssueCounts,
  type SeoPageScore,
  type SeoSeverity,
} from '@platform/schemas'
import {
  collectLinks,
  collectText,
  countWords,
  effectiveHeadingLevel,
  effectiveTitle,
  faqItems,
  internalPath,
  naturalHeadingLevel,
  rendersHeading,
  type SeoPageInput,
} from './document.js'

/**
 * The technical audit (§15).
 *
 * A pure function over the stored page documents: the same input always yields
 * the same report, which is what makes it safe to run on every dashboard visit
 * and cheap enough to run inside the generator.
 *
 * Every issue carries a severity and a concrete fix. An audit that says
 * "duplicate title" and stops has moved the work, not done it.
 */

/** Google truncates around these lengths; past them the tail is invisible. */
const TITLE_MAX = 60
const TITLE_MIN = 20
const DESCRIPTION_MAX = 155
const DESCRIPTION_MIN = 70
const THIN_SECTION_COUNT = 3

const PENALTY: Record<SeoSeverity, number> = { critical: 15, warning: 6, info: 2 }

export interface AuditInput {
  siteId: string
  pages: SeoPageInput[]
  /** Menus count as internal links: a page in the nav is not an orphan. */
  navigation: Navigation[]
}

function issue(
  code: SeoIssueCode,
  severity: SeoSeverity,
  message: string,
  fix: string,
  page?: SeoPageInput,
  context: Record<string, unknown> = {},
): SeoIssue {
  return {
    code,
    severity,
    message,
    fix,
    pageId: page?.id ?? null,
    path: page?.path ?? null,
    context,
  }
}

function scoreFrom(issues: SeoIssue[]): number {
  const penalty = issues.reduce((total, entry) => total + PENALTY[entry.severity], 0)
  return Math.max(0, Math.min(100, 100 - penalty))
}

function countBySeverity(issues: SeoIssue[]): SeoIssueCounts {
  return {
    critical: issues.filter((entry) => entry.severity === 'critical').length,
    warning: issues.filter((entry) => entry.severity === 'warning').length,
    info: issues.filter((entry) => entry.severity === 'info').length,
  }
}

/** Every internal path the site links to, from page props and from the menus. */
function linkGraph(input: AuditInput): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const page of input.pages) {
    const targets = new Set<string>()
    for (const href of collectLinks(page.sections)) {
      const target = internalPath(href)
      if (target) targets.add(target)
    }
    graph.set(page.id, targets)
  }

  const menuTargets = new Set<string>()
  for (const menu of input.navigation) {
    for (const item of menu.items) {
      const target = internalPath(item.href)
      if (target) menuTargets.add(target)
    }
  }
  graph.set('__navigation__', menuTargets)

  return graph
}

function auditTitle(page: SeoPageInput, duplicates: Map<string, SeoPageInput[]>): SeoIssue[] {
  const issues: SeoIssue[] = []
  const title = effectiveTitle(page)

  if (!title) {
    return [
      issue(
        'missing_title',
        'critical',
        'This page has no title for search results.',
        'Write a title of 20–60 characters that names the page and the business.',
        page,
      ),
    ]
  }

  if (title.length > TITLE_MAX) {
    issues.push(
      issue(
        'title_too_long',
        'warning',
        `The title is ${title.length} characters; search results cut off around ${TITLE_MAX}.`,
        `Shorten it to ${TITLE_MAX} characters or fewer, keeping the important words first.`,
        page,
        { length: title.length },
      ),
    )
  } else if (title.length < TITLE_MIN) {
    issues.push(
      issue(
        'title_too_short',
        'info',
        `The title is only ${title.length} characters.`,
        'Add what the page is about and where the business operates.',
        page,
        { length: title.length },
      ),
    )
  }

  const sharing = duplicates.get(title.toLowerCase()) ?? []
  if (sharing.length > 1) {
    issues.push(
      issue(
        'duplicate_title',
        'warning',
        `${sharing.length} pages share the title "${title}".`,
        'Give each page a title that describes only that page.',
        page,
        { paths: sharing.map((other) => other.path) },
      ),
    )
  }

  return issues
}

function auditDescription(page: SeoPageInput): SeoIssue[] {
  const description = (page.seo.description ?? '').trim()

  if (!description) {
    return [
      issue(
        'missing_description',
        'warning',
        'This page has no meta description.',
        `Write ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters describing what the visitor gets here.`,
        page,
      ),
    ]
  }

  if (description.length > DESCRIPTION_MAX) {
    return [
      issue(
        'description_too_long',
        'warning',
        `The description is ${description.length} characters; the tail will be cut off around ${DESCRIPTION_MAX}.`,
        `Trim it to ${DESCRIPTION_MAX} characters or fewer.`,
        page,
        { length: description.length },
      ),
    ]
  }

  if (description.length < DESCRIPTION_MIN) {
    return [
      issue(
        'description_too_short',
        'info',
        `The description is only ${description.length} characters.`,
        `Use the room: ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters is what gets shown.`,
        page,
        { length: description.length },
      ),
    ]
  }

  return []
}

/**
 * The document outline.
 *
 * Levels come from `effectiveHeadingLevel`, so a second hero demoted to `h2`
 * via its section SEO stops being an H1 problem — which is the point of the
 * override. Sections that render no heading are not part of the outline.
 */
function auditHeadings(page: SeoPageInput): SeoIssue[] {
  const issues: SeoIssue[] = []

  const outline = page.sections
    .filter((section) => rendersHeading(section))
    .map((section) => ({ section, level: effectiveHeadingLevel(section) }))

  const h1s = outline.filter((entry) => entry.level === 'h1')

  if (h1s.length === 0) {
    issues.push(
      issue(
        'missing_h1',
        'critical',
        'Nothing on this page renders an H1, so it has no main heading.',
        'Add a hero block at the top, or set one section’s heading level to H1.',
        page,
      ),
    )
  } else if (h1s.length > 1) {
    issues.push(
      issue(
        'multiple_h1',
        'warning',
        `${h1s.length} sections render an H1, so this page has more than one main heading.`,
        'Keep one, and set the others’ heading level to H2 in their section SEO.',
        page,
        {
          blocks: h1s.map((entry) => entry.section.block),
          sectionIds: h1s.map((entry) => entry.section.id),
        },
      ),
    )
  }

  // A rank that jumps — h2 straight to h4 — leaves a hole in the outline that
  // screen readers announce as a missing level.
  let previous = 0
  for (const entry of outline) {
    const rank = Number(entry.level.slice(1))
    if (previous > 0 && rank > previous + 1) {
      issues.push(
        issue(
          'heading_level_skip',
          'warning',
          `This page jumps from H${previous} to H${rank}, skipping a level.`,
          `Set this section’s heading level to H${previous + 1}, or demote the section above it.`,
          page,
          { sectionId: entry.section.id, block: entry.section.block, from: previous, to: rank },
        ),
      )
    }
    previous = rank
  }

  return issues
}

/**
 * Findings that come from the per-section SEO itself: an anchor two sections
 * both claim, a heading level nothing will render, a structured-data role a
 * section has no data for.
 */
function auditSectionSeo(page: SeoPageInput): SeoIssue[] {
  const issues: SeoIssue[] = []
  const seenAnchors = new Set<string>()

  for (const section of page.sections) {
    const sectionSeo = section.seo
    if (!sectionSeo) continue

    if (sectionSeo.anchorId) {
      if (seenAnchors.has(sectionSeo.anchorId)) {
        issues.push(
          issue(
            'duplicate_anchor_id',
            'warning',
            `Two sections use the anchor #${sectionSeo.anchorId}; a link to it can only reach the first.`,
            'Give this section a different anchor.',
            page,
            { sectionId: section.id, anchorId: sectionSeo.anchorId },
          ),
        )
      }
      seenAnchors.add(sectionSeo.anchorId)
    }

    if (sectionSeo.headingLevel && !rendersConfigurableHeading(section.block)) {
      issues.push(
        issue(
          'heading_level_not_rendered',
          'info',
          `“${section.block}” does not support a heading-level override, so it still renders ${naturalHeadingLevel(section).toUpperCase()}.`,
          'Remove the override, or use a block that supports one.',
          page,
          { sectionId: section.id, block: section.block, requested: sectionSeo.headingLevel },
        ),
      )
    }

    if (sectionSeo.schemaType === 'FAQPage' && faqItems(section).length === 0) {
      issues.push(
        issue(
          'schema_type_without_data',
          'info',
          'This section is marked as the page’s FAQ, but it has no question-and-answer pairs.',
          'Add questions and answers, or remove the FAQPage role from this section.',
          page,
          { sectionId: section.id, schemaType: sectionSeo.schemaType },
        ),
      )
    }
  }

  return issues
}

/**
 * The site audit. Page-level findings are attached to their page so the UI can
 * show "this page, this problem, this fix"; only genuinely site-wide findings
 * live in `siteIssues`.
 */
export function auditSite(input: AuditInput): SeoAudit {
  const pathsInSite = new Set(input.pages.map((page) => page.path))
  const graph = linkGraph(input)

  // Titles first: duplication is only visible across the whole site.
  const byTitle = new Map<string, SeoPageInput[]>()
  for (const page of input.pages) {
    const title = effectiveTitle(page).toLowerCase()
    if (!title) continue
    byTitle.set(title, [...(byTitle.get(title) ?? []), page])
  }

  const byPath = new Map<string, SeoPageInput[]>()
  for (const page of input.pages) {
    byPath.set(page.path, [...(byPath.get(page.path) ?? []), page])
  }

  const pages: SeoPageScore[] = input.pages.map((page) => {
    const issues: SeoIssue[] = [
      ...auditTitle(page, byTitle),
      ...auditDescription(page),
      ...auditHeadings(page),
      ...auditSectionSeo(page),
    ]

    const sharingPath = byPath.get(page.path) ?? []
    if (sharingPath.length > 1) {
      issues.push(
        issue(
          'duplicate_path',
          'critical',
          `${sharingPath.length} pages use the address ${page.path}.`,
          'Give each page its own address; only one of them can be reached.',
          page,
          { pageIds: sharingPath.map((other) => other.id) },
        ),
      )
    }

    if (page.sections.length < THIN_SECTION_COUNT) {
      issues.push(
        issue(
          'thin_content',
          'warning',
          `This page has ${page.sections.length} section(s) — too little to rank for anything.`,
          `Add sections until the page answers the visitor’s question; ${THIN_SECTION_COUNT} is the floor, not the target.`,
          page,
          { sectionCount: page.sections.length },
        ),
      )
    }

    // Broken links: a link to a path this site has no page for is a 404 the
    // moment someone clicks it.
    const targets = graph.get(page.id) ?? new Set<string>()
    for (const target of targets) {
      if (!pathsInSite.has(target)) {
        issues.push(
          issue(
            'broken_internal_link',
            'critical',
            `This page links to ${target}, which does not exist.`,
            `Create a page at ${target} or point the link somewhere that exists.`,
            page,
            { href: target },
          ),
        )
      }
    }

    // Orphans: nothing points here, so neither a visitor nor a crawler arrives
    // by following links. The home page is reached directly and is exempt.
    if (page.path !== '/') {
      const linkedFromElsewhere = [...graph.entries()].some(
        ([source, sourceTargets]) => source !== page.id && sourceTargets.has(page.path),
      )
      if (!linkedFromElsewhere) {
        issues.push(
          issue(
            'orphan_page',
            'warning',
            'No other page or menu links to this page.',
            'Link to it from the navigation or from a related page.',
            page,
          ),
        )
      }
    }

    if (page.status === 'published' && page.seo.noIndex) {
      issues.push(
        issue(
          'noindex_published',
          'warning',
          'This page is live but asks search engines not to index it.',
          'Turn off "hide from search engines" if you want it found.',
          page,
        ),
      )
    }

    if (!page.seo.ogImage) {
      issues.push(
        issue(
          'missing_og_image',
          'info',
          'No share image, so links to this page preview as plain text.',
          'Add a social share image of about 1200×630.',
          page,
        ),
      )
    }

    return {
      pageId: page.id,
      path: page.path,
      title: effectiveTitle(page),
      status: page.status,
      score: scoreFrom(issues),
      wordCount: countWords(collectText(page.sections)),
      sectionCount: page.sections.length,
      issues,
    }
  })

  const siteIssues: SeoIssue[] = []
  const publishedCount = input.pages.filter((page) => page.status === 'published').length

  if (input.pages.length > 0 && publishedCount === 0) {
    siteIssues.push(
      issue(
        'no_published_pages',
        'warning',
        'Nothing on this site is published, so there is nothing for search engines to find.',
        'Publish the pages that are ready.',
      ),
    )
  }

  if (!pathsInSite.has('/')) {
    siteIssues.push(
      issue(
        'missing_home_page',
        'critical',
        'This site has no page at /.',
        'Create a home page — it is the page most links and searches land on.',
      ),
    )
  }

  const allIssues = [...siteIssues, ...pages.flatMap((page) => page.issues)]
  const averagePageScore = pages.length
    ? pages.reduce((total, page) => total + page.score, 0) / pages.length
    : 0
  const sitePenalty = siteIssues.reduce((total, entry) => total + PENALTY[entry.severity], 0)

  return {
    siteId: input.siteId,
    score: Math.max(0, Math.min(100, Math.round(averagePageScore) - sitePenalty)),
    pageCount: input.pages.length,
    publishedCount,
    issueCounts: countBySeverity(allIssues),
    siteIssues,
    pages,
    generatedAt: new Date().toISOString(),
  }
}
