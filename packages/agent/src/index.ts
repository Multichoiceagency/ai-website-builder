/**
 * @platform/agent — de AI-bouwagent.
 *
 * Overgenomen uit OpenThorn (MIT, © 2026 Thomas Tschinkel); zie LICENSE.
 *
 * Verschil met het origineel: waar OpenThorn single-tenant in de browser draait
 * en zijn omgeving uit module-globals haalt (localStorage, één Supabase-client,
 * Web Crypto van de ingelogde bezoeker), krijgt de agent hier een `AgentHost`
 * geïnjecteerd. Registreer die vóór de run en geef hem daarna weer vrij:
 *
 *   registerHost(host)
 *   await primeMemory(host.userId)
 *   try { ...run... } finally {
 *     await flushMemory(host.userId)
 *     releaseHost(host.userId)
 *   }
 */
export type {
  AgentHost,
  ProviderKey,
  UserMemoryEntry,
  MemoryKind,
} from "./host";
export { createInMemoryHost } from "./host";
export { registerHost, releaseHost, getHost } from "./runtime-context";
export { primeMemory, flushMemory } from "./user-memory";
export { PROVIDERS } from "./providers";
