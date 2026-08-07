/**
 * Variant documents are page documents.
 *
 * They go through exactly the same registry validation as anything the editor
 * or the AI writes (ADR-0003) — a variant is not a side door into storing a
 * section that no renderer can draw.
 */
import { normalizeDocument } from '@platform/blocks'
import type { Section, VariantDocument } from '@platform/schemas'
import { BadRequestError } from '../errors.js'

/**
 * Validate and fill defaults. Throws `UnknownBlockError` /
 * `InvalidBlockPropsError`, which the error handler already maps to 400.
 */
export function normalizeVariantDocument(document: VariantDocument | null): VariantDocument | null {
  if (!document) return null

  if (document.kind === 'page') {
    return { kind: 'page', sections: normalizeDocument(document.sections) }
  }

  const [section] = normalizeDocument([document.section])
  if (!section) throw new BadRequestError('A section variant must contain one section.')

  return { kind: 'section', targetSectionId: document.targetSectionId, section }
}

/**
 * A section variant addresses a slot in the live document by id. Checking that
 * the slot exists at creation time turns a silently inert variant — one that
 * would quietly collect traffic and change nothing — into a 400.
 */
export function assertVariantTargetsLiveSection(document: VariantDocument | null, pageSections: readonly Section[]): void {
  if (!document || document.kind !== 'section') return

  const exists = pageSections.some((section) => section.id === document.targetSectionId)
  if (!exists) {
    throw new BadRequestError(
      `This variant replaces section "${document.targetSectionId}", which is not on the page.`,
    )
  }
}

/** The document a variant implies, resolved against the current draft. */
export function applyVariant(pageSections: readonly Section[], document: VariantDocument | null): Section[] {
  if (!document) return [...pageSections]
  if (document.kind === 'page') return [...document.sections]

  return pageSections.map((section) =>
    section.id === document.targetSectionId ? document.section : section,
  )
}
