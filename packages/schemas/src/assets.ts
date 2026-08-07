import { z } from 'zod'
import { isoTimestampSchema } from './common.js'
import { performanceClassSchema, sectionSchema } from './blocks.js'

/**
 * Reusable asset contracts (ADR-0002, ADR-0003).
 *
 * An **asset** is a saved arrangement of sections that can be dropped into any
 * page. It is *data*, not code: an ordered array of `{ block, props, motion? }`
 * where every `block` already exists in `@platform/blocks`. Inserting one adds
 * no new renderer, fetches no source and executes nothing new — which is the
 * whole point of ADR-0003 and the line this package exists to hold.
 *
 * Two tiers, one shape:
 *
 *   PLATFORM  — shipped with the product. Normalised at build time from
 *               licence-cleared library demos and committed as a catalogue.
 *   WORKSPACE — created by a user from sections on one of their own pages.
 *               Tenant-scoped, behind RLS.
 *
 * What an asset deliberately cannot carry, for the same reasons a template
 * cannot (see `templates.ts`): markup, CSS, component source, or a URL pointing
 * at somebody else's bucket. `thumbnail` is same-origin-only at the schema
 * boundary rather than trusted to the importer.
 */

// region Guards

/**
 * Rejects anything that could pull a byte from a third party at render time.
 * Same-origin paths (`/assets/x.jpg`) pass; `https://…`, `//cdn…` and
 * `data:`-smuggled fetches do not. Identical in intent to the guard in
 * `templates.ts` — an asset renders into a customer page, so it gets the
 * stricter rule.
 */
const noExternalUrl = (field: string, max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/:\/\//.test(value) && !value.trimStart().startsWith('//'), {
      message: `${field} must be a same-origin path — external asset URLs are never stored on an asset.`,
    })

/**
 * A provenance link, and only that. It is displayed in the Assets panel as
 * attribution and is never rendered into a customer page, so an `https://` URL
 * is correct here where it would be a hotlink anywhere else. Restricted to
 * `http(s)` so no other scheme can be smuggled into an anchor.
 */
const provenanceUrl = z
  .string()
  .max(300)
  .refine((value) => value === '' || /^https?:\/\//.test(value), {
    message: 'source.url must be empty or an http(s) link — it is attribution, never an asset reference.',
  })
  .default('')

// endregion

// region Vocabulary

export const ASSET_TIERS = ['platform', 'workspace'] as const
export const assetTierSchema = z.enum(ASSET_TIERS)
export type AssetTier = z.infer<typeof assetTierSchema>

/**
 * Browsable groups for the Assets panel. Named after what a saved arrangement
 * *does on a page* rather than after a block category, because an asset is
 * usually several categories at once — a hero plus its logo strip is one
 * `hero` asset, not a hero and a logos asset.
 */
export const ASSET_COLLECTIONS = [
  'hero',
  'features',
  'proof',
  'pricing',
  'conversion',
  'content',
  'navigation',
  'footer',
  'utility',
] as const
export const assetCollectionSchema = z.enum(ASSET_COLLECTIONS)
export type AssetCollectionId = z.infer<typeof assetCollectionSchema>

/**
 * The licence an asset was derived under.
 *
 * `platform-owned` is what a workspace asset gets: the user arranged our own
 * registry blocks, so there is nothing third-party in it. Everything else
 * records the licence of the *layout idea* a platform preset was normalised
 * from.
 *
 * The two refusal values are deliberately distinct, because they call for
 * different follow-up:
 *
 *   `unknown`      — nobody has established what the licence is. Someone
 *                    reading a LICENSE file may resolve it.
 *   `proprietary`  — the licence *was* established and it does not permit what
 *                    we would do. Reading it again will not change that; only a
 *                    commercial agreement would.
 *
 * Both are refused at every write boundary, so neither can ever ship.
 */
export const ASSET_LICENCES = [
  'platform-owned',
  'mit',
  'apache-2.0',
  'bsd-3-clause',
  'cc0',
  'unknown',
  'proprietary',
] as const
export const assetLicenceSchema = z.enum(ASSET_LICENCES)
export type AssetLicence = z.infer<typeof assetLicenceSchema>

/** Licences under which a derived layout may actually be shipped. */
export const SHIPPABLE_ASSET_LICENCES: readonly AssetLicence[] = [
  'platform-owned',
  'mit',
  'apache-2.0',
  'bsd-3-clause',
  'cc0',
]

export function isShippableLicence(licence: AssetLicence): boolean {
  return SHIPPABLE_ASSET_LICENCES.includes(licence)
}

// endregion

// region Source and attribution

