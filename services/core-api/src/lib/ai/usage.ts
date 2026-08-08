import type { Tx } from '../../db/client.js'

export interface RecordAiUsageInput {
  tenantId: string
  feature: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/**
 * Append one metered AI call. Call after a successful generate/revise — never
 * before, and never for a provider that threw.
 */
export async function recordAiUsage(tx: Tx, input: RecordAiUsageInput): Promise<void> {
  await tx`
    INSERT INTO ai_usage (
      tenant_id, feature, model, input_tokens, output_tokens, cost_usd
    )
    VALUES (
      ${input.tenantId},
      ${input.feature},
      ${input.model},
      ${input.inputTokens},
      ${input.outputTokens},
      ${input.costUsd}
    )
  `
}
