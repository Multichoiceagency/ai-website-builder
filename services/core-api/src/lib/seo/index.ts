/**
 * The SEO engine (§15).
 *
 * Everything here is a pure function of data the platform already owns — the
 * stored page documents, the site's business facts and the navigation. That is
 * deliberate: the audit, the structured-data graph, the sitemap and the content
 * gate all work with zero third-party credentials, and connecting Search
 * Console later *adds* observed performance rather than switching the module on.
 */
export * from './audit.js'
export * from './document.js'
export * from './quality.js'
export * from './schema-org.js'
export * from './sitemap.js'
export * from './pagespeed.js'
export * from './providers/search-console.js'
export * from './providers/serp.js'