/**
 * What actually happened between a third-party demo and our preset.
 *
 * These are different facts with different consequences, and recording "a third
 * party was involved" without saying which is worse than recording nothing: it
 * reads as a derivation claim that nobody can check.
 *
 *   `none`             — nothing third-party was consulted. The arrangement is
 *                        ours outright. This is the only valid value when
 *                        `library` is empty or `platform`.
 *   `layout-observed`  — someone opened their demo and built *our* arrangement
 *                        after seeing its shape. The layout idea is shared; no
 *                        markup, CSS or asset crossed over.
 *   `layout-adapted`   — someone took their specific arrangement and reworked
 *                        it into ours. Closer to the source, and the value that
 *                        makes the licence actually load-bearing.
 *
 * There is deliberately no value meaning "we assumed a library probably
 * contains something like this". An assumption is not a derivation, and
 * labelling one as such manufactures a provenance record for an act that never
 * occurred — which is a different failure from copying, and just as bad for an
 * audit trail.
 */
export const ASSET_DERIVATIONS = ['none', 'layout-observed', 'layout-adapted'] as const
export const assetDerivationSchema = z.enum(ASSET_DERIVATIONS)
export type AssetDerivation = z.infer<typeof assetDerivationSchema>

export const assetSourceSchema = z
  .object({
    /** The library the layout idea came from, e.g. `shadcn/ui`. Empty when ours. */
    library: z.string().max(80).default(''),
    /** The specific demo within it, e.g. `blocks/sidebar-07`. */
    demo: z.string().max(160).default(''),
    /** Provenance link, shown as attribution. Never fetched, never rendered. */
    url: provenanceUrl,
    /** What actually happened. See `ASSET_DERIVATIONS`. */
    derivation: assetDerivationSchema.default('none'),
  })
  .refine((source) => Boolean(source.library && source.library !== 'platform') === (source.derivation !== 'none'), {
    message:
      'source.derivation must say what happened: `none` exactly when the arrangement is ours, a real derivation otherwise.',
    path: ['derivation'],
  })
export type AssetSource = z.infer<typeof assetSourceSchema>

// endregion

// region Asset

/**
 * A composition is capped well below a page document: an asset that is twelve
 * sections long is a template, and templates already have a home.
 */
export const assetDocumentSchema = z.array(sectionSchema).min(1).max(12)
export type AssetDocument = z.infer<typeof assetDocumentSchema>

export const assetSchema = z.object({
  /** UUID for a workspace asset, a stable slug for a platform preset. */
  id: z.string().min(1).max(120),
  tier: assetTierSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(400).default(''),
  collection: assetCollectionSchema,
  tags: z.array(z.string().max(40)).max(12).default([]),
  sections: assetDocumentSchema,
  /**
   * The heaviest block the asset contains. Derived, never supplied: an asset
   * cannot understate its own cost and thereby slip past a site's ceiling.
   */
  performanceClass: performanceClassSchema,
  /** Same-origin path under the dashboard's `public/`, or empty. */
  thumbnail: noExternalUrl('thumbnail', 300).default(''),
  licence: assetLicenceSchema,
  /** Rendered in the panel wherever the licence requires credit. */
  attribution: z.string().max(300).default(''),
  source: assetSourceSchema.default({ library: '', demo: '', url: '', derivation: 'none' }),
  /**
   * Stable hash of the arrangement with section ids stripped. Two saves of the
   * same layout produce the same fingerprint, which is what lets the API say
   * "you already have this" instead of quietly making a second copy.
   */
  fingerprint: z.string().max(64).default(''),
  createdBy: z.string().max(320).default(''),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
})
export type Asset = z.infer<typeof assetSchema>

/**
 * An asset as the list endpoint serves it.
 *
 * When the caller supplies a performance ceiling, `sections` has already had
 * the blocks the site cannot afford removed and `droppedSections` says how
 * many — so a card can state the cost plainly instead of a user discovering it
 * after insertion. An asset with nothing left is omitted from the list rather
 * than offered as an empty insert.
 */
export const assetListItemSchema = assetSchema.extend({
  droppedSections: z.number().int().min(0).default(0),
})
export type AssetListItem = z.infer<typeof assetListItemSchema>

// endregion

// region Write surface

export const createAssetInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).default(''),
  collection: assetCollectionSchema.default('utility'),
  tags: z.array(z.string().max(40)).max(12).default([]),
  /**
   * The sections to save. Validated against the block registry before storage
   * exactly like a page document is — an asset is a page document that happens
   * to be reusable, so it gets the same gate (ADR-0003).
   */
  sections: assetDocumentSchema,
})
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>

export const updateAssetInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(400).optional(),
  collection: assetCollectionSchema.optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
  sections: assetDocumentSchema.optional(),
})
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>

/** Body of the pre-save duplicate check. */
export const assetDuplicateCheckInputSchema = z.object({
  sections: assetDocumentSchema,
})
export type AssetDuplicateCheckInput = z.infer<typeof assetDuplicateCheckInputSchema>

export const assetDuplicateCheckSchema = z.object({
  duplicate: z.boolean(),
  fingerprint: z.string(),
  /** The asset that already holds this arrangement, when there is one. */
  existing: z.object({ id: z.string(), name: z.string() }).nullable().default(null),
})
export type AssetDuplicateCheck = z.infer<typeof assetDuplicateCheckSchema>

