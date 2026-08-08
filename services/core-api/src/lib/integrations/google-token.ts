import { withTenant } from '../../db/client.js'
import {
  findConnectionTokens,
  recordConnectionError,
  updateAccessToken,
} from '../../db/repositories/integrations.js'
import { getNangoGoogleAccessToken, isNangoConfigured } from '../../adapters/integrations/nango.js'
import { BadRequestError, NotFoundError } from '../errors.js'
import { refreshAccessToken } from './google.js'

/**
 * Usable Google OAuth access token for a tenant, refreshing when near expiry.
 * Shared by GBP, Search Console, and GA4 Data API callers.
 *
 * Prefer Nango when the connection was brokered there; otherwise legacy PKCE tokens.
 */
export async function googleAccessTokenFor(tenantId: string): Promise<string> {
  const tokens = await withTenant(tenantId, (tx) => findConnectionTokens(tx, tenantId, 'google'))
  if (!tokens) throw new NotFoundError('Google connection')

  if (tokens.broker === 'nango' && tokens.brokerConnectionId && isNangoConfigured()) {
    try {
      const fresh = await getNangoGoogleAccessToken(tokens.brokerConnectionId)
      await withTenant(tenantId, (tx) =>
        updateAccessToken(tx, tokens.id, fresh.accessToken, fresh.expiresAt),
      )
      return fresh.accessToken
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nango token fetch failed.'
      await withTenant(tenantId, (tx) => recordConnectionError(tx, tokens.id, message))
      throw new BadRequestError(`Could not refresh the Google connection via Nango: ${message}`)
    }
  }

  if (!tokens.accessToken) throw new NotFoundError('Google connection')

  const stillValid = !tokens.expiresAt || tokens.expiresAt.getTime() > Date.now() + 60_000
  if (stillValid) return tokens.accessToken

  if (!tokens.refreshToken) {
    throw new BadRequestError('This Google connection has expired and has no refresh token. Reconnect it.')
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken)
    await withTenant(tenantId, (tx) =>
      updateAccessToken(tx, tokens.id, refreshed.accessToken, refreshed.expiresAt),
    )
    return refreshed.accessToken
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refresh failed.'
    await withTenant(tenantId, (tx) => recordConnectionError(tx, tokens.id, message))
    throw new BadRequestError(`Could not refresh the Google connection: ${message}`)
  }
}

export async function hasGoogleConnection(tenantId: string): Promise<boolean> {
  const tokens = await withTenant(tenantId, (tx) => findConnectionTokens(tx, tenantId, 'google'))
  if (!tokens) return false
  if (tokens.broker === 'nango' && tokens.brokerConnectionId) return true
  return Boolean(tokens.accessToken || tokens.refreshToken)
}
