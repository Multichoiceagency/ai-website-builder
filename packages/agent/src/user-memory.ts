/**
 * Gebruikersgeheugen, gescheiden per tenant.
 *
 * OpenThorn bewaarde dit in localStorage van de browser. Dat kan hier niet:
 * de agent draait server-side voor meerdere tenants tegelijk. Deze module
 * houdt dezelfde functienamen aan als het origineel, zodat `agent.ts`
 * ongewijzigd blijft, maar leest en schrijft via de AgentHost.
 *
 * De functies zijn synchroon in het origineel en dat moeten ze hier blijven;
 * daarom werkt dit op een cache die aan het begin van de run wordt gevuld
 * (`primeMemory`) en aan het eind wordt weggeschreven (`flushMemory`).
 */
import { requireHost, getHost } from "./runtime-context";
import type { MemoryKind, UserMemoryEntry } from "./host";

export type { MemoryKind, UserMemoryEntry };

const cache = new Map<string, UserMemoryEntry[]>();
const dirty = new Set<string>();

/** Laadt het geheugen van deze gebruiker vóór de run begint. */
export async function primeMemory(userId: string): Promise<void> {
  const host = requireHost(userId);
  cache.set(userId, await host.loadMemory());
  dirty.delete(userId);
}

/** Schrijft gewijzigd geheugen terug en leegt de cache. */
export async function flushMemory(userId: string): Promise<void> {
  if (dirty.has(userId)) {
    const host = getHost(userId);
    if (host) await host.saveMemory(cache.get(userId) ?? []);
  }
  cache.delete(userId);
  dirty.delete(userId);
}

export function loadUserMemory(userId: string): UserMemoryEntry[] {
  return cache.get(userId) ?? [];
}

export function saveUserMemory(userId: string, entries: UserMemoryEntry[]): void {
  cache.set(userId, entries);
  dirty.add(userId);
}

/** Voegt een feit toe; duplicaten worden genegeerd zodat het geheugen niet vervuilt. */
export function rememberForUser(
  userId: string,
  kind: MemoryKind,
  text: string,
): UserMemoryEntry[] {
  const entries = loadUserMemory(userId);
  const trimmed = text.trim();
  if (!trimmed) return entries;
  if (entries.some((e) => e.text === trimmed && e.kind === kind)) return entries;

  const next = [
    ...entries,
    {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      text: trimmed,
      createdAt: new Date().toISOString(),
    },
  ];
  saveUserMemory(userId, next);
  return next;
}

export function forgetForUser(userId: string, id: string): UserMemoryEntry[] {
  const next = loadUserMemory(userId).filter((e) => e.id !== id);
  saveUserMemory(userId, next);
  return next;
}

/** Zet het geheugen om in een systeemherinnering voor het model. */
export function userMemoryToSystemReminder(entries: UserMemoryEntry[]): string {
  if (!entries.length) return "";
  const lines = entries.map((e) => `- [${e.kind}] ${e.text}`).join("\n");
  return `Known preferences and facts about this user:\n${lines}`;
}

/**
 * Leidt duurzame voorkeuren af uit de prompt. Bewust conservatief: liever niets
 * onthouden dan een toevallige formulering als voorkeur vastleggen.
 */
export function inferPreferencesFromPrompt(prompt: string): string[] {
  const found: string[] = [];
  const p = prompt.toLowerCase();
  if (/\bdark mode\b|\bdonkere?\s+(modus|thema)\b/.test(p)) {
    found.push("Prefers dark mode");
  }
  if (/\bno animations?\b|\bgeen animaties?\b/.test(p)) {
    found.push("Prefers no animations");
  }
  return found;
}
