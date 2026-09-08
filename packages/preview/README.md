# @platform/preview

Bundelt gegenereerde projectbestanden in de browser met esbuild-wasm, rendert ze
in een sandboxed iframe en draait daar rook-tests tegen. Geen server-round-trip.

## Herkomst

Overgenomen uit [OpenThorn](https://github.com/BuildingTechAlternatives/OpenThorn)
(MIT, © 2026 Thomas Tschinkel). De licentie staat in `LICENSE` en moet meegaan
bij verdere verspreiding. Gekloond op 8 september 2026 van commit `02bacda`.

## Wat er is aangepast

- De drie preview-runtimes (`runtime/openthorn-*.js`) kwamen binnen via Vite's
  `?raw`-imports. Die syntax bestaat alleen in Vite; `src/runtime-sources.ts`
  leest ze nu van schijf, zodat deze package ook buiten een Vite-build werkt.
  De scripts zelf zijn ongewijzigd.
- Drie plekken aangepast voor `noUncheckedIndexedAccess` (base64-encoder,
  `oeidBasename`, `resolveOeidPath`, lib-selectie in `typecheck.ts`). Gedrag
  blijft identiek; alleen de compiler is expliciet gerustgesteld.

## Testen

```bash
pnpm --filter @platform/preview typecheck
```
