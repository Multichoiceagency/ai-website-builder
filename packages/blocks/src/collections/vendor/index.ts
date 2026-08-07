import type { CollectionBlockDefinition } from '../define-collection.js'

/**
 * Vendored registry entries.
 *
 * `pnpm registry:add <id>` writes a component's source into this directory and
 * registers it between the anchors below. That is an *install*: a file lands in
 * the repository, gets reviewed, type-checked and committed like anything else.
 * Nothing here is fetched or evaluated at runtime — see the note at the top of
 * `packages/registry/src/manifest.mjs`.
 *
 * The anchor comments are load-bearing. The CLI edits this file by finding
 * them, so do not remove or reword them.
 */

// registry:imports:start
import { blogCardGrid01 } from './blog-card-grid-01.js'
// registry:imports:end

export const VENDORED_BLOCKS: CollectionBlockDefinition[] = [
  // registry:blocks:start
  blogCardGrid01,
  // registry:blocks:end
]
