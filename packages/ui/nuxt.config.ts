import { createResolver } from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'

const { resolve } = createResolver(import.meta.url)

/**
 * Peek kit on Google Fonts. Figtree fills the Google Sans slot (not freely
 * hostable). Instrument Serif + Rubik match the Peek export.
 */
const PEEK_GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Rubik:wght@400;500;600&display=swap'

/**
 * The design-system layer: tokens, primitives and the app shell.
 *
 * Distributed as a Nuxt layer rather than a compiled library so editing a
 * primitive hot-reloads straight into the dashboard (ADR-0010).
 *
 * Google Fonts load once here so every app that `extends` this layer
 * (dashboard, admin) inherits the Peek faces without per-app copy-paste.
 */
export default defineNuxtConfig({
  css: [resolve('./assets/css/index.css')],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: PEEK_GOOGLE_FONTS },
      ],
    },
  },
})
