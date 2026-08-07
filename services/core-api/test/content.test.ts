import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import { closeDatabase, withTenant, withoutTenant } from '../src/db/client.js'
import { insertDomain } from '../src/db/repositories/sites.js'
import { MEDIA_MAX_BYTES } from '../src/lib/media/upload.js'

/**
 * Blog (§6) and media (§14), end to end against the real database and the real
 * storage driver.
 *
 * The security cases come first and carry the most weight, because uploads are
 * the one surface here where a mistake is not a bug but a foothold: a file that
 * lies about its type, an SVG that carries script, a filename that walks out of
 * the storage root, an id from another tenant. Each of those is asserted below
 * as behaviour, not as an implementation detail — they must keep holding when
 * the driver, the parser or the sanitiser is replaced.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `content-test-${suffix}@platform.local`
const OTHER_EMAIL = `content-other-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'
const HOST = `content-${suffix}.local`

// A 1×1 PNG and a 1×1 JPEG. Real files, so the sniffer has real headers to read.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
)
const HOSTILE_SVG = Buffer.from(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" onload="alert(1)">' +
    '<script>alert(2)</script><rect width="10" height="10" fill="#f00"/>' +
    '<foreignObject><div>escape</div></foreignObject></svg>',
)

let app: FastifyInstance
let cookie = ''
let otherCookie = ''
let tenantId = ''
let otherTenantId = ''
let siteId = ''
let pngId = ''
let postId = ''

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

/** The authenticated headers every dashboard call carries. */
function auth(extra: Record<string, string> = {}) {
  return { cookie, 'x-tenant-id': tenantId, ...extra }
}

