/**
 * Actieve host per run.
 *
 * `agent.ts` geeft overal al een `userId` door, maar haalde de bijbehorende
 * opslag uit module-globals (localStorage, één Supabase-client). Die globals
 * zijn hier vervangen door een register: de host wordt per run geregistreerd
 * en de adapters zoeken hem op via de userId die de agent toch al doorgeeft.
 *
 * Dat houdt de diff in agent.ts klein en maakt tenants tegelijk gescheiden —
 * twee runs voor verschillende tenants raken elkaars geheugen of sleutels niet.
 */
import type { AgentHost } from "./host";

const hosts = new Map<string, AgentHost>();

/** Koppelt een host aan zijn userId voor de duur van een run. */
export function registerHost(host: AgentHost): void {
  hosts.set(host.userId, host);
}

/** Haalt de host weg zodra de run klaar is; laat geen sleutels achter. */
export function releaseHost(userId: string): void {
  hosts.delete(userId);
}

/**
 * Host van deze gebruiker. Ontbreekt hij, dan is dat een programmeerfout in de
 * aanroepende app en geen situatie om stil door te lopen: zonder host zou de
 * agent terugvallen op gedeelde opslag en tenants door elkaar halen.
 */
export function requireHost(userId: string): AgentHost {
  const host = hosts.get(userId);
  if (!host) {
    throw new Error(
      `Geen AgentHost geregistreerd voor gebruiker ${userId}. ` +
        `Roep registerHost() aan voordat de run start.`,
    );
  }
  return host;
}

export function getHost(userId: string): AgentHost | undefined {
  return hosts.get(userId);
}
