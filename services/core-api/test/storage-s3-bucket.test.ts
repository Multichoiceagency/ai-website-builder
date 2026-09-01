import { afterEach, describe, expect, it, vi } from 'vitest'
import { S3StorageProvider } from '../src/lib/storage/s3.js'

/**
 * Production ran for a day with no bucket: every upload 404'd and the media
 * library stayed empty. The driver now makes the bucket on that first 404.
 */

const provider = new S3StorageProvider({
  endpoint: 'http://minio:9000',
  bucket: 'platform-media',
  accessKeyId: 'test-access-key-id',
  secretAccessKey: 'test-secret-not-real',
  region: 'eu-central-1',
  forcePathStyle: true,
})

function fetchSequence(statuses: number[]) {
  const calls: { url: string; method: string }[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET' })
    const status = statuses.shift() ?? 200
    return new Response(null, { status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

afterEach(() => vi.unstubAllGlobals())

describe('S3StorageProvider.put', () => {
  it('creates the bucket on a 404 and retries the upload', async () => {
    const calls = fetchSequence([404, 200, 200])

    await provider.put('media/a.png', Buffer.from('x'), 'image/png')

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'PUT http://minio:9000/platform-media/media/a.png',
      'PUT http://minio:9000/platform-media',
      'PUT http://minio:9000/platform-media/media/a.png',
    ])
  })

  it('treats a bucket that already exists as created', async () => {
    fetchSequence([404, 409, 200])

    await expect(provider.put('media/a.png', Buffer.from('x'), 'image/png')).resolves.toBeUndefined()
  })

  it('does not touch the bucket for any other failure', async () => {
    const calls = fetchSequence([403])

    await expect(provider.put('media/a.png', Buffer.from('x'), 'image/png')).rejects.toThrow('403')
    expect(calls).toHaveLength(1)
  })
})