async function upload(
  bytes: Buffer,
  query: Record<string, string>,
  contentType = 'application/octet-stream',
  headers = auth(),
) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/content/media',
    headers: { ...headers, 'content-type': contentType },
    query,
    payload: bytes,
  })
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, name: 'Content Test', organizationName: `Content ${suffix}` },
  })
  tenantId = body(registered).data.activeTenantId
  cookie = String(registered.headers['set-cookie']).split(';')[0]!

  // A second workspace, so cross-tenant access is tested against a real
  // membership rather than against an id nobody owns.
  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: OTHER_EMAIL, password: PASSWORD, name: 'Other', organizationName: `Other ${suffix}` },
  })
  otherTenantId = body(other).data.activeTenantId
  otherCookie = String(other.headers['set-cookie']).split(';')[0]!

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: auth(),
    payload: { name: 'Content Site', slug: `content-site-${suffix}`, locale: 'nl' },
  })
  siteId = body(site).data.id

  // The public read model resolves a hostname, so the fixture needs a verified
  // domain the same way a real site does.
  await withTenant(tenantId, (tx) =>
    insertDomain(tx, { tenantId, siteId, hostname: HOST, isPrimary: true, verified: true }),
  )
})

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email IN (${EMAIL}, ${OTHER_EMAIL})`
  })
  await app.close()
  await closeDatabase()
})

describe('upload safety', () => {
  it('rejects a file whose bytes disagree with its claimed content type', async () => {
    const response = await upload(JPEG, { filename: 'pretend.png' }, 'image/png')

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('content_type_mismatch')
  })

  it('accepts a file whose bytes agree with its claimed content type', async () => {
    const response = await upload(PNG, { filename: 'agreed.png' }, 'image/png')
    expect(response.statusCode).toBe(201)
  })

  it('rejects a file that is not one of the allowed image types', async () => {
    const response = await upload(Buffer.from('<?php system($_GET["c"]); ?>'), { filename: 'shell.png' })

    expect(response.statusCode).toBe(400)
    expect(body(response).data).toBeNull()
  })

  it('rejects an HTML document that merely contains an svg element', async () => {
    const response = await upload(
      Buffer.from('<html><body><svg xmlns="http://www.w3.org/2000/svg"></svg></body></html>'),
      { filename: 'sneaky.svg' },
    )
    expect(response.statusCode).toBe(400)
  })

  it('rejects an empty upload', async () => {
    const response = await upload(Buffer.alloc(0), { filename: 'nothing.png' })
    expect(response.statusCode).toBe(400)
  })

  it('rejects a file over the size cap', async () => {
    // Valid PNG header, so it is the size that decides — not the format check.
    const oversized = Buffer.concat([PNG, Buffer.alloc(MEDIA_MAX_BYTES + 2048)])
    const response = await upload(oversized, { filename: 'huge.png' })

    expect(response.statusCode).toBe(413)
  })

  it('strips script and event handlers from an SVG before storing it', async () => {
    const response = await upload(HOSTILE_SVG, { filename: 'logo.svg' }, 'image/svg+xml')
    expect(response.statusCode).toBe(201)

    const { asset, sanitised } = body(response).data
    expect(sanitised).toContain('<script>')
    expect(sanitised).toContain('@onload')

    const file = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${asset.id}/file`,
      headers: auth(),
    })

    expect(file.statusCode).toBe(200)
    expect(file.body).not.toContain('<script')
    expect(file.body).not.toContain('onload')
    expect(file.body).toContain('<rect')
  })

  it('serves an SVG as a download, with scripting denied and sniffing off', async () => {
    const uploaded = await upload(HOSTILE_SVG, { filename: 'icon.svg' }, 'image/svg+xml')
    const { asset } = body(uploaded).data

    const file = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${asset.id}/file`,
      headers: auth(),
    })

    expect(file.headers['content-disposition']).toMatch(/^attachment/)
    expect(String(file.headers['content-security-policy'])).toContain("default-src 'none'")
    expect(file.headers['x-content-type-options']).toBe('nosniff')
  })

  it('cannot be made to write outside the storage root by a filename', async () => {
    const response = await upload(PNG, { filename: '../../etc/passwd.png' })
    expect(response.statusCode).toBe(201)

    const { asset } = body(response).data
    // The name is kept for display, reduced to its basename; the *key* is ours.
    expect(asset.filename).toBe('passwd.png')
    expect(asset.storageKey).toMatch(/^media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/)
    expect(asset.storageKey).not.toContain('..')

    // And the bytes are genuinely retrievable from where we put them.
    const file = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${asset.id}/file`,
      headers: auth(),
    })
    expect(file.statusCode).toBe(200)
  })

  it('refuses an upload without the media:write permission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/media',
      headers: { 'content-type': 'application/octet-stream' },
      query: { filename: 'anonymous.png' },
      payload: PNG,
    })
    expect(response.statusCode).toBe(401)
  })
})