// endregion

// region Query surface

const csvList = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : value,
    inner,
  )

/** The one query the Assets panel, the API and the preset catalogue share. */
export const assetQuerySchema = z.object({
  search: z.string().max(120).optional(),
  collection: assetCollectionSchema.optional(),
  tier: assetTierSchema.optional(),
  tags: csvList(z.array(z.string().max(40)).max(10)).optional(),
  maxPerformanceClass: performanceClassSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
})
export type AssetQuery = z.infer<typeof assetQuerySchema>

// endregion

// region Preset catalogue

/**
 * A platform preset is an `Asset` fixed to the platform tier. It is generated,
 * committed and reviewed in a diff — nothing is fetched at runtime, same
 * posture as the template catalogue.
 */
export const assetPresetSchema = assetSchema.extend({
  tier: z.literal('platform'),
  /**
   * Refused rather than defaulted: a preset whose licence could not be
   * established must not be shippable, and a default would hide that.
   */
  licence: assetLicenceSchema.refine(isShippableLicence, {
    message: 'a platform preset may not ship with an unresolved licence',
  }),
})
export type AssetPreset = z.infer<typeof assetPresetSchema>

/**
 * One entry in the importer's licence register. Every library considered is
 * recorded here, including the ones we refused — "we looked and could not
 * establish a licence" is the finding that matters most later.
 */
export const assetSourceRegisterEntrySchema = z.object({
  library: z.string().min(1).max(80),
  url: provenanceUrl,
  licence: assetLicenceSchema,
  /** False whenever the licence is unresolved or incompatible. */
  importable: z.boolean(),
  /**
   * The copyright line **exactly as it appears in the LICENSE file**, quoted
   * rather than described.
   *
   * Reproducing this notice is MIT's one substantive obligation, so it is the
   * legally operative string and it is transcribed, never composed. Writing down
   * the GitHub org instead of the notice produces an attribution that fails the
   * very licence it invokes — `themesberg/flowbite` is published by *Bergside
   * Inc.*, and `themesberg/flowbite-vue` by *Crafty Dwarf LLC*, so even the same
   * org is not a reliable stand-in for the holder within one project.
   *
   * `attribution` is derived from this by the importer. Do not hand-write one.
   */
  copyrightNotice: z.string().max(200).default(''),
  /**
   * Where the notice above was physically read — a repository path or a raw
   * file URL, never a landing page, a badge or an npm summary. A licence claim
   * whose source cannot be reopened is not evidence.
   */
  noticeReadAt: z.string().max(300).default(''),
  attribution: z.string().max(300).default(''),
  /**
   * Why the call went the way it did, for the next reader. Long enough to hold
   * the scope caveats that actually bite — which repository an entry covers,
   * which paid tier it does not, and which sibling repo has its own holder.
   */
  notes: z.string().max(1200).default(''),
  /** Where the licence was read. Empty when none was found. */
  evidenceUrl: provenanceUrl,
  /**
   * How a developer pulls this library for *local reference* (ADR-0003).
   * Never ships into customer pages — `npx` / clone land under `reference/` only.
   * The Assets panel surfaces every register entry and this command so free
   * libraries stay discoverable even before presets exist.
   */
  install: z
    .object({
      method: z.enum(['npx', 'git-clone', 'none']),
      /** Copy-pasteable. Prefer the library's official CLI when it has one. */
      command: z.string().max(400),
      docsUrl: z.string().max(300).default(''),
      referenceDir: z.string().max(120).default(''),
      cloneUrl: z.string().max(300).default(''),
    })
    .optional(),
})
  .refine((entry) => !entry.importable || entry.library === 'platform' || entry.copyrightNotice.startsWith('Copyright'), {
    message:
      'an importable third-party source must carry the verbatim `Copyright …` line from its LICENSE — reproducing it is the licence obligation.',
    path: ['copyrightNotice'],
  })
  .refine((entry) => !entry.copyrightNotice || Boolean(entry.noticeReadAt), {
    message: 'a copyright notice must record where it was read, or it is a claim rather than evidence.',
    path: ['noticeReadAt'],
  })
export type AssetSourceRegisterEntry = z.infer<typeof assetSourceRegisterEntrySchema>

/** API row: licence register + how many presets currently ship from this library. */
export const assetLibrarySourceSchema = assetSourceRegisterEntrySchema.and(
  z.object({
    presetCount: z.number().int().min(0),
  }),
)
export type AssetLibrarySource = z.infer<typeof assetLibrarySourceSchema>

export const assetCatalogSchema = z.object({
  /** Bumped when the catalogue *shape* changes, not when presets change. */
  version: z.number().int().min(1).default(1),
  generatedAt: z.string(),
  sources: z.array(assetSourceRegisterEntrySchema).default([]),
  presets: z.array(assetPresetSchema).default([]),
})
export type AssetCatalog = z.infer<typeof assetCatalogSchema>

// endregion
