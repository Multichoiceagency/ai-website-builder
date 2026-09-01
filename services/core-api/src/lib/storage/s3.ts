import { createHash, createHmac } from 'node:crypto'
import { assertSafeKey, type StorageProvider } from './types.js'

export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /** MinIO and most self-hosted gateways only speak path-style addressing. */
  forcePathStyle: boolean
}

function sha256Hex(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** Computed rather than pasted: a mistyped constant here fails as a 403. */
const EMPTY_SHA256 = sha256Hex('')

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest()
}

/** RFC 3986. `encodeURIComponent` leaves `!'()*` alone; S3 does not agree. */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

/**
 * S3-compatible object storage (AWS S3, MinIO, R2, Spaces).
 *
 * Signed by hand with SigV4 rather than by pulling in a vendor SDK: the three
 * operations behind `StorageProvider` need PUT, GET and DELETE of a single
 * object, and an SDK for that is several megabytes of dependency to avoid
 * eighty lines of HMAC. `fetch` and `node:crypto` are both in the runtime.
 *
 * Vendor names appear here and nowhere else in the service (ADR-0006).
 */
export class S3StorageProvider implements StorageProvider {
  readonly driver = 's3' as const

  constructor(private readonly config: S3Config) {}

  private url(key: string): { href: string; host: string; canonicalPath: string } {
    const base = new URL(this.config.endpoint)
    const encodedKey = key.split('/').map(uriEncode).join('/')

    if (this.config.forcePathStyle) {
      const canonicalPath = `/${uriEncode(this.config.bucket)}/${encodedKey}`
      return { href: `${base.origin}${canonicalPath}`, host: base.host, canonicalPath }
    }

    const host = `${this.config.bucket}.${base.host}`
    return { href: `${base.protocol}//${host}/${encodedKey}`, host, canonicalPath: `/${encodedKey}` }
  }

  private sign(
    method: string,
    target: { host: string; canonicalPath: string },
    payloadHash: string,
    extraHeaders: Record<string, string>,
  ): Record<string, string> {
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`

    // Lowercased at construction, so the canonical form and the form actually
    // sent are the same object — signing a header the request does not carry
    // (or carries under different case) is the classic SigV4 failure.
    const headers: Record<string, string> = {
      host: target.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }
    for (const [name, value] of Object.entries(extraHeaders)) headers[name.toLowerCase()] = value

    const signedNames = Object.keys(headers).sort()
    const canonicalHeaders = signedNames.map((name) => `${name}:${headers[name]!.trim()}\n`).join('')
    const signedHeaders = signedNames.join(';')

    const canonicalRequest = [
      method,
      target.canonicalPath,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n')

    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region), 's3'),
      'aws4_request',
    )
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex')

    return {
      ...headers,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const target = this.url(assertSafeKey(key))
    const headers = this.sign('PUT', target, sha256Hex(body), { 'content-type': contentType })
    const upload = () => fetch(target.href, { method: 'PUT', headers, body: new Uint8Array(body) })

    let response = await upload()
    // A PUT can only 404 when the bucket is missing. Nothing else creates it
    // on a fresh MinIO, so the first upload of a deployment does.
    if (response.status === 404 && (await this.createBucket())) response = await upload()
    if (!response.ok) {
      throw new Error(`Object storage rejected the upload (${response.status}).`)
    }
  }

  /** True when the bucket exists afterwards, whether it was just made or already ours. */
  private async createBucket(): Promise<boolean> {
    const base = new URL(this.config.endpoint)
    const target = this.config.forcePathStyle
      ? { href: `${base.origin}/${uriEncode(this.config.bucket)}`, host: base.host, canonicalPath: `/${uriEncode(this.config.bucket)}` }
      : { href: `${base.protocol}//${this.config.bucket}.${base.host}/`, host: `${this.config.bucket}.${base.host}`, canonicalPath: '/' }
    const headers = this.sign('PUT', target, EMPTY_SHA256, {})
    const response = await fetch(target.href, { method: 'PUT', headers })
    return response.ok || response.status === 409
  }

  async get(key: string): Promise<Buffer | null> {
    const target = this.url(assertSafeKey(key))
    const headers = this.sign('GET', target, EMPTY_SHA256, {})

    const response = await fetch(target.href, { method: 'GET', headers })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Object storage read failed (${response.status}).`)

    return Buffer.from(await response.arrayBuffer())
  }

  async remove(key: string): Promise<void> {
    const target = this.url(assertSafeKey(key))
    const headers = this.sign('DELETE', target, EMPTY_SHA256, {})

    const response = await fetch(target.href, { method: 'DELETE', headers })
    // 404 is success: the caller wanted the object gone, and it is.
    if (!response.ok && response.status !== 404) {
      throw new Error(`Object storage delete failed (${response.status}).`)
    }
  }
}