describe('the media library', () => {
  it('records dimensions, size and a checksum, and flags missing alt text', async () => {
    const response = await upload(PNG, { filename: 'blue_sofa-living-room.png', folder: 'blog', tags: 'hero, sofa' })

    expect(response.statusCode).toBe(201)
    const asset = body(response).data.asset
    pngId = asset.id

    expect(asset.mime).toBe('image/png')
    expect(asset.width).toBe(1)
    expect(asset.height).toBe(1)
    expect(asset.sizeBytes).toBe(PNG.length)
    expect(asset.checksum).toMatch(/^[0-9a-f]{64}$/)
    expect(asset.tags).toEqual(['hero', 'sofa'])
    // Derived from the filename — a starting point, still counted as missing.
    expect(asset.alt).toBe('Blue sofa living room')
    expect(asset.altSource).toBe('derived')
    expect(asset.needsAlt).toBe(true)
  })

  it('lists, searches and filters by folder, tag and missing alt text', async () => {
    const all = await app.inject({ method: 'GET', url: '/api/v1/content/media', headers: auth() })
    expect(all.statusCode).toBe(200)
    expect(body(all).data.total).toBeGreaterThan(0)
    expect(body(all).data.missingAltCount).toBeGreaterThan(0)

    const byFolder = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'blog', tag: 'sofa', search: 'sofa', missingAlt: 'true' },
    })
    expect(body(byFolder).data.assets.map((asset: { id: string }) => asset.id)).toContain(pngId)

    const folders = body(all).data.folders.map((entry: { folder: string }) => entry.folder)
    expect(folders).toContain('blog')
  })

  it('clears the missing-alt flag once a person writes alt text', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/content/media/${pngId}`,
      headers: auth(),
      payload: { alt: 'A blue two-seater sofa against a white wall' },
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.altSource).toBe('human')
    expect(body(response).data.needsAlt).toBe(false)
  })

  it('keeps the id stable when the bytes are replaced', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/media/${pngId}/replace`,
      headers: auth({ 'content-type': 'image/jpeg' }),
      query: { filename: 'blue-sofa.jpg' },
      payload: JPEG,
    })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.asset.id).toBe(pngId)
    expect(body(response).data.asset.mime).toBe('image/jpeg')

    const file = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${pngId}/file`,
      headers: auth(),
    })
    expect(file.statusCode).toBe(200)
    expect(file.headers['content-type']).toContain('image/jpeg')
  })

  it('hides one tenant’s asset from another', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${pngId}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    // Not 403: confirming the id exists would already be a leak.
    expect(response.statusCode).toBe(404)

    const file = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${pngId}/file`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(file.statusCode).toBe(404)
  })
})

