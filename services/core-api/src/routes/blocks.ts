import type { FastifyPluginAsync } from 'fastify'
import { COLLECTIONS, countBlocksByCollection, getBlock, searchBlocks } from '@platform/blocks'
import { toBlockMetadata } from '@platform/blocks'
import { registryBlockQuerySchema } from '@platform/schemas'
import { NotFoundError } from '../lib/errors.js'
import { ok } from '../lib/response.js'
import { parseOrThrow } from '../lib/validate.js'
import { requireUser } from '../plugins/auth.js'

/**
 * The block catalogue. Serving it from the API — rather than bundling it into
 * the dashboard — is what keeps the editor's block picker, the component lab
 * and the AI block selector on one source of truth (ADR-0003).
 *
 * Everything here is *already installed* metadata. Installing a component is a
 * build-time act performed by `pnpm registry:add`, never an HTTP call: see the
 * note at the top of `packages/registry/src/manifest.mjs`. There is deliberately
 * no endpoint that fetches or evaluates component source.
 */
const blocksRoutes: FastifyPluginAsync = async (app) => {
  /**
   * `GET /` — search the catalogue.
   *
   * Filters: category, industry, style, collection, tags, performance ceiling,
   * minimum performance score, free text. The same query object the generation
   * pipeline passes to `searchBlocks()`.
   */
  app.get('/', async (request, reply) => {
    requireUser(request)
    const query = parseOrThrow(registryBlockQuerySchema, request.query ?? {}, 'block query')
    return reply.send(ok(searchBlocks(query)))
  })

  /**
   * `GET /collections` — the collections and how many blocks each holds.
   *
   * Counts come from the live registry rather than a constant, so a collection
   * can never advertise a block that is not registered.
   */
  app.get('/collections', async (request, reply) => {
    requireUser(request)
    const counts = countBlocksByCollection()
    return reply.send(
      ok(COLLECTIONS.map((collection) => ({ ...collection, entryCount: counts[collection.id] ?? 0 }))),
    )
  })

  /** `GET /:id` — one block, including its defaults and editor field descriptors. */
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    requireUser(request)
    const definition = getBlock(request.params.id)
    if (!definition) throw new NotFoundError(`Block "${request.params.id}"`)

    const facets = searchBlocks().find((block) => block.id === definition.id)
    return reply.send(
      ok({ ...toBlockMetadata(definition), collection: facets?.collection ?? 'core', tags: facets?.tags ?? [] }),
    )
  })
}

export default blocksRoutes
