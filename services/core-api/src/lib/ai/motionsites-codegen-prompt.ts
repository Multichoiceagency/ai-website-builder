/**
 * Procedural memory — Motionsites React codegen system prompt.
 *
 * Always retrieved into the Motionsites codegen working set. This is the
 * canonical “core backend engine” contract: single-file React + Tailwind +
 * lucide-react, with an explicit DEPENDENCIES header. Generated source is for
 * Motionsites islands (sandbox), never CMS page JSON (ADR-0003).
 */
export const MOTIONSITES_CODEGEN_SYSTEM_PROMPT = `Je bent de core backend-engine van een geavanceerde AI Website Builder. Je genereert single-file React componenten die gebruikmaken van Tailwind CSS en lucide-react voor iconen.

STRIKTE ARCHITECTUUR REGELS:
1. IMPORTS & PAKKETTEN: GEEN Routing. Je mag uitsluitend de volgende npm-pakketten importeren en gebruiken indien de UI-opdracht daarom vraagt: 'react', 'lucide-react', 'framer-motion', 'gsap'. Externe CSS of andere bibliotheken zijn verboden.
2. COMPONENT STRUCTUUR: Lever ALTIJD een single-file component aan dat direct als default export geëxporteerd kan worden.
3. STYLING & ANIMATIE: Schrijf schone, semantische HTML5 en modulaire Tailwind CSS. Gebruik Tailwind transities voor basisanimaties. Gebruik 'framer-motion' of 'gsap' voor complexe, high-fidelity animaties, scroll-getriggerde effecten of geavanceerde tijdlijnen.
4. RESPONSIVENESS: Implementeer ALTIJD volledige responsive logica (mobile-first met sm:, md:, lg: breakpoints) zoals gevraagd.
5. EXACTE DATA: Als de gebruiker specifieke URLs, Google Fonts of SVG-paden aanlevert, gebruik je deze EXACT zoals beschreven. Verander geen letters of tokens. Gebruik NOOIT catalogue thumbnails (\`/thumbs/\`) als hero-media.
6. INTERACTIE: Voeg interactieve states toe waar nodig. Geen site-header of primary nav in de island — die hoort buiten het design (host page).
7. HOST CHROME: Genereer GEEN fixed/absolute top navigation, logo-bar, Sign Up/Login of hamburger menu. Root = hero body (\`<main>\`/\`<section>\`) met full-bleed video/beeld + overlay tekst (headline, korte copy, één CTA).
8. SCROLL-SCRUB / FRAME PACK: Als de brief vraagt om scroll-gekoppelde video, interactive 3D fly-through of frame scrubbing, teken frames op een canvas vanuit scroll-progress — NIET \`autoPlay loop\` video. Frame-URL-patroon van de host: \`/api/v1/content/public/media/{mediaId}/frames/{index}.jpg\` (0-based; legacy \`.png\` also works). Als er geen mediaId in de brief staat, gebruik een placeholder mediaId string en documenteer die in een comment. Prefers-reduced-motion: toon één stilstaand frame.

OUTPUT FORMAT & DEPENDENCY TRACKING:
Je moet de code ALTIJD beginnen met een compact JSON-commentaar waarin je aangeeft welke npm-pakketten (naast 'react' en 'lucide-react') je daadwerkelijk hebt gebruikt in de code. Gebruik exact dit formaat op de allereerste regels:
/*DEPENDENCIES:{"packages": ["framer-motion"]} */
Of als je gsap gebruikt:
/*DEPENDENCIES:{"packages": ["gsap"]} */
Als je geen extra pakketten gebruikt:
/*DEPENDENCIES:{"packages": []} */

Je mag GEEN introductie, GEEN markdown backticks (zoals \`\`\`jsx) en GEEN afsluitende tekst teruggeven. Je output moet PUUR en ALLEEN dit JSON-commentaar zijn, direct gevolgd door de uitvoerbare React code (beginnend met de imports).`

/** Allowed extra packages beyond react + lucide-react. */
export const MOTIONSITES_CODEGEN_ALLOWED_PACKAGES = ['framer-motion', 'gsap', 'lucide-react'] as const

export type MotionsitesCodegenPackage = (typeof MOTIONSITES_CODEGEN_ALLOWED_PACKAGES)[number]

const DEPENDENCIES_RE = /^\/\*DEPENDENCIES:(\{[\s\S]*?\})\s*\*\//

export function parseDependenciesHeader(source: string): {
  packages: string[]
  code: string
} {
  const trimmed = source.trim()
  const match = trimmed.match(DEPENDENCIES_RE)
  if (!match) {
    return { packages: [], code: trimmed }
  }
  let packages: string[] = []
  try {
    const parsed = JSON.parse(match[1]!) as { packages?: unknown }
    packages = Array.isArray(parsed.packages)
      ? parsed.packages.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    packages = []
  }
  const code = trimmed.slice(match[0].length).trimStart()
  return { packages, code }
}

export function validateCodegenOutput(source: string): {
  ok: boolean
  packages: string[]
  code: string
  errors: string[]
} {
  const errors: string[] = []
  const { packages, code } = parseDependenciesHeader(source)

  if (!DEPENDENCIES_RE.test(source.trim())) {
    errors.push('Missing /*DEPENDENCIES:{...}*/ header')
  }

  for (const pkg of packages) {
    if (!(MOTIONSITES_CODEGEN_ALLOWED_PACKAGES as readonly string[]).includes(pkg)) {
      errors.push(`Disallowed package in DEPENDENCIES: ${pkg}`)
    }
  }

  if (/^```/m.test(code) || /```$/.test(code)) {
    errors.push('Markdown fences are forbidden')
  }

  if (!/export\s+default\s+/.test(code)) {
    errors.push('Missing default export')
  }

  if (/\b(react-router|next\/|@remix|vue|angular)\b/i.test(code)) {
    errors.push('Routing / non-allowed frameworks detected')
  }

  return { ok: errors.length === 0, packages, code, errors }
}
