/** Nuxt auto-imports the blocks rely on; the app supplies the real ones. */
Object.assign(globalThis, {
  useRuntimeConfig: () => ({ public: { surface: 'dashboard' } }),
})
