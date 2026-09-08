# @platform/agent

De AI-bouwagent: praat met de LLM-providers, schrijft en bewerkt projectbestanden,
compileert en verifieert het resultaat, en levert pas op als de controle slaagt.

## Herkomst

Overgenomen uit [OpenThorn](https://github.com/BuildingTechAlternatives/OpenThorn)
(MIT, © 2026 Thomas Tschinkel). De licentie staat in `LICENSE` en moet meegaan
bij verdere verspreiding.

Gekloond op 8 september 2026 van commit `02bacda`. De preview-kant staat in
`@platform/preview`.

## Wat er is aangepast en waarom

OpenThorn draait single-tenant in de browser en haalt zijn omgeving uit
module-globals: `localStorage` voor gebruikersgeheugen, één gedeelde
Supabase-client voor providersleutels en profielen, en de Web Crypto API van de
ingelogde bezoeker om sleutels te ontsleutelen.

Geen van die drie aannames houdt stand in deze monorepo, waar één proces
meerdere tenants bedient en sleutels server-side horen te staan. Daarom krijgt
de agent zijn omgeving nu **geïnjecteerd** via `AgentHost` (`src/host.ts`):

| Origineel | Hier |
|---|---|
| `localStorage` per browser | `host.loadMemory()` / `host.saveMemory()` |
| Supabase-query op `provider_keys` + client-side ontsleuteling | `host.listProviderKeys()`, sleutels komen al leesbaar binnen |
| Supabase-query op `profiles.custom_instructions` | `host.getCustomInstructions()` |
| Supabase-query op `default_models` | `host.getDefaultModels()` |
| `supabase.auth.getSession()` | `host.getSessionToken()` |

De agent weet daardoor niet meer wie de gebruiker is of waar iets staat. Ontbreekt
de host, dan **stopt** hij met een duidelijke fout in plaats van terug te vallen
op gedeelde opslag — stil doorgaan zou tenants door elkaar halen.

Verder aangepast:

- **Preview-runtimes** (`openthorn-router.js`, `openthorn-jsx-dev.js`,
  `openthorn-db.js`) kwamen binnen via Vite's `?raw`-imports. Die syntax bestaat
  alleen in Vite; ze worden nu van schijf gelezen zodat de package ook
  server-side en in tests werkt.
- **`noUncheckedIndexedAccess`** staat uit in `tsconfig.json` van deze package.
  De overgenomen code is niet met die vlag geschreven en levert er 87 meldingen
  mee op, allemaal indices die binnen hun eigen lus aantoonbaar geldig zijn. Ze
  stuk voor stuk omschrijven zou de diff met upstream onbruikbaar maken zonder
  één echte fout op te lossen. `strict` blijft aan, en eigen code elders in de
  monorepo houdt de volledige instelling.

## Gebruik

Registreer een host vóór de run en geef hem daarna vrij:

```ts
import { registerHost, releaseHost, primeMemory, flushMemory } from "@platform/agent";

registerHost(host);
await primeMemory(host.userId);
try {
  // ...run...
} finally {
  await flushMemory(host.userId);
  releaseHost(host.userId);
}
```

`createInMemoryHost()` is er voor tests en lokaal werk — die versleutelt niets
en verliest zijn geheugen met het proces.

## Testen

```bash
pnpm --filter @platform/agent test        # rooktest: laden, runtimes, tenant-scheiding
pnpm --filter @platform/agent typecheck
```

## Nog te doen

De motor is geport en getest, maar nog niet aangesloten: er is nog geen route in
`services/core-api` of scherm in `apps/dashboard` die hem aanroept, en geen
`AgentHost`-implementatie tegen de eigen database. Dat is de volgende stap.

Let op: OpenThorn's README noemt twaalf providers, maar `providers.ts` bevat er
elf (NVIDIA NIM ontbreekt in de code). Deze kopie is getrouw aan de code.
