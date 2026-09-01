import type { FastifyPluginAsync } from 'fastify'
import { AppError } from '../lib/errors.js'
import { ISLAND_ID, islandArtifactKey, mimeForPath } from '../lib/motionsites/island-artifacts.js'
import { storage } from '../lib/storage/index.js'

/** Public: an island is page content, and the storefront proxies here for it. */
const motionsitesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { sectionId: string; '*': string } }>('/islands/:sectionId/*', async (request, reply) => {
    const { sectionId } = request.params
    const rest = request.params['*'] || 'index.html'
    if (!ISLAND_ID.test(sectionId)) throw new AppError(404, 'not_found', 'Island not found')

    const body = await storage().get(islandArtifactKey(sectionId, rest))
    if (!body) throw new AppError(404, 'not_found', 'Island file not found')

    return reply
      .header('content-type', mimeForPath(rest))
      .header('cache-control', 'public, max-age=3600')
      .send(body)
  })
}

export default motionsitesRoutes
