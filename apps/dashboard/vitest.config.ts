import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests for editor logic that owns behaviour Nuxt cannot show us — undo
 * depth, dirty state. Not a replacement for `nuxt test`; nothing here boots the
 * app or resolves auto-imports.
 */
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
})
