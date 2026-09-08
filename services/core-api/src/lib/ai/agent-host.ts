import type { AgentHost, ProviderKey, UserMemoryEntry } from '@platform/agent/host'
import { withTenant } from '../../db/client.js'
import {
  listEnabledProviderKeys,
  findProviderModels,
} from '../../db/repositories/ai-builder.js'

/**
 * The platform's AgentHost: what the ported OpenThorn agent reads from us.
 *
 * The agent was written single-tenant against browser globals — localStorage
 * for memory, one shared Supabase client for keys and profiles. Here every one
 * of those reads is scoped to a verified tenant instead, so two builds running
 * at the same time cannot see each other's keys or memory.
 *
 * Every query goes through `withTenant`, which sets the row-level-security
 * context. That is the guarantee: even a mistake in this file cannot read
 * another tenant's rows.
 */
export interface PlatformAgentHostInput {
  tenantId: string
  userId: string
  /** Optional: passed through to the agent for backend-connected projects. */
  sessionToken?: string | null
  /** Free-text instructions the tenant wants applied to every build. */
  customInstructions?: string | null
}

export function createPlatformAgentHost(input: PlatformAgentHostInput): AgentHost {
  const { tenantId, userId } = input

  /**
   * Memory is held for the duration of one run and written back at the end.
   *
   * It is deliberately not persisted yet: the agent only calls save at the end
   * of a run, and storing cross-run preferences is a product decision (what is
   * remembered about a customer, and for how long) that has not been made.
   * Returning an empty list is honest — the agent then behaves as if this is a
   * first run, which it effectively is.
   */
  let memory: UserMemoryEntry[] = []

  return {
    tenantId,
    userId,

    async listProviderKeys(): Promise<ProviderKey[]> {
      return withTenant(tenantId, (tx) => listEnabledProviderKeys(tx, tenantId))
    },

    async getDefaultModels(providerId: string): Promise<string | null> {
      return withTenant(tenantId, (tx) => findProviderModels(tx, tenantId, providerId))
    },

    async getCustomInstructions(): Promise<string | null> {
      return input.customInstructions ?? null
    },

    async getSessionToken(): Promise<string | null> {
      return input.sessionToken ?? null
    },

    async loadMemory(): Promise<UserMemoryEntry[]> {
      return memory
    },

    async saveMemory(entries: UserMemoryEntry[]): Promise<void> {
      memory = entries
    },
  }
}
