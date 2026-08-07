/**
 * `@platform/schemas` — the single source of truth for every shape that crosses
 * a boundary: HTTP, queue, database, AI structured output, webhook.
 *
 * Nothing downstream may re-declare a shape that exists here. See ADR-0002.
 */
export * from './common.js'
export * from './rbac.js'
export * from './tenant.js'
export * from './auth.js'
export * from './blocks.js'
export * from './motion-templates.js'
export * from './theming.js'
export * from './cms.js'
export * from './content.js'
export * from './events.js'
export * from './business.js'
export * from './ai.js'
export * from './tracking.js'
export * from './analytics.js'
export * from './seo.js'
export * from './commerce.js'
export * from './crm.js'
export * from './ads.js'
export * from './apps.js'
export * from './experiments.js'
export * from './agency.js'
export * from './registry.js'
export * from './templates.js'
export * from './settings.js'
export * from './assets.js'
