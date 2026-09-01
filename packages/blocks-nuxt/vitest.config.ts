import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * Renders block components outside Nuxt, so Nuxt auto-imports are not
 * available — `test/setup.ts` provides the few globals these blocks call.
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
})