describe('the blog', () => {
  it('creates a category and an author', async () => {
    const category = await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/categories`,
      headers: auth(),
      payload: { slug: 'news', name: 'News' },
    })
    expect(category.statusCode).toBe(201)

    const author = await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/authors`,
      headers: auth(),
      payload: { slug: 'jane', name: 'Jane Doe', bio: 'Writes things.' },
    })
    expect(author.statusCode).toBe(201)
  })

  it('creates a post whose body is validated against the block registry', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/posts`,
      headers: auth(),
      payload: {
        slug: 'hello-world',
        title: 'Hello world',
        excerpt: 'The first post.',
        sections: [{ id: 'sec_post01', block: 'hero-centered-01', props: { headline: 'Hello' } }],
      },
    })

    expect(response.statusCode).toBe(201)
    postId = body(response).data.id
    // Defaults come back filled in from the block, exactly as for a page.
    expect(body(response).data.sections[0].props.primaryLabel).toBeTruthy()
    expect(body(response).data.hasUnpublishedChanges).toBe(true)
  })

  it('rejects a post body referencing a block that does not exist', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/posts`,
      headers: auth(),
      payload: {
        slug: 'bad-block',
        title: 'Bad',
        sections: [{ id: 'sec_bad', block: 'not-a-real-block-99', props: {} }],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('unknown_block')
  })

  it('rejects a duplicate slug within the same site', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/posts`,
      headers: auth(),
      payload: { slug: 'hello-world', title: 'Again' },
    })
    expect(response.statusCode).toBe(409)
  })

  it('keeps a scheduled post out of the public API until its moment', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/content/blog/posts/${postId}/publish`,
      headers: auth(),
      payload: { scheduledAt: future },
    })

    expect(published.statusCode).toBe(200)
    expect(body(published).data.status).toBe('scheduled')

    const publicRead = await app.inject({
      method: 'GET',
      url: '/api/v1/content/public/blog/hello-world',
      query: { host: HOST },
    })
    expect(publicRead.statusCode).toBe(404)

    const index = await app.inject({ method: 'GET', url: '/api/v1/content/public/blog', query: { host: HOST } })
    expect(body(index).data.posts).toHaveLength(0)
  })

  it('publishes now, records a revision, and serves the post publicly', async () => {
    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/content/blog/posts/${postId}/publish`,
      headers: auth(),
      payload: {},
    })

    expect(published.statusCode).toBe(200)
    expect(body(published).data.status).toBe('published')
    expect(body(published).data.hasUnpublishedChanges).toBe(false)

    const revisions = await app.inject({
      method: 'GET',
      url: `/api/v1/content/blog/posts/${postId}/revisions`,
      headers: auth(),
    })
    expect(body(revisions).data.length).toBeGreaterThan(0)
    expect(body(revisions).data[0].reason).toBe('publish')

    const publicRead = await app.inject({
      method: 'GET',
      url: '/api/v1/content/public/blog/hello-world',
      query: { host: HOST },
    })

    expect(publicRead.statusCode).toBe(200)
    // The storefront read model: identical in shape to a page, so the same
    // renderer paints it.
    expect(body(publicRead).data.page.path).toBe('/blog/hello-world')
    expect(body(publicRead).data.page.sections[0].block).toBe('hero-centered-01')
    expect(body(publicRead).data.site.theme.colorPrimary).toMatch(/^#[0-9a-f]{6}$/i)
    expect(body(publicRead).data.post.slug).toBe('hello-world')
  })

  it('publishes a feed a reader can subscribe to', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/public/blog/feed.xml',
      query: { host: HOST },
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('application/rss+xml')
    expect(response.body).toContain('<rss version="2.0"')
    expect(response.body).toContain('<title>Hello world</title>')
    expect(response.body).toContain(`/blog/hello-world`)
  })

  it('restores a revision into the draft without republishing it', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/content/blog/posts/${postId}`,
      headers: auth(),
      payload: { title: 'Hello world v2' },
    })

    const revisions = await app.inject({
      method: 'GET',
      url: `/api/v1/content/blog/posts/${postId}/revisions`,
      headers: auth(),
    })
    const revisionId = body(revisions).data[0].id

    const restored = await app.inject({
      method: 'POST',
      url: `/api/v1/content/blog/posts/${postId}/revisions/${revisionId}/restore`,
      headers: auth(),
    })

    expect(restored.statusCode).toBe(200)
    expect(body(restored).data.title).toBe('Hello world')

    // Neither the edit nor the restore reached the live document: it still
    // holds what the last publish put there.
    const publicRead = await app.inject({
      method: 'GET',
      url: '/api/v1/content/public/blog/hello-world',
      query: { host: HOST },
    })
    expect(body(publicRead).data.page.title).toBe('Hello world')
  })

  it('hides one tenant’s post from another', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/content/blog/posts/${postId}`,
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('deleting media that is in use', () => {
  it('refuses while a post references the asset, and names what would break', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/content/blog/posts/${postId}`,
      headers: auth(),
      payload: { coverMediaId: pngId },
    })

    const usage = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${pngId}/usage`,
      headers: auth(),
    })
    expect(body(usage).data.total).toBeGreaterThan(0)
    expect(body(usage).data.references[0].kind).toBe('post')

    const refused = await app.inject({
      method: 'DELETE',
      url: `/api/v1/content/media/${pngId}`,
      headers: auth(),
    })
    expect(refused.statusCode).toBe(409)
    expect(body(refused).error.details.total).toBeGreaterThan(0)
  })

  it('deletes anyway when the caller overrides', async () => {
    const forced = await app.inject({
      method: 'DELETE',
      url: `/api/v1/content/media/${pngId}`,
      headers: auth(),
      query: { force: 'true' },
    })

    expect(forced.statusCode).toBe(200)

    const gone = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${pngId}`,
      headers: auth(),
    })
    expect(gone.statusCode).toBe(404)
  })
})

