import type { AdsProviderId, AdsProviderStatus } from '@platform/schemas'
import {
  ProviderUnavailableError,
  getAdsProvider,
  type AdsProviderContext,
} from '../../adapters/ads/index.js'
import { findConnection, findConnectionWithSecrets } from '../../db/repositories/ads.js'
import type { Tx } from '../../db/client.js'
import { AppError } from '../errors.js'

/**
 * The bridge between a request and an ads adapter.
 *
 * Lives here rather than in a route module because every ads route needs it and
 * none of them should each decide for themselves whether a call gets to see
 * credentials.
 */

/**
 * Resolve one provider plus this tenant's link to it.
 *
 * `withSecrets` is opt-in and only ever true on a path that is about to call
 * the network. Read paths get connection metadata with the credential columns
 * left unselected, so there is no route through which a token could reach a
 * response (ADR-0009).
 */
export async function providerContext(
  tx: Tx,
  tenantId: string,
  provider: AdsProviderId,
  options: { withSecrets?: boolean } = {},
): Promise<AdsProviderContext> {
  const connection = options.withSecrets
    ? await findConnectionWithSecrets(tx, tenantId, provider)
    : await findConnection(tx, tenantId, provider)

  return { tenantId, connection }
}

export async function statusFor(
  tx: Tx,
  tenantId: string,
  provider: AdsProviderId,
): Promise<AdsProviderStatus> {
  return getAdsProvider(provider).status(await providerContext(tx, tenantId, provider))
}

/**
 * A provider that cannot do what was asked, turned into an answer a person can
 * act on: 503 when the *operator* has to fix something, 409 when the *user*
 * does. Collapsing both into one status would tell the reader nothing about
 * whose problem it is.
 */
export function providerFailure(error: ProviderUnavailableError): AppError {
  return error.missingConfiguration.length > 0
    ? new AppError(503, 'provider_not_configured', error.reason, {
        provider: error.provider,
        missingConfiguration: error.missingConfiguration,
      })
    : new AppError(409, 'provider_not_connected', error.reason, { provider: error.provider })
}

/** Rethrows anything that is not a provider outage untouched. */
export function rethrowProviderFailure(error: unknown): never {
  if (error instanceof ProviderUnavailableError) throw providerFailure(error)
  throw error
}
