/**
 * Shared PWA defaults for dashboard + storefront.
 * Motionsites media stays out of the precache (too large for offline install).
 */
export function platformPwaConfig(opts: {
  name: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  /** Dashboard sits behind auth — browsers fetch manifest without cookies unless set. */
  useCredentials?: boolean
  /**
   * Document used when a navigation misses the cache (Workbox `createHandlerBoundToURL`).
   * Only set this when that URL is actually precached (static `index.html`).
   * SPA / Nitro apps should pass `false` and rely on NetworkFirst navigations instead —
   * otherwise Workbox throws `non-precached-url` for `/`.
   */
  navigateFallback?: string | false
  startUrl?: string
}) {
  const icons = [
    { src: 'pwa/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'pwa/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' as const },
    {
      src: 'pwa/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable' as const,
    },
  ]

  const navigateFallback =
    opts.navigateFallback === false ? undefined : opts.navigateFallback

  return {
    registerType: 'autoUpdate' as const,
    manifest: {
      name: opts.name,
      short_name: opts.shortName,
      description: opts.description,
      theme_color: opts.themeColor,
      background_color: opts.backgroundColor,
      display: 'standalone' as const,
      orientation: 'any' as const,
      lang: 'en',
      start_url: opts.startUrl ?? '/',
      scope: '/',
      icons,
      categories: ['business', 'productivity'],
    },
    useCredentials: opts.useCredentials ?? false,
    includeAssets: ['pwa/favicon-32x32.png', 'pwa/apple-touch-icon.png', 'pwa/icon.svg'],
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
      globIgnores: ['**/motionsites/**', '**/node_modules/**'],
      ...(navigateFallback
        ? {
            navigateFallback,
            navigateFallbackDenylist: [/^\/api\//, /^\/motionsites\//],
          }
        : {}),
      runtimeCaching: [
        {
          urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'platform-pages',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
        {
          urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'platform-images',
            expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: ({ request }: { request: Request }) =>
            request.destination === 'font' ||
            /\.(?:woff2?|ttf|otf)$/i.test(new URL(request.url).pathname),
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'platform-fonts',
            expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
        {
          // Never cache API — auth/session 401s must not stick after login.
          urlPattern: ({ url }: { url: URL }) =>
            url.pathname.startsWith('/api/') || url.port === '4000',
          handler: 'NetworkOnly' as const,
        },
      ],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 60 * 60,
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      type: 'module' as const,
    },
  }
}
