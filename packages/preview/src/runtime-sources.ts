/**
 * Runtime-scripts die in elke preview geïnjecteerd worden.
 *
 * In OpenThorn kwamen deze binnen via Vite's `?raw`-imports vanuit `public/`.
 * Die syntax bestaat alleen in Vite, en deze package moet ook buiten een
 * Vite-build bruikbaar zijn (server-side generatie, tests, andere bundlers).
 * Daarom worden de bestanden hier ingelezen in plaats van geïmporteerd.
 *
 * De scripts zelf staan onveranderd in `runtime/` — het zijn de originele
 * bestanden, alleen anders geladen.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDir = join(dirname(fileURLToPath(import.meta.url)), "..", "runtime");

function load(name: string): string {
  return readFileSync(join(runtimeDir, name), "utf8");
}

/** Hash-router; react-router-dom werkt niet in een srcdoc/sandboxed iframe. */
export const routerSource = load("openthorn-router.js");

/** JSX dev-runtime voor de preview-bundel. */
export const jsxDevSource = load("openthorn-jsx-dev.js");

/** Data/auth-client die gegenereerde apps als `@openthorn/db` importeren. */
export const dbSource = load("openthorn-db.js");
