import type { FastifyPluginAsync } from 'fastify'
import { searchBlocks } from '@platform/blocks'
import { getTemplate, listTemplateCollections, searchBackgrounds, searchTemplates } from '@platform/templates'
import { motionBackgroundQuerySchema, templateQuerySchema } from '@platform/schemas'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireUser } from '../plugins/auth.js'
import { briefFor, preferencesFromRecipe } from '../lib/generation/templates.js'

/**
 * The template catalogue.
 *
 * Served from the API for the same reason the block catalogue is (ADR-0003):
 * the browser, the onboarding picker and the generator must be looking at one
 * list. A template is metadata — a style direction, a motion character and an
 * ordered recipe of registry block ids — so this route is a pure read with
 * nothing tenant-specific in it.
 */
const templatesRoutes: FastifyPluginAsync = async (app) => {
  /** The left rail: browsable groups with counts. */
  app.get('/collections', async (request, reply) => {
    requireUser(request)
    return reply.send(ok(listTemplateCollections()))
  })

  app.get('/', async (request, reply) => {
    requireUser(request)
    const query = parseOrThrow(templateQuerySchema, request.query ?? {}, 'template query')
    return reply.send(ok(searchTemplates(query)))
  })

  /**
   * MotionSites backgrounds — rebuild prompts for the section AI. No media
   * files are served; the catalogue is mood metadata only (ADR-0003).
   */
  app.get('/backgrounds', async (request, reply) => {
    requireUser(request)
    const query = parseOrThrow(motionBackgroundQuerySchema, request.query ?? {}, 'background query')
    return reply.send(ok(searchBackgrounds(query)))
  })

  /**
   * One template, with its recipe resolved against the live registry.
   *
   * The resolution matters: the catalogue is generated, so a block could have
   * been retired since. Returning what the recipe *actually* maps to today —
   * and naming what it no longer maps to — keeps the detail view honest rather
   * than confidently wrong.
   */
  app.get('/:id', async (request, reply) => {
    requireUser(request)
    const { id } = request.params as { id: string }

    const template = getTemplate(id)
    if (!template) throw new NotFoundError(`No template with id "${id}".`)

    const registry = new Map(searchBlocks({}).map((block) => [block.id, block]))
    const blocks = template.blockRecipe.map((blockId) => registry.get(blockId)).filter((block) => Boolean(block))
    const unavailable = template.blockRecipe.filter((blockId) => !registry.has(blockId))

    return reply.send(
      ok({
        template,
        blocks,
        unavailable,
        /** What choosing this template would contribute to a generation run. */
        steering: {
          style: template.style[0] ?? 'modern',
          preferences: preferencesFromRecipe(template.blockRecipe),
          brief: briefFor(template),
        },
      }),
    )
  })
}

export default templatesRoutes
