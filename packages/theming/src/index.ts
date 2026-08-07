/**
 * `@platform/theming` — colour maths for the site theme.
 *
 * Everything that decides what a colour *is*: sRGB ⇄ OKLab ⇄ OKLCH conversion,
 * WCAG 2.1 contrast, ramp generation, the shadcn preset catalogue, and the
 * report that says which pairs in a theme fail and by how much.
 *
 * No runtime dependencies beyond the schemas package. A site's published pages
 * never import this — they render stored values. It exists for the places that
 * *produce* a theme: the editor, the generation pipeline, and the tests that
 * prove no generated palette ships a failing pair.
 */
export * from './color.js'
export * from './contrast.js'
export * from './ramp.js'
export * from './palette.js'
export * from './presets.js'
export * from './report.js'
export * from './theme.js'
