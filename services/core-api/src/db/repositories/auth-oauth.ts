import type { Tx } from '../client.js'

export type AuthOAuthMode = 'login' | 'register'

export interface AuthOAuthState {
  state: string
  mode: AuthOAuthMode
  codeVerifier: string
  redirectTo: string
  organizationName: string | null
  displayName: string | null
}

export async function insertAuthOAuthState(
  tx: Tx,
  input: AuthOAuthState & { ttlSeconds?: number },
): Promise<void> {
  const ttl = input.ttlSeconds ?? 600
  await tx`
    INSERT INTO auth_oauth_states (
      state, mode, code_verifier, redirect_to, organization_name, display_name, expires_at
    ) VALUES (
      ${input.state},
      ${input.mode},
      ${input.codeVerifier},
      ${input.redirectTo},
      ${input.organizationName},
      ${input.displayName},
      now() + make_interval(secs => ${ttl})
    )
  `
}

/** Single-use consume. Returns null when missing, expired, or already used. */
export async function consumeAuthOAuthState(tx: Tx, state: string): Promise<AuthOAuthState | null> {
  const [row] = await tx<{
    state: string
    mode: AuthOAuthMode
    code_verifier: string
    redirect_to: string
    organization_name: string | null
    display_name: string | null
  }[]>`
    UPDATE auth_oauth_states
    SET consumed_at = now()
    WHERE state = ${state}
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING state, mode, code_verifier, redirect_to, organization_name, display_name
  `
  if (!row) return null
  return {
    state: row.state,
    mode: row.mode,
    codeVerifier: row.code_verifier,
    redirectTo: row.redirect_to,
    organizationName: row.organization_name,
    displayName: row.display_name,
  }
}
