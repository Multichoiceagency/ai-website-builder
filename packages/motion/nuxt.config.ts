import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

/**
 * The motion layer.
 *
 * Presets are declarative tokens — content stores *intent* (`fade-up`,
 * `viewport`), never animation code, so the same document animates correctly
 * under any renderer (ADR-0003).
 */
export default defineNuxtConfig({
  css: [resolve('./assets/css/motion.css')],
})
