import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { sql } from './db/client.js'
import { env, isProduction, isTest } from './config/env.js'
import authPlugin from './plugins/auth.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import adminRoutes from './routes/admin.js'
import aiRoutes from './routes/ai.js'
import trackingRoutes from './routes/tracking.js'
import analyticsRoutes from './routes/analytics.js'
import seoRoutes from './routes/seo.js'
import commerceRoutes from './routes/commerce.js'
import cmsRoutes from './routes/cms.js'
import contentRoutes from './routes/content.js'
import crmRoutes from './routes/crm.js'
import adsRoutes from './routes/ads.js'
import appsRoutes from './routes/apps.js'
import experimentsRoutes from './routes/experiments.js'
import agencyRoutes from './routes/agency.js'
import integrationsRoutes from './routes/integrations.js'
import assetsRoutes from './routes/assets.js'
import adminMetricsRoutes from './routes/admin-metrics.js'
import authRoutes from './routes/auth.js'
import blocksRoutes from './routes/blocks.js'
import onboardingRoutes from './routes/onboarding.js'
import pagesRoutes from './routes/pages.js'
import publicRoutes from './routes/public.js'
import settingsRoutes from './routes/settings.js'
import sectionAiRoutes from './routes/section-ai.js'
import sitesRoutes from './routes/sites.js'
import stockRoutes from './routes/stock.js'
import templatesRoutes from './routes/templates.js'
import tenantsRoutes from './routes/tenants.js'
import feedbackRoutes from './routes/feedback.js'
import { ok } from './lib/response.js'

/**
 * The API gateway for the platform core. Cross-cutting concerns are plugins;
 * domains are route modules. Nothing here knows about a vendor (ADR-0006).
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isTest ? false : { level: env.LOG_LEVEL },
    // Trust the proxy for client IPs — required for rate limiting and for
    // resolving the storefront's original Host header behind a load balancer.
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
  })

  await app.register(errorHandlerPlugin)
  await app.register(cookie, { secret: env.SESSION_SECRET })
  await app.register(cors, {
    // Exact allow-list, plus local `{slug}.localhost` tenant hosts in non-prod
    // so onboarding previews work without editing CORS_ORIGINS per site.
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      if (env.CORS_ORIGINS.includes(origin)) {
        callback(null, true)
        return
      }
      if (!isProduction) {
        try {
          const url = new URL(origin)
          const localHost =
            url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
          if (localHost && (url.protocol === 'http:' || url.protocol === 'https:')) {
            callback(null, true)
            return
          }
        } catch {
          /* fall through */
        }
      }
      callback(null, false)
    },
    // Sessions are cookie-based, so the browser must be allowed to send them.
    credentials: true,
  })
  await app.register(authPlugin)

  // Liveness only — do not block Coolify/compose health on DB or ffmpeg.
  // A failing SELECT previously marked the container unhealthy and blocked dashboard.
  app.get('/health', async (_request, reply) => {
    let database: 'up' | 'down' = 'down'
    try {
      const [row] = await sql<{ ok: number }[]>`SELECT 1 AS ok`
      database = row?.ok === 1 ? 'up' : 'down'
    } catch (error) {
      app.log.warn({ err: error }, 'health database probe failed')
    }
    return reply.send(
      ok({
        status: 'ok',
        database,
        environment: env.NODE_ENV,
      }),
    )
  })

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(tenantsRoutes, { prefix: '/api/v1/tenants' })
  await app.register(sitesRoutes, { prefix: '/api/v1/sites' })
  await app.register(blocksRoutes, { prefix: '/api/v1/blocks' })
  await app.register(templatesRoutes, { prefix: '/api/v1/templates' })
  await app.register(assetsRoutes, { prefix: '/api/v1/assets' })
  await app.register(aiRoutes, { prefix: '/api/v1/ai' })
  // Page routes declare their own `/sites/...` and `/pages/...` paths because
  // creation is nested under a site while everything else is addressed by id.
  await app.register(pagesRoutes, { prefix: '/api/v1' })
  await app.register(sectionAiRoutes, { prefix: '/api/v1' })

  await app.register(contentRoutes, { prefix: '/api/v1/content' })
  await app.register(cmsRoutes, { prefix: '/api/v1' })

  // Stock search / import — vendor adapters only (ADR-0006).
  await app.register(stockRoutes, { prefix: '/api/v1/stock' })

  await app.register(onboardingRoutes, { prefix: '/api/v1/onboarding' })

  // Internal staff console. Guarded by platform_admins membership, not by any
  // tenant role — see routes/admin.ts + admin-metrics.ts.
  await app.register(adminRoutes, { prefix: '/api/v1/admin' })
  await app.register(adminMetricsRoutes, { prefix: '/api/v1/admin' })

  await app.register(trackingRoutes, { prefix: '/api/v1/tracking' })

  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })

  await app.register(seoRoutes, { prefix: '/api/v1/seo' })

  await app.register(commerceRoutes, { prefix: '/api/v1/commerce' })

  await app.register(crmRoutes, { prefix: '/api/v1/crm' })

  await app.register(adsRoutes, { prefix: '/api/v1/ads' })

  await app.register(appsRoutes, { prefix: '/api/v1/apps' })

  await app.register(experimentsRoutes, { prefix: '/api/v1/experiments' })

  await app.register(agencyRoutes, { prefix: '/api/v1/agency' })

  await app.register(integrationsRoutes, { prefix: '/api/v1/integrations' })

  await app.register(settingsRoutes, { prefix: '/api/v1/settings' })
  await app.register(feedbackRoutes, { prefix: '/api/v1/feedback' })

  await app.register(publicRoutes, { prefix: '/public/v1' })

  return app
}
