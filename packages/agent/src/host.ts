/**
 * Host-poort voor de agent.
 *
 * OpenThorn draait single-tenant in de browser: het leest gebruikersgeheugen uit
 * localStorage, praat met één globale Supabase-client en ontsleutelt sleutels
 * met de Web Crypto API van de ingelogde bezoeker. Geen van die drie aannames
 * houdt stand in een multi-tenant monorepo, waar één proces meerdere tenants
 * bedient en de sleutels server-side staan.
 *
 * Daarom krijgt de agent zijn omgeving voortaan injected in plaats van
 * geïmporteerd. Elke tenant levert zijn eigen implementatie; de agent zelf weet
 * niet meer wie de gebruiker is of waar iets is opgeslagen.
 */

/** Eén onthouden voorkeur, fix of feit van een gebruiker binnen een tenant. */
export type MemoryKind = "preference" | "fix" | "fact";

export interface UserMemoryEntry {
  id: string;
  kind: MemoryKind;
  text: string;
  createdAt: string;
}

/** Eén provider-configuratie van een tenant, sleutel al ontsleuteld. */
export interface ProviderKey {
  id: string;
  provider_id: string;
  provider_name: string;
  /** Leesbare sleutel. De agent bewaart hem nooit. */
  api_key: string;
  base_url: string | null;
  models: string | null;
  enabled: boolean;
  is_custom: boolean | null;
}

/**
 * Alles wat de agent van buiten nodig heeft. Bewust klein gehouden: hoe meer
 * hier staat, hoe meer elke tenant moet implementeren.
 */
export interface AgentHost {
  /** Tenant waarvoor deze run draait. Scheidt geheugen, sleutels en opslag. */
  readonly tenantId: string;

  /** Gebruiker binnen de tenant. */
  readonly userId: string;

  /**
   * Actieve providers van deze tenant, op volgorde van voorkeur, met
   * ontsleutelde sleutels. Waar ze vandaan komen (vault, env, versleutelde
   * kolom) is aan de host.
   */
  listProviderKeys(): Promise<ProviderKey[]>;

  /**
   * Standaardmodellen per provider, als de tenant die overschrijft. Zelfde vorm
   * als de oorspronkelijke `default_models.models`-kolom: een ruwe string die
   * de agent zelf parseert. `null` laat de ingebouwde lijst gelden.
   */
  getDefaultModels?(providerId: string): Promise<string | null>;

  /**
   * Vrije instructies van de gebruiker, in het origineel de kolom
   * `profiles.custom_instructions`. Optioneel: zonder implementatie draait de
   * agent gewoon zonder extra instructies.
   */
  getCustomInstructions?(): Promise<string | null>;

  /** Gebruikersgeheugen. Per tenant gescheiden. */
  loadMemory(): Promise<UserMemoryEntry[]>;
  saveMemory(entries: UserMemoryEntry[]): Promise<void>;

  /**
   * Optioneel: sessietoken voor calls namens de gebruiker. Ontbreekt hij, dan
   * slaat de agent backend-gebonden stappen over in plaats van te crashen.
   */
  getSessionToken?(): Promise<string | null>;
}

/**
 * Host voor lokaal gebruik en tests: houdt alles in het geheugen en verwacht
 * de sleutels kant-en-klaar. Niet voor productie — er is geen enkele
 * versleuteling en het geheugen verdwijnt met het proces.
 */
export function createInMemoryHost(init: {
  tenantId: string;
  userId: string;
  providers?: ProviderKey[];
}): AgentHost {
  let memory: UserMemoryEntry[] = [];
  return {
    tenantId: init.tenantId,
    userId: init.userId,
    async listProviderKeys() {
      return init.providers ?? [];
    },
    async loadMemory() {
      return memory;
    },
    async saveMemory(entries) {
      memory = entries;
    },
  };
}