describe('usage, down to the section', () => {
  let usedId = ''
  let unusedId = ''
  let pageId = ''

  beforeAll(async () => {
    usedId = body(await upload(PNG, { filename: 'in-a-hero.png', folder: 'usage' })).data.asset.id
    unusedId = body(await upload(PNG, { filename: 'nowhere.png', folder: 'usage' })).data.asset.id

    // A real page, with the asset URL inside a real block's image prop — the
    // same place the editor would put it.
    const page = await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: auth(),
      payload: {
        path: '/uses-an-image',
        title: 'Uses an image',
        sections: [
          {
            id: 'sec_hero01',
            block: 'hero-split-01',
            props: { headline: 'Look', image: `/api/v1/content/public/media/${usedId}` },
          },
        ],
      },
    })
    pageId = body(page).data.id
  })

  it('names the page, the section and the block that would break', async () => {
    const usage = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${usedId}/usage`,
      headers: auth(),
    })

    const reference = body(usage).data.references.find((entry: { id: string }) => entry.id === pageId)
    expect(reference).toBeTruthy()
    expect(reference.kind).toBe('page')
    expect(reference.path).toBe('/uses-an-image')
    // The point of section-level detail: which block to go and fix.
    expect(reference.sectionId).toBe('sec_hero01')
    expect(reference.block).toBe('hero-split-01')
  })

  it('reports a usage count on every asset in the library', async () => {
    const library = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'usage' },
    })

    const assets: { id: string; usageCount: number }[] = body(library).data.assets
    expect(assets.find((asset) => asset.id === usedId)?.usageCount).toBe(1)
    expect(assets.find((asset) => asset.id === unusedId)?.usageCount).toBe(0)
    expect(body(library).data.unusedCount).toBeGreaterThan(0)
  })

  it('filters down to the assets nothing references', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'usage', unused: 'true' },
    })

    const ids = body(response).data.assets.map((asset: { id: string }) => asset.id)
    expect(ids).toContain(unusedId)
    expect(ids).not.toContain(usedId)
  })

  it('counts an author portrait as usage too', async () => {
    const portraitId = body(await upload(PNG, { filename: 'portrait.png' })).data.asset.id

    await app.inject({
      method: 'POST',
      url: `/api/v1/content/sites/${siteId}/blog/authors`,
      headers: auth(),
      payload: { slug: `writer-${suffix}`, name: 'A Writer', avatarMediaId: portraitId },
    })

    const usage = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${portraitId}/usage`,
      headers: auth(),
    })

    expect(body(usage).data.total).toBe(1)
    expect(body(usage).data.references[0].kind).toBe('author')
  })
})

