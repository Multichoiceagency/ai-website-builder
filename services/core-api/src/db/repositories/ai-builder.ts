import type { Tx } from '../client.js'
import { decryptToken, encryptToken } from '../../lib/integrations/crypto.js'

/**
 * BYOK provider keys and build-run records for the AI website builder.
 *
 * Keys are encrypted on the way in and decrypted on the way out, so no caller
 * holds a ciphertext and no row holds a plaintext — the same contract as
 * integration tokens (ADR-0009, §60).
 *
 * Unlike `api_keys` these cannot be hashed: the agent has to present the real
 * key to the provider, so encryption is the tool, not a digest.
 */

/** One provider configuration, key already readable. Mirrors ProviderKey in @platform/agent. */
export interface AiProviderKey {
  id: string
  provider_id: string
  provider_name: string
  api_key: string
  base_url: string | null
  models: string | null
  enabled: boolean
  is_custom: boolean | null
}

/** The same record without the key, for listings the browser may see. */
export interface AiProviderKeySummary {
  id: string
  providerId: string
  providerName: string
  baseUrl: string | null
  models: string | null
  enabled: boolean
  isCustom: boolean
  createdAt: Date
}

interface Row {
  id: string
  provider_id: string
  provider_name: string
  api_key_enc: string
  base_url: string | null
  models: string | null
  enabled: boolean
  is_custom: boolean
  created_at: Date
}

/**
 * Enabled providers for one tenant, keys decrypted, preferred order first.
 *
 * A row whose ciphertext no longer decrypts (rotated `SESSION_SECRET`, corrupt
 * value) is skipped rather than returned with a null key: the agent would
 * otherwise send an empty Authorization header and get an opaque 401 from the
 * provider. Skipping surfaces it as "no provider configured", which points at
 * the real fix — re-enter the key.
 */
export async function listEnabledProviderKeys(tx: Tx, tenantId: string): Promise<AiProviderKey[]> {
  const rows = await tx<Row[]>`
    SELECT id, provider_id, provider_name, api_key_enc, base_url, models, enabled, is_custom, created_at
    FROM ai_provider_keys
    WHERE tenant_id = ${tenantId} AND enabled = true
    ORDER BY created_at ASC
  `

  const keys: AiProviderKey[] = []
  for (const row of rows) {
    const apiKey = decryptToken(row.api_key_enc)
    if (!apiKey) continue
    keys.push({
      id: row.id,
      provider_id: row.provider_id,
      provider_name: row.provider_name,
      api_key: apiKey,
      base_url: row.base_url,
      models: row.models,
      enabled: row.enabled,
      is_custom: row.is_custom,
    })
  }
  return keys
}

/** Listing for the UI. Never includes key material, not even encrypted. */
export async function listProviderKeySummaries(
  tx: Tx,
  tenantId: string,
): Promise<AiProviderKeySummary[]> {
  const rows = await tx<Omit<Row, 'api_key_enc'>[]>`
    SELECT id, provider_id, provider_name, base_url, models, enabled, is_custom, created_at
    FROM ai_provider_keys
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
  `
  return rows.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    baseUrl: row.base_url,
    models: row.models,
    enabled: row.enabled,
    isCustom: row.is_custom,
    createdAt: row.created_at,
  }))
}

/** Adds or replaces the key for one provider. Re-adding rotates it in place. */
export async function upsertProviderKey(
  tx: Tx,
  input: {
    tenantId: string
    addedBy: string
    providerId: string
    providerName: string
    apiKey: string
    baseUrl?: string | null
    models?: string | null
    isCustom?: boolean
  },
): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO ai_provider_keys
      (tenant_id, added_by, provider_id, provider_name, api_key_enc, base_url, models, is_custom)
    VALUES (
      ${input.tenantId}, ${input.addedBy}, ${input.providerId}, ${input.providerName},
      ${encryptToken(input.apiKey)}, ${input.baseUrl ?? null}, ${input.models ?? null},
      ${input.isCustom ?? false}
    )
    ON CONFLICT (tenant_id, provider_id) DO UPDATE SET
      api_key_enc = EXCLUDED.api_key_enc,
      provider_name = EXCLUDED.provider_name,
      base_url = EXCLUDED.base_url,
      models = EXCLUDED.models,
      enabled = true,
      updated_at = now()
    RETURNING id
  `
  return row!.id
}

export async function deleteProviderKey(tx: Tx, tenantId: string, id: string): Promise<boolean> {
  const rows = await tx<{ id: string }[]>`
    DELETE FROM ai_provider_keys
    WHERE tenant_id = ${tenantId} AND id = ${id}
    RETURNING id
  `
  return rows.length > 0
}

/** Model overrides for one provider, or null to use the built-in catalogue. */
export async function findProviderModels(
  tx: Tx,
  tenantId: string,
  providerId: string,
): Promise<string | null> {
  const [row] = await tx<{ models: string | null }[]>`
    SELECT models FROM ai_provider_keys
    WHERE tenant_id = ${tenantId} AND provider_id = ${providerId}
  `
  return row?.models ?? null
}

// ─── Build runs ─────────────────────────────────────────────────────────────

export async function startBuildRun(
  tx: Tx,
  input: { tenantId: string; userId: string; siteId?: string | null; prompt: string },
): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO ai_build_runs (tenant_id, user_id, site_id, prompt)
    VALUES (${input.tenantId}, ${input.userId}, ${input.siteId ?? null}, ${input.prompt})
    RETURNING id
  `
  return row!.id
}

export async function finishBuildRun(
  tx: Tx,
  input: {
    tenantId: string
    runId: string
    status: 'done' | 'failed' | 'aborted'
    providerId?: string | null
    modelId?: string | null
    inputTokens?: number
    outputTokens?: number
    error?: string | null
  },
): Promise<void> {
  await tx`
    UPDATE ai_build_runs SET
      status = ${input.status},
      provider_id = ${input.providerId ?? null},
      model_id = ${input.modelId ?? null},
      input_tokens = ${input.inputTokens ?? 0},
      output_tokens = ${input.outputTokens ?? 0},
      error = ${input.error ?? null},
      finished_at = now()
    WHERE id = ${input.runId} AND tenant_id = ${input.tenantId}
  `
}
