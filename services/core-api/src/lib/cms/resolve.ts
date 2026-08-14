import {
  cmsSettingsSchema,
  type CmsProvider,
} from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { findPublishedCmsEntry } from '../../db/repositories/cms.js'
import { findSecretValue, findSettingsDocument } from '../../db/repositories/settings.js'
import { fetchRemoteCmsEntry } from './remote.js'
import { AppError } from '../errors.js'

export async function resolveCmsEntry(input: {
  tenantId?: string
  siteId: string
  provider: CmsProvider
  collection: string
  slug: string
}): Promise<Record<string, unknown> | null> {
  if (input.provider === 'platform') {
    const entry = await findPublishedCmsEntry({
      siteId: input.siteId,
      collectionSlug: input.collection,
      entrySlug: input.slug,
    })
    return entry ? { ...entry.data, title: entry.title, slug: entry.slug } : null
  }

  if (!input.tenantId) {
    throw new AppError(400, 'cms_not_configured', 'Connect this CMS under Settings → CMS.')
  }

  const { settings, apiKey } = await withTenant(input.tenantId, async (tx) => {
    const document = await findSettingsDocument(tx, input.tenantId!, 'platform', 'cms')
    const parsed = cmsSettingsSchema.parse(document?.value ?? {})
    const field = input.provider === 'frappe' ? 'frappeApiKey' : 'wordpressApiKey'
    const apiKey = await findSecretValue(tx, input.tenantId!, 'platform', 'cms', field)
    return { settings: parsed, apiKey }
  })

  const enabled = input.provider === 'frappe' ? settings.frappeEnabled : settings.wordpressEnabled
  const baseUrl = input.provider === 'frappe' ? settings.frappeBaseUrl : settings.wordpressBaseUrl
  if (!enabled || !baseUrl) {
    throw new AppError(400, 'cms_not_configured', 'Connect this CMS under Settings → CMS.')
  }

  const collection =
    input.provider === 'frappe'
      ? settings.frappeDoctype || input.collection
      : settings.wordpressPostType || input.collection

  return fetchRemoteCmsEntry({
    provider: input.provider,
    baseUrl,
    collection,
    slug: input.slug,
    apiKey: apiKey ?? undefined,
  })
}
