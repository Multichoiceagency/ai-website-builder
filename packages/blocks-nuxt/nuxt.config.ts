/**
 * Nuxt renderers for the universal block registry.
 *
 * One component per block id. Definitions and props schemas live in
 * `@platform/blocks` and are framework-agnostic; this layer is the Nuxt half
 * of the pair, and a React package would be its peer (ADR-0003).
 *
 * Extends `@platform/motion` so `<MotionReveal>` (used by `<BlockRenderer>`)
 * is always in scope — apps that only extend this layer still get entrance
 * presets without remembering a second `extends` entry.
 */
export default defineNuxtConfig({
  extends: ['../motion'],
})
