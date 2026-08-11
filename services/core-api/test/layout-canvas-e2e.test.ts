import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSection } from '@platform/blocks'
import {
  LAYOUT_CANVAS_BLOCK_ID,
  findLayoutNode,
  updateLayoutNode,
  type LayoutContainerNode,
  type LayoutNode,
} from '@platform/schemas'
import { buildApp } from '../src/app.js'
import { closeDatabase, withTenant, withoutTenant } from '../src/db/client.js'
import { insertDomain } from '../src/db/repositories/sites.js'

/**
 * End-to-end round-trip for `layout-canvas-01` freeform sections:
 * auth → site/page → PATCH root tree → GET preserve → editor-style update →
 * publish → public read. Invalid trees must be rejected on write.
 */

const suffix = Math.random().toString(36).slice(2, 8)
const EMAIL = `layout-canvas-e2e-${suffix}@platform.local`
const PASSWORD = 'a-long-enough-password'
const HOST = `layout-canvas-${suffix}.local`
const PAGE_PATH = '/canvas'

let app: FastifyInstance
let cookie = ''
let tenantId = ''
let siteId = ''
let pageId = ''
let sectionId = ''

const INITIAL_TEXT = 'Hello canvas'
const UPDATED_TEXT = 'Hello updated canvas'
const BUTTON_LABEL = 'Click me'
const BUTTON_HREF = '/go'

function body(response: { body: string }) {
  return JSON.parse(response.body)
}

function authHeaders() {
  return { cookie, 'x-tenant-id': tenantId }
}

function buildRoot(textContent: string): LayoutContainerNode {
  return {
    id: 'root',
    type: 'container',
    styles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '1.5rem',
    },
    children: [
      {
        id: 'row',
        type: 'container',
        styles: { display: 'flex', flexDirection: 'row', gap: '1rem' },
        children: [
          { id: 't1', type: 'text', content: textContent, tag: 'h1' },
          { id: 'b1', type: 'button', label: BUTTON_LABEL, href: BUTTON_HREF },
        ],
      },
    ],
  }
}

function assertTreeShape(root: LayoutNode, expectedText: string) {
  expect(root).toMatchObject({ id: 'root', type: 'container' })
  const row = findLayoutNode(root, 'row')
  expect(row).toMatchObject({ id: 'row', type: 'container' })
  expect(findLayoutNode(root, 't1')).toMatchObject({
    id: 't1',
    type: 'text',
    content: expectedText,
    tag: 'h1',
  })
  expect(findLayoutNode(root, 'b1')).toMatchObject({
    id: 'b1',
    type: 'button',
    label: BUTTON_LABEL,
    href: BUTTON_HREF,
  })
}

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  const register = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: EMAIL,
      password: PASSWORD,
      name: 'Layout Canvas E2E',
      organizationName: `Layout Canvas E2E ${suffix}`,
    },
  })
  expect(register.statusCode).toBe(201)
  tenantId = body(register).data.activeTenantId
  cookie = String(register.headers['set-cookie']).split(';')[0]!

  const site = await app.inject({
    method: 'POST',
    url: '/api/v1/sites',
    headers: authHeaders(),
    payload: { name: `Layout Canvas ${suffix}`, slug: `layout-canvas-${suffix}`, locale: 'en' },
  })
  expect(site.statusCode).toBe(201)
  siteId = body(site).data.id

  await withTenant(tenantId, (tx) =>
    insertDomain(tx, { tenantId, siteId, hostname: HOST, isPrimary: true, verified: true }),
  )

  const page = await app.inject({
    method: 'POST',
    url: `/api/v1/sites/${siteId}/pages`,
    headers: authHeaders(),
    payload: { path: PAGE_PATH, title: 'Canvas page', sections: [] },
  })
  expect(page.statusCode).toBe(201)
  pageId = body(page).data.id
}, 60_000)

afterAll(async () => {
  await withoutTenant(async (tx) => {
    await tx`DELETE FROM organizations WHERE slug LIKE ${'%' + suffix + '%'}`
    await tx`DELETE FROM users WHERE email = ${EMAIL}`
  })
  await app.close()
  await closeDatabase()
})

describe('layout-canvas-01 freeform section round-trip', () => {
  it('PATCHes a layout-canvas section with a nested root tree', async () => {
    const section = createSection(LAYOUT_CANVAS_BLOCK_ID, { root: buildRoot(INITIAL_TEXT) })
    sectionId = section.id

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
      payload: { sections: [section] },
    })

    expect(response.statusCode).toBe(200)
    const sections = body(response).data.sections as { id: string; block: string; props: { root: LayoutNode } }[]
    expect(sections).toHaveLength(1)
    expect(sections[0]!.block).toBe(LAYOUT_CANVAS_BLOCK_ID)
    expect(sections[0]!.id).toBe(sectionId)
    assertTreeShape(sections[0]!.props.root, INITIAL_TEXT)
  })

  it('GETs the page and preserves ids, types, and content', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
    })

    expect(response.statusCode).toBe(200)
    const sections = body(response).data.sections as { id: string; block: string; props: { root: LayoutNode } }[]
    expect(sections[0]!.id).toBe(sectionId)
    expect(sections[0]!.block).toBe(LAYOUT_CANVAS_BLOCK_ID)
    assertTreeShape(sections[0]!.props.root, INITIAL_TEXT)
  })

  it('PATCHes again after updateLayoutNode (editor-style text edit)', async () => {
    const current = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
    })
    const root = body(current).data.sections[0].props.root as LayoutNode
    const nextRoot = updateLayoutNode(root, 't1', { content: UPDATED_TEXT })

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
      payload: {
        sections: [
          {
            id: sectionId,
            block: LAYOUT_CANVAS_BLOCK_ID,
            props: { root: nextRoot },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(200)
    assertTreeShape(body(response).data.sections[0].props.root, UPDATED_TEXT)
  })

  it('persists the updated text on GET', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
    })

    expect(response.statusCode).toBe(200)
    assertTreeShape(body(response).data.sections[0].props.root, UPDATED_TEXT)
  })

  it('publishes and serves the same layout tree on the public API', async () => {
    const publish = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${pageId}/publish`,
      headers: authHeaders(),
    })
    expect(publish.statusCode).toBe(200)
    expect(body(publish).data.status).toBe('published')

    const publicPage = await app.inject({
      method: 'GET',
      url: '/public/v1/pages',
      query: { host: HOST, path: PAGE_PATH },
    })
    expect(publicPage.statusCode).toBe(200)

    const sections = body(publicPage).data.page.sections as {
      id: string
      block: string
      props: { root: LayoutNode }
    }[]
    const canvas = sections.find((section) => section.block === LAYOUT_CANVAS_BLOCK_ID)
    expect(canvas).toBeTruthy()
    expect(canvas!.id).toBe(sectionId)
    assertTreeShape(canvas!.props.root, UPDATED_TEXT)
  })

  it('rejects an invalid layout tree on write', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pages/${pageId}`,
      headers: authHeaders(),
      payload: {
        sections: [
          {
            id: sectionId,
            block: LAYOUT_CANVAS_BLOCK_ID,
            props: { root: { id: 'root', type: 'not-a-node' } },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(400)
    expect(body(response).error.code).toBe('invalid_block_props')
  })
})
