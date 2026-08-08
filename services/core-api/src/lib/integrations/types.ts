/**
 * Shared shape for OAuth / API-key integrations (§18).
 *
 * Google is first. Meta and others join the same catalog later without changing
 * this contract — each provider implements `isConfigured` /
 * `configurationProblem` against its own env vars.
 */
export interface IntegrationProvider {
  id: string
  name: string
  isConfigured(): boolean
  configurationProblem(): string | null
}
