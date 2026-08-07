import { ADS_PROVIDER_IDS, type AdsProviderId } from '@platform/schemas'
import { GoogleAdsProvider } from './google.js'
import { MetaAdsProvider } from './meta.js'
import type { AdsProvider } from './types.js'

/**
 * The ads provider registry (ADR-0006).
 *
 * Routes ask for a provider by our id and get the interface back. Adding TikTok
 * means writing one adapter and adding one line here — no route, repository,
 * schema or dashboard component changes, because none of them can tell the
 * providers apart.
 */

const REGISTRY: Readonly<Record<AdsProviderId, AdsProvider>> = Object.freeze({
  google_ads: new GoogleAdsProvider(),
  meta_ads: new MetaAdsProvider(),
})

export function getAdsProvider(id: AdsProviderId): AdsProvider {
  return REGISTRY[id]
}

/** Every provider, in a stable order so the UI never reshuffles itself. */
export function listAdsProviders(): AdsProvider[] {
  return ADS_PROVIDER_IDS.map((id) => REGISTRY[id])
}

export {
  GOOGLE_BUSINESS_ACCESS_NOTE,
  GOOGLE_BUSINESS_REQUIRED_APIS,
  GOOGLE_BUSINESS_SCOPES,
  googleBusinessStatus,
} from './google-business.js'
export { decryptSecret, encryptSecret, safeEquals } from './secrets.js'
export {
  ProviderUnavailableError,
  type AdsConnection,
  type AdsConnectionSecrets,
  type AdsProvider,
  type AdsProviderContext,
  type ConnectRequest,
  type ConnectResult,
  type RemoteCampaign,
  type RemoteCampaignPatch,
} from './types.js'
