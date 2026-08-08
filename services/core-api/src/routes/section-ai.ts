import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireBlock, validateBlockProps, type BlockDefinition } from '@platform/blocks'
import {
  businessProfileSchema,
  uuidSchema,
  type BusinessProfile,
  type Page,
  type Section,
  type Site,
} from '@platform/schemas'
import { withTenant } from '../db/client.js'
import { recordAuditEvent } from '../db/repositories/audit.js'
import { findPageById, listPages, updatePage } from '../db/repositories/pages.js'
import { findSiteById } from '../db/repositories/sites.js'
import { aiGateway, composePage } from '../lib/generation/index.js'
import { UnsupportedInstructionError, type RevisionField } from '../lib/ai/gateway.js'
import { recordAiUsage } from '../lib/ai/usage.js'
import { analyzeMotionsitesBrief } from '../lib/ai/motionsites-brief-agent.js'
import { retrieveCatalogueHits } from '../lib/ai/catalogue-context.js'
import { deriveSiteProfile, goalForPath } from '../lib/ai/site-profile.js'
import { buildEvent, eventBus } from '../lib/event-bus.js'
import { AppError, NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireTenant } from '../plugins/auth.js'

/**
 * Per-section AI editing (§11, ADR-0007).
 *
 * `suggest` never writes. It returns a **proposal**: the current props, the
 * proposed props, and the field-by-field difference between them. Applying is a
 * separate, explicit call — a normal authenticated write by the user, recorded
 * in the audit log with the agent as actor and the user as `onBehalfOfUserId`,
 * so the log can always answer "did a human ask for this?".
 *
 * Three guarantees hold whatever the model returns:
 *
 * 1. **Structure is untouchable.** The model is only ever offered the copy
 *    fields of the block that is already there. It cannot swap the block, add a
 *    section or delete one, because none of those can be expressed here.
 * 2. **Output is validated** against that block's own Zod schema before it can
 *    be previewed. A wrong shape is an error, never a broken section.
 * 3. **A populated required field cannot be emptied.** Such a change degrades
 *    to the current value rather than shipping a blank hero.
 */

const paramsSchema = z.object({ pageId: uuidSchema, sectionId: z.string().min(1).max(64) })

const suggestBodySchema = z.object({
  /** MotionSites rebuild prompts are long; 16k covers them without inviting abuse. */
  instruction: z.string().trim().min(2).max(16_000),
  /**
   * The editor's live values, when the user has unsaved changes. Validated
   * against the block schema like any other input; absent, the stored props are
   * the subject. Without this the AI would quietly reason about a stale
   * headline the user has already replaced on screen.
   */
  props: z.record(z.unknown()).optional(),
})

const applyBodySchema = z.object({
  props: z.record(z.unknown()),
  /** Which model produced the proposal, recorded on the audit event. */
  model: z.string().max(120).default('unknown'),
  instruction: z.string().trim().max(16_000).default(''),
})

const generateParamsSchema = z.object({ pageId: uuidSchema })

const generateBodySchema = z.object({
  /** The recipe just inserted, in order. Repeats are allowed and answered in kind. */
  blockIds: z.array(z.string().min(1).max(64)).min(1).max(24),
})

/** Reading every page of a large site to write one section is not a good trade. */
const CONTEXT_PAGE_LIMIT = 12

// region Field extraction

/**
 * Props that state a fact rather than say something.
 *
 * Alt text, a phone number and an address are not prose to be made punchier,
 * and a rewrite of one is a factual error rather than a style choice — so they
 * are never offered to a model at all.
 */
const FACT_PROPS = new Set([
  'imageAlt', 'alt', 'phone', 'email', 'whatsapp', 'address', 'street', 'postalCode', 'city',
  'region', 'country', 'hours', 'legal', 'brand', 'logo', 'name', 'href', 'src', 'value',
])

const TEXT_KINDS = new Set(['text', 'textarea'])

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * The copy fields of one placed section, as dotted paths.
 *
 * `required` comes from the block's own defaults: a field the block ships with
 * a non-empty value is one it is designed to always show. That is a fact about
 * the block rather than a list maintained by hand here, so it stays true as the
 * registry grows.
 */