describe('bulk edits', () => {
  let ids: string[] = []

  beforeAll(async () => {
    ids = []
    for (const name of ['bulk-a.png', 'bulk-b.png', 'bulk-c.png']) {
      ids.push(body(await upload(PNG, { filename: name, folder: 'bulk' })).data.asset.id)
    }
  })

  async function bulk(payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url: '/api/v1/content/media/bulk', headers: auth(), payload })
  }

  it('moves a selection into another folder', async () => {
    const response = await bulk({ ids, action: 'move', folder: 'bulk/moved' })
    expect(response.statusCode).toBe(200)
    expect(body(response).data.changed).toBe(3)

    const moved = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'bulk/moved' },
    })
    expect(body(moved).data.assets).toHaveLength(3)
  })

  it('shows assets from nested folders when a parent folder is open', async () => {
    const parent = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'bulk' },
    })
    // `bulk` itself now holds nothing; all three live in `bulk/moved`.
    expect(body(parent).data.assets).toHaveLength(3)
  })

  it('adds and removes tags as a set, without duplicating them', async () => {
    await bulk({ ids, action: 'tag', tags: ['campaign', 'summer'] })
    await bulk({ ids, action: 'tag', tags: ['summer'] })

    const tagged = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${ids[0]}`,
      headers: auth(),
    })
    expect(body(tagged).data.tags).toEqual(['campaign', 'summer'])

    await bulk({ ids, action: 'untag', tags: ['summer'] })
    const untagged = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${ids[0]}`,
      headers: auth(),
    })
    expect(body(untagged).data.tags).toEqual(['campaign'])
  })

  it('skips referenced assets on a bulk delete and names them', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/sites/${siteId}/pages`,
      headers: auth(),
      payload: {
        path: '/bulk-reference',
        title: 'Bulk reference',
        sections: [
          { id: 'sec_bulk01', block: 'hero-split-01', props: { image: `/api/v1/content/public/media/${ids[0]}` } },
        ],
      },
    })

    const response = await bulk({ ids, action: 'delete' })

    expect(response.statusCode).toBe(200)
    expect(body(response).data.changed).toBe(2)
    expect(body(response).data.blocked).toHaveLength(1)
    expect(body(response).data.blocked[0].id).toBe(ids[0])
    expect(body(response).data.blocked[0].uses).toBe(1)

    // The two unreferenced ones really are gone; the referenced one is not.
    expect((await app.inject({ method: 'GET', url: `/api/v1/content/media/${ids[1]}`, headers: auth() })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: `/api/v1/content/media/${ids[0]}`, headers: auth() })).statusCode).toBe(200)
  })

  it('deletes the referenced one when forced', async () => {
    const response = await bulk({ ids: [ids[0]], action: 'delete', force: true })
    expect(body(response).data.changed).toBe(1)
    expect(body(response).data.blocked).toHaveLength(0)
  })

  it('refuses a bulk edit from another tenant without touching anything', async () => {
    const survivor = body(await upload(PNG, { filename: 'survivor.png' })).data.asset.id

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/content/media/bulk',
      headers: { cookie: otherCookie, 'x-tenant-id': otherTenantId },
      payload: { ids: [survivor], action: 'delete', force: true },
    })

    // RLS scopes the delete to the calling tenant, so it matches nothing.
    expect(body(response).data.changed).toBe(0)
    expect((await app.inject({ method: 'GET', url: `/api/v1/content/media/${survivor}`, headers: auth() })).statusCode).toBe(200)
  })
})

describe('filtering and serving', () => {
  let jpegId = ''

  beforeAll(async () => {
    jpegId = body(await upload(JPEG, { filename: 'filter-me.jpg', folder: 'filters', tags: 'photo' })).data.asset.id
    await upload(PNG, { filename: 'filter-me-too.png', folder: 'filters' })
  })

  it('filters by type, size and date', async () => {
    const byType = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'filters', mime: 'image/jpeg' },
    })
    expect(body(byType).data.assets.map((asset: { id: string }) => asset.id)).toEqual([jpegId])

    const tooSmall = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'filters', minBytes: '1000000' },
    })
    expect(body(tooSmall).data.assets).toHaveLength(0)

    const beforeToday = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'filters', createdBefore: new Date(Date.now() - 86_400_000).toISOString() },
    })
    expect(beforeToday.statusCode).toBe(200)
    expect(body(beforeToday).data.assets).toHaveLength(0)
  })

  it('finds an asset by one of its tags', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { search: 'photo' },
    })
    expect(body(response).data.assets.map((asset: { id: string }) => asset.id)).toContain(jpegId)
  })

  it('sorts by name', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/content/media',
      headers: auth(),
      query: { folder: 'filters', sort: 'name' },
    })
    const names = body(response).data.assets.map((asset: { filename: string }) => asset.filename)
    expect(names).toEqual([...names].sort())
  })

  it('serves a raster image inline, and as a download when asked', async () => {
    const inline = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${jpegId}/file`,
      headers: auth(),
    })
    expect(inline.headers['content-disposition']).toBeUndefined()

    const download = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${jpegId}/file`,
      headers: auth(),
      query: { download: 'true' },
    })
    expect(download.headers['content-disposition']).toMatch(/^attachment/)
  })

  it('never serves an SVG inline, even when a caller asks it to', async () => {
    const svg = body(await upload(HOSTILE_SVG, { filename: 'never-inline.svg' }, 'image/svg+xml')).data.asset

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/content/media/${svg.id}/file`,
      headers: auth(),
      query: { download: 'false' },
    })

    expect(response.headers['content-disposition']).toMatch(/^attachment/)
    expect(String(response.headers['content-security-policy'])).toContain("default-src 'none'")
  })
})
