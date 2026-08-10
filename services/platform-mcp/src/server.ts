#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createCoreApiClient } from './client.js'

/**
 * Platform MCP connector — discover / plan / generate / sites / pages / templates.
 * Auth: session cookie + x-tenant-id (see client.ts). Risk: publish defaults false.
 */

const api = createCoreApiClient()

const server = new McpServer({
  name: 'platform-mcp',
  version: '0.1.0',
})

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

server.tool('onboarding_capabilities', 'AI + Google integration status for onboarding', {}, async () =>
  text(await api.get('/api/v1/onboarding/capabilities')),
)

server.tool(
  'discover_business',
  'Crawl a website or use a GBP location id to build a BusinessProfile',
  {
    website: z.string().optional(),
    businessName: z.string().optional(),
    city: z.string().optional(),
    locale: z.string().optional(),
    googleLocationId: z.string().optional(),
    maxPages: z.number().int().min(1).max(25).optional(),
  },
  async (args) =>
    text(
      await api.post('/api/v1/onboarding/discover', {
        website: args.website,
        businessName: args.businessName,
        city: args.city,
        locale: args.locale ?? 'nl',
        googleLocationId: args.googleLocationId,
        socialUrls: [],
        maxPages: args.maxPages ?? 8,
      }),
    ),
)

server.tool(
  'list_templates',
  'List site templates (unique recipes by default)',
  {
    search: z.string().optional(),
    collection: z.string().optional(),
    pageType: z.enum(['section', 'landing']).optional(),
    uniqueRecipes: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  async (args) =>
    text(
      await api.get('/api/v1/templates', {
        search: args.search,
        collection: args.collection,
        pageType: args.pageType,
        uniqueRecipes: args.uniqueRecipes ?? true,
        limit: args.limit ?? 100,
      }),
    ),
)

server.tool('get_template', 'Get one template by id', { id: z.string() }, async ({ id }) =>
  text(await api.get(`/api/v1/templates/${encodeURIComponent(id)}`)),
)

server.tool(
  'list_blocks',
  'List registry blocks',
  { search: z.string().optional(), limit: z.number().int().optional() },
  async (args) =>
    text(
      await api.get('/api/v1/blocks', {
        search: args.search,
        limit: args.limit ?? 100,
      }),
    ),
)

server.tool(
  'plan_website',
  'Dry-run site plan from a BusinessProfile (no writes)',
  {
    profile: z.record(z.unknown()),
    style: z.enum(['auto', 'minimal', 'modern', 'premium', 'bold', 'editorial']).optional(),
    templateId: z.string().optional(),
  },
  async (args) =>
    text(
      await api.post('/api/v1/onboarding/plan', {
        profile: args.profile,
        style: args.style ?? 'auto',
        templateId: args.templateId,
        publish: false,
      }),
    ),
)

server.tool(
  'generate_website',
  'Generate a website from a BusinessProfile. publish defaults to false (ADR-0007).',
  {
    profile: z.record(z.unknown()),
    style: z.enum(['auto', 'minimal', 'modern', 'premium', 'bold', 'editorial']).optional(),
    templateId: z.string().optional(),
    siteName: z.string().optional(),
    publish: z.boolean().optional(),
  },
  async (args) =>
    text(
      await api.post('/api/v1/onboarding/generate', {
        profile: args.profile,
        style: args.style ?? 'auto',
        templateId: args.templateId,
        siteName: args.siteName,
        publish: args.publish ?? false,
      }),
    ),
)

server.tool(
  'generate_website_from_prompt',
  'Ambora-style one-prompt website generation. publish defaults to false.',
  {
    prompt: z.string().min(8),
    locale: z.string().optional(),
    style: z.enum(['auto', 'minimal', 'modern', 'premium', 'bold', 'editorial']).optional(),
    templateId: z.string().optional(),
    publish: z.boolean().optional(),
  },
  async (args) =>
    text(
      await api.post('/api/v1/onboarding/generate-from-prompt', {
        prompt: args.prompt,
        locale: args.locale ?? 'nl',
        style: args.style ?? 'auto',
        templateId: args.templateId,
        publish: args.publish ?? false,
      }),
    ),
)

server.tool('get_onboarding_progress', 'Read onboarding funnel progress', {}, async () =>
  text(await api.get('/api/v1/onboarding/progress')),
)

server.tool(
  'update_onboarding_progress',
  'Patch onboarding funnel progress',
  { patch: z.record(z.unknown()) },
  async ({ patch }) => text(await api.patch('/api/v1/onboarding/progress', patch)),
)

server.tool('list_sites', 'List sites in the workspace', {}, async () =>
  text(await api.get('/api/v1/sites')),
)

server.tool('get_site', 'Get a site by id', { siteId: z.string() }, async ({ siteId }) =>
  text(await api.get(`/api/v1/sites/${encodeURIComponent(siteId)}`)),
)

server.tool(
  'list_pages',
  'List pages for a site',
  { siteId: z.string() },
  async ({ siteId }) => text(await api.get('/api/v1/pages', { siteId })),
)

server.tool('get_page', 'Get a page by id', { pageId: z.string() }, async ({ pageId }) =>
  text(await api.get(`/api/v1/pages/${encodeURIComponent(pageId)}`)),
)

server.tool(
  'get_navigation',
  'Get primary navigation for a site',
  { siteId: z.string() },
  async ({ siteId }) => text(await api.get(`/api/v1/sites/${encodeURIComponent(siteId)}/navigation`)),
)

// Phase 6b — risk-gated surface (confirm before high-risk publish tools)

server.tool(
  'commerce_status',
  'Commerce + payments provider status',
  {},
  async () => text(await api.get('/api/v1/commerce/status')),
)

server.tool(
  'store_build',
  'Build a shop from a prompt (commerce store builder)',
  {
    siteId: z.string(),
    prompt: z.string().min(8),
    currency: z.string().optional(),
    productCount: z.number().int().optional(),
  },
  async (args) =>
    text(
      await api.post('/api/v1/commerce/store/build', {
        siteId: args.siteId,
        prompt: args.prompt,
        currency: args.currency ?? 'EUR',
        productCount: args.productCount ?? 6,
      }),
    ),
)

server.tool(
  'publish_page',
  'HIGH RISK — publish a page. Requires confirm=true.',
  { pageId: z.string(), confirm: z.boolean() },
  async ({ pageId, confirm }) => {
    if (!confirm) {
      return text({ error: 'Set confirm=true to publish (ADR-0007).' })
    }
    return text(await api.post(`/api/v1/pages/${encodeURIComponent(pageId)}/publish`, {}))
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