export function editableFields(definition: BlockDefinition, props: Record<string, unknown>): RevisionField[] {
  const defaults = definition.schema.parse({}) as Record<string, unknown>
  const fields: RevisionField[] = []

  for (const field of definition.fields) {
    if (FACT_PROPS.has(field.key)) continue

    if (TEXT_KINDS.has(field.type)) {
      const value = props[field.key]
      if (typeof value !== 'string') continue
      fields.push({
        path: field.key,
        label: field.label,
        kind: field.type as RevisionField['kind'],
        value,
        required: nonEmptyString(defaults[field.key]),
      })
      continue
    }

    if (field.type !== 'items' || !field.itemFields) continue

    const items = props[field.key]
    if (!Array.isArray(items)) continue

    items.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) return
      for (const itemField of field.itemFields!) {
        if (!TEXT_KINDS.has(itemField.type) || FACT_PROPS.has(itemField.key)) continue
        const value = (item as Record<string, unknown>)[itemField.key]
        if (typeof value !== 'string') continue
        fields.push({
          path: `${field.key}.${index}.${itemField.key}`,
          label: `${field.itemLabel ?? field.label} ${index + 1} — ${itemField.label}`,
          kind: itemField.type as RevisionField['kind'],
          value,
          // A list entry has no per-entry default, so nothing here is required;
          // an empty one is dropped by the renderer rather than shipped blank.
          required: false,
        })
      }
    })
  }

  return fields
}

function readPath(props: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, props)
}

/** Immutable set: every container on the path is copied, never mutated. */
function writePath(props: Record<string, unknown>, path: string, value: string): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (!head) return props
  if (!rest.length) return { ...props, [head]: value }

  const child = props[head]
  if (Array.isArray(child)) {
    const index = Number(rest[0])
    if (!Number.isInteger(index) || index < 0 || index >= child.length) return props
    const entry = child[index]
    if (typeof entry !== 'object' || entry === null) return props
    const next = [...child]
    next[index] = writePath(entry as Record<string, unknown>, rest.slice(1).join('.'), value)
    return { ...props, [head]: next }
  }

  if (typeof child === 'object' && child !== null) {
    return { ...props, [head]: writePath(child as Record<string, unknown>, rest.join('.'), value) }
  }

  return props
}

// endregion

// region Proposal

export interface FieldChange {
  path: string
  label: string
  before: string
  after: string
}

export interface RefusedChange {
  path: string
  label: string
  reason: string
}

export interface SectionProposal {
  current: Record<string, unknown>
  proposed: Record<string, unknown>
  changedFields: FieldChange[]
  refusedFields: RefusedChange[]
}

/**
 * Turn a provider's answer into a proposal, or refuse it.
 *
 * Pure and exported so the safety rules can be tested directly against a
 * hostile answer, without needing a model that misbehaves on demand.
 *
 * Throws `InvalidBlockPropsError` when the result does not satisfy the block's
 * schema — a model that returns the wrong shape produces an error here, and
 * never a section.
 */
export function buildSectionProposal(input: {
  blockId: string
  current: Record<string, unknown>
  fields: RevisionField[]
  values: Record<string, string>
}): SectionProposal {
  const current = validateBlockProps(input.blockId, input.current)
  const byPath = new Map(input.fields.map((field) => [field.path, field]))

  const changedFields: FieldChange[] = []
  const refusedFields: RefusedChange[] = []
  let proposed = current

  for (const [path, raw] of Object.entries(input.values)) {
    const field = byPath.get(path)
    // A path outside the offered set is not a change we are willing to preview.
    if (!field) continue
    if (typeof raw !== 'string') continue

    const before = String(readPath(current, path) ?? '')
    const after = raw
    if (after === before) continue

    if (field.required && before.trim() && !after.trim()) {
      refusedFields.push({
        path,
        label: field.label,
        reason: 'This section always shows this field, so it cannot be left empty. The current text is kept.',
      })
      continue
    }

    proposed = writePath(proposed, path, after)
    changedFields.push({ path, label: field.label, before, after })
  }

  // The gate ADR-0007 exists for: whatever came back is checked against the
  // block's own schema before a human is ever shown it.
  proposed = validateBlockProps(input.blockId, proposed)

  return { current, proposed, changedFields, refusedFields }
}

// endregion

// region Generation

export interface GeneratedSection {
  blockId: string
  props: Record<string, unknown>
  /** False when the block kept its own defaults, and `reason` says why. */
  generated: boolean
  reason?: string
}

/**
 * Accept composed props, or fall back to the block's defaults.
 *
 * The same gate as the suggest endpoint: whatever the composer or the model
 * produced is checked against the block's own schema, and a failure degrades to
 * defaults rather than propagating. Pure and exported so the rejection path can
 * be tested against output no real provider would produce.
 *
 * Defaults are a perfectly good section — placeholder copy the user can edit.
 * A half-written one is not. That asymmetry is why nothing here throws.
 */
