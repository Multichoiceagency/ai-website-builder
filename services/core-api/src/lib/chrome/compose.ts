import { createSection } from '@platform/blocks'
import type { NavigationItem, Section, Site } from '@platform/schemas'

function isHeaderBlock(block: string): boolean {
  return block.startsWith('header-')
}

function isFooterBlock(block: string): boolean {
  return block.startsWith('footer-')
}

function sectionFromAssignment(
  assignment: { block: string; props: Record<string, unknown>; sectionId?: string } | undefined,
  linkOverride?: NavigationItem[],
): Section | null {
  if (!assignment?.block) return null
  const props = { ...assignment.props }
  if (linkOverride?.length) {
    props.links = linkOverride.map((item) => ({ label: item.label, href: item.href }))
  }
  if (assignment.sectionId) props.sectionId = assignment.sectionId
  return createSection(assignment.block, props)
}

/**
 * Prepend/append site chrome (componentTargets or chrome pages) and strip
 * duplicate leading headers / trailing footers from the page body.
 */
export function composePageSections(input: {
  site: Site
  body: Section[]
  headerChrome?: Section[] | null
  footerChrome?: Section[] | null
  primaryNav?: NavigationItem[] | null
  footerNav?: NavigationItem[] | null
}): Section[] {
  const fromTargetsHeader = sectionFromAssignment(
    input.site.componentTargets.header,
    input.primaryNav ?? undefined,
  )
  const fromTargetsFooter = sectionFromAssignment(
    input.site.componentTargets.footer,
    input.footerNav ?? undefined,
  )

  const headerSections =
    input.headerChrome && input.headerChrome.length > 0
      ? input.headerChrome.map((section) => {
          if (!input.primaryNav?.length) return section
          if (!isHeaderBlock(section.block)) return section
          return {
            ...section,
            props: {
              ...section.props,
              links: input.primaryNav.map((item) => ({ label: item.label, href: item.href })),
            },
          }
        })
      : fromTargetsHeader
        ? [fromTargetsHeader]
        : []

  const footerSections =
    input.footerChrome && input.footerChrome.length > 0
      ? input.footerChrome.map((section) => {
          if (!input.footerNav?.length) return section
          if (!isFooterBlock(section.block)) return section
          return {
            ...section,
            props: {
              ...section.props,
              links: input.footerNav.map((item) => ({ label: item.label, href: item.href })),
            },
          }
        })
      : fromTargetsFooter
        ? [fromTargetsFooter]
        : []

  let body = [...input.body]
  if (headerSections.length) {
    while (body[0] && isHeaderBlock(body[0].block)) body = body.slice(1)
  }
  if (footerSections.length) {
    while (body.length && body[body.length - 1] && isFooterBlock(body[body.length - 1]!.block)) {
      body = body.slice(0, -1)
    }
  }

  return [...headerSections, ...body, ...footerSections]
}