export function generatedPropsOrDefaults(
  blockId: string,
  candidate: Record<string, unknown> | null,
): GeneratedSection {
  const definition = requireBlock(blockId)
  const defaults = definition.schema.parse({}) as Record<string, unknown>

  if (!candidate) {
    return {
      blockId,
      props: defaults,
      generated: false,
      reason: 'The composer had nothing to say for this block, so it kept its default copy.',
    }
  }

  try {
    return { blockId, props: validateBlockProps(blockId, candidate), generated: true }
  } catch {
    return {
      blockId,
      props: defaults,
      generated: false,
      reason: 'The generated copy did not fit this block, so it kept its default copy.',
    }
  }
}

// endregion

/**
 * What the platform knows about the business behind a site.
 *
 * Discovery results are not persisted yet, so this is deliberately thin: the
 * site's own name and language, and nothing invented to fill the gaps. The
 * composer degrades on missing facts by writing copy that does not need them.
 */
function profileForSite(site: Site): BusinessProfile {
  return businessProfileSchema.parse({
    company: { name: site.name },
    // `company` and `contact` have no object-level default of their own, so
    // both must be named even when there is nothing to put in them.
    contact: {},
    locale: site.locale,
  })
}

function findSection(page: Page, sectionId: string): Section {
  const section = page.sections.find((candidate) => candidate.id === sectionId)
  if (!section) throw new NotFoundError('Section')
  return section
}

const sectionAiRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Propose a revision. Read-only by construction: nothing in this handler
   * writes the page.
   */
  app.post('/pages/:pageId/sections/:sectionId/suggest', async (request, reply) => {
    const context = requireTenant(request, 'ai:use')
    const { pageId, sectionId } = parseOrThrow(paramsSchema, request.params, 'section')
    const input = parseOrThrow(suggestBodySchema, request.body, 'suggestion request')

    const loaded = await withTenant(context.tenantId, async (tx) => {
      // Scoped to the tenant, so another workspace's page is simply not found.
      const page = await findPageById(tx, context.tenantId, pageId)
      if (!page) throw new NotFoundError('Page')
      return { page, site: await findSiteById(tx, context.tenantId, page.siteId) }
    })

    const section = findSection(loaded.page, sectionId)
    const definition = requireBlock(section.block)
    const catalogueHits = retrieveCatalogueHits(input.instruction, 12)
    const catalogueHint =
      catalogueHits.length > 0
        ? `\n\nRelated catalogue entries (cite ids only; do not invent):\n${catalogueHits
            .slice(0, 8)
            .map((hit) => `- ${hit.kind} ${hit.id} — ${hit.name} (${hit.category})`)
            .join('\n')}`
        : ''

    const brief = await analyzeMotionsitesBrief(input.instruction, { fetchRemoteMedia: true })
    if (brief.kind === 'exact_island' && brief.islandId) {
      const event = buildEvent({
        name: 'ai.proposal_created',
        tenantId: context.tenantId,
        actor: {
          type: 'agent',
          id: 'section-editor',
          label: brief.model,
          onBehalfOfUserId: context.user.id,
        },
        resource: { type: 'page', id: pageId },
        payload: {
          sectionId,
          blockId: section.block,
          model: brief.model,
          islandId: brief.islandId,
          changedFields: [],
        },
      })
      await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))

      return reply.send(
        ok({
          sectionId,
          blockId: section.block,
          blockName: definition.name,
          instruction: input.instruction,
          model: brief.model,
          notes: brief.notes,
          islandId: brief.islandId,
          catalogueHits,
          current: validateBlockProps(section.block, input.props ?? section.props),
          proposed: validateBlockProps(section.block, input.props ?? section.props),
          changedFields: [],
          refusedFields: [],
        }),
      )
    }

    const currentProps = validateBlockProps(section.block, input.props ?? section.props)
    const fields = editableFields(definition, currentProps)

    if (!fields.length) {
      throw new AppError(
        422,
        'ai_instruction_unsupported',
        `“${definition.name}” has no editable copy — there is nothing here for a model to rewrite.`,
      )
    }

    const revision = await aiGateway
      .reviseCopy({
        blockId: section.block,
        blockName: definition.name,
        instruction: `${input.instruction}${catalogueHint}`,
        locale: loaded.site?.locale ?? 'nl',
        fields,
        profile: loaded.site ? profileForSite(loaded.site) : null,
      })
      .catch((error: unknown) => {
        if (error instanceof UnsupportedInstructionError) {
          throw new AppError(422, error.code, error.message, { supported: error.supported })
        }
        throw error
      })

    const proposal = buildSectionProposal({
      blockId: section.block,
      current: currentProps,
      fields,
      values: revision.values,
    })

    const catalogueNotes =
      catalogueHits.length > 0
        ? [
            `Related catalogue: ${catalogueHits
              .slice(0, 5)
              .map((hit) => `${hit.id} (${hit.kind})`)
              .join(', ')}.`,
          ]
        : []

    const event = buildEvent({
      name: 'ai.proposal_created',
      tenantId: context.tenantId,
      actor: {
        type: 'agent',
        id: 'section-editor',
        label: revision.model,
        onBehalfOfUserId: context.user.id,
      },
      resource: { type: 'page', id: pageId },
      payload: {
        sectionId,
        blockId: section.block,
        model: revision.model,
        changedFields: proposal.changedFields.map((change) => change.path),
      },
    })
    await withTenant(context.tenantId, async (tx) => {
      await recordAuditEvent(tx, event)
      await recordAiUsage(tx, {
        tenantId: context.tenantId,
        feature: 'section.revise',
        model: revision.model,
        inputTokens: revision.usage.inputTokens,
        outputTokens: revision.usage.outputTokens,
        costUsd: revision.usage.costUsd,
      })
    })

    return reply.send(
      ok({
        sectionId,
        blockId: section.block,
        blockName: definition.name,
        instruction: input.instruction,
        // Named plainly: the user is entitled to know a rule wrote this, not a
        // language model.
        model: revision.model,
        notes: [...revision.notes, ...catalogueNotes],
        catalogueHits,
        current: proposal.current,
        proposed: proposal.proposed,
        changedFields: proposal.changedFields,
        refusedFields: proposal.refusedFields,
      }),
    )
  })

  /**
   * Apply a proposal. This is the write, and it needs `page:write` — a role
   * that may use AI but not edit pages can look at a proposal and not apply it.
   *
   * Only the one section's props move. The block id, the section order and
   * every other section are read from storage and written back untouched, so
   * this endpoint structurally cannot restructure a page.
   */
  app.post('/pages/:pageId/sections/:sectionId/apply', async (request, reply) => {
    const context = requireTenant(request, 'page:write')
    const { pageId, sectionId } = parseOrThrow(paramsSchema, request.params, 'section')
    const input = parseOrThrow(applyBodySchema, request.body, 'proposal')

    const page = await withTenant(context.tenantId, async (tx) => {
      const existing = await findPageById(tx, context.tenantId, pageId)
      if (!existing) throw new NotFoundError('Page')

      const section = findSection(existing, sectionId)
      const definition = requireBlock(section.block)
      const currentProps = validateBlockProps(section.block, section.props)

      // Read the submitted props back through the same field extraction, so the
      // only thing that can survive is a new value for a copy field of the block
      // that is already there. Everything else — the image, the links, the
      // select values — comes from storage regardless of what was sent.
      const submitted = editableFields(definition, validateBlockProps(section.block, input.props))

      // Re-run the guard the proposal ran through. A client that edits the
      // payload on the way here gets the same refusal the model would have.
      const proposal = buildSectionProposal({
        blockId: section.block,
        current: currentProps,
        fields: editableFields(definition, currentProps),
        values: Object.fromEntries(submitted.map((field) => [field.path, field.value] as const)),
      })

      const sections = existing.sections.map((candidate) =>
        candidate.id === sectionId ? { ...candidate, props: proposal.proposed } : candidate,
      )

      return updatePage(tx, context.tenantId, pageId, { sections })
    })
    if (!page) throw new NotFoundError('Page')

    const actor = {
      type: 'agent' as const,
      id: 'section-editor',
      label: input.model,
      onBehalfOfUserId: context.user.id,
    }

    const applied = buildEvent({
      name: 'ai.proposal_applied',
      tenantId: context.tenantId,
      actor,
      resource: { type: 'page', id: pageId },
      payload: { sectionId, model: input.model, instruction: input.instruction },
    })
    const updated = buildEvent({
      name: 'page.updated',
      tenantId: context.tenantId,
      actor,
      resource: { type: 'page', id: pageId },
      payload: { path: page.path, sectionCount: page.sectionCount },
    })

    await withTenant(context.tenantId, async (tx) => {
      await recordAuditEvent(tx, applied)
      await recordAuditEvent(tx, updated)
    })
    await eventBus.publish(applied)
    await eventBus.publish(updated)

    return reply.send(ok(page))
  })

  /**
   * Write copy for freshly inserted sections.
   *
   * Read-only, like `suggest`: the editor has already put these sections on the
   * canvas and owns the document. This answers with props per block, in the
   * order they were asked for, and the editor drops them in as they land.
   *
   * The context is the point. The composer can only be specific about a
   * business it has facts for, and no discovery profile is stored anywhere —
   * so the facts are read back out of the site's own pages. A section inserted
   * into a site that already lists four services and a phone number is written
   * with those; one inserted into an empty site says so plainly rather than
   * inventing a business to be specific about.
   */
  app.post('/pages/:pageId/sections/generate', async (request, reply) => {
    const context = requireTenant(request, 'ai:use')
    const { pageId } = parseOrThrow(generateParamsSchema, request.params, 'page id')
    const input = parseOrThrow(generateBodySchema, request.body, 'generation request')

    // Every requested block must exist before anything else happens: an unknown
    // id is a client bug, not a section to degrade.
    for (const blockId of input.blockIds) requireBlock(blockId)

    const loaded = await withTenant(context.tenantId, async (tx) => {
      const page = await findPageById(tx, context.tenantId, pageId)
      if (!page) throw new NotFoundError('Page')

      const site = await findSiteById(tx, context.tenantId, page.siteId)
      if (!site) throw new NotFoundError('Site')

      // Drafts rather than published documents: the draft is what the user is
      // looking at, and on a site that has never been published it is the only
      // copy there is.
      const summaries = await listPages(tx, context.tenantId, site.id)
      const sources = await Promise.all(
        summaries
          .slice(0, CONTEXT_PAGE_LIMIT)
          .map((summary) => findPageById(tx, context.tenantId, summary.id)),
      )

      return { page, site, sources: sources.filter((entry): entry is Page => entry !== null) }
    })

    const derived = deriveSiteProfile(
      loaded.site,
      loaded.sources.map((page) => ({ path: page.path, title: page.title, sections: page.sections })),
    )

    const navigation = loaded.sources
      .slice(0, 6)
      .map((page) => ({ label: page.title, href: page.path }))

    const planned = {
      goal: goalForPath(loaded.page.path),
      path: loaded.page.path,
      title: loaded.page.title,
      description: loaded.page.seo.description ?? '',
      blocks: [] as string[],
    }

    let copy: Awaited<ReturnType<typeof aiGateway.generateCopy>> | null = null
    let failure = ''
    try {
      copy = await aiGateway.generateCopy({
        profile: derived.profile,
        locale: derived.profile.locale,
        goal: planned.goal,
      })
    } catch (error) {
      // A provider outage must cost the user their generated copy, not their
      // sections — they are already on the canvas.
      failure = 'Copy generation is unavailable right now, so the sections kept their default text.'
      request.log.warn({ err: error }, 'section generation fell back to block defaults')
    }

    const sections: GeneratedSection[] = input.blockIds.map((blockId) => {
      if (!copy) {
        return { ...generatedPropsOrDefaults(blockId, null), reason: failure }
      }

      // One block at a time: `composePage` drops a section it has nothing to
      // fill, and a dropped entry in a shared call would silently misalign the
      // answer with the request.
      const [composed] = composePage({ ...planned, blocks: [blockId] }, derived.profile, copy.slots, navigation)
      return generatedPropsOrDefaults(blockId, composed?.props ?? null)
    })

    const note = failure || describeContext(derived, sections)

    const event = buildEvent({
      name: 'ai.proposal_created',
      tenantId: context.tenantId,
      actor: {
        type: 'agent',
        id: 'section-composer',
        label: copy?.model ?? 'none',
        onBehalfOfUserId: context.user.id,
      },
      resource: { type: 'page', id: pageId },
      payload: {
        blockIds: input.blockIds,
        model: copy?.model ?? null,
        contextual: derived.contextual,
        generated: sections.filter((section) => section.generated).length,
      },
    })
    await withTenant(context.tenantId, (tx) => recordAuditEvent(tx, event))

    return reply.send(
      ok({
        model: copy?.model ?? null,
        /** False when only the site's name and language were available. */
        contextual: derived.contextual,
        basis: derived.basis,
        note,
        sections,
      }),
    )
  })
}

/** One sentence the editor can show without having to interpret the payload. */
function describeContext(
  derived: { contextual: boolean; basis: string[] },
  sections: GeneratedSection[],
): string {
  const written = sections.filter((section) => section.generated).length
  const kept = sections.length - written

  if (!derived.contextual) {
    return `This site has no copy to work from yet, so ${written || 'the'} section${written === 1 ? '' : 's'} used only its name and language. Fill a page in and the next insert will match it.`
  }

  const source = `Written from ${derived.basis.join(', ')}.`
  return kept ? `${source} ${kept} section${kept === 1 ? '' : 's'} kept default copy.` : source
}

export default sectionAiRoutes
