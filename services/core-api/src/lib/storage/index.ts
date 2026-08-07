import { LocalStorageProvider } from './local.js'
import { S3StorageProvider, type S3Config } from './s3.js'
import type { StorageProvider } from './types.js'

export { LocalStorageProvider } from './local.js'
export { S3StorageProvider } from './s3.js'
export { assertSafeKey, StorageKeyError, type StorageProvider } from './types.js'

/**
 * Pick the driver at runtime.
 *
 * `local` is the default on purpose. An object store is an operational
 * dependency, and a media library that cannot be developed or tested without
 * one running is a media library nobody touches. Setting `STORAGE_DRIVER=s3`
 * plus the four `S3_*` values switches to the bucket with no code change
 * (ADR-0006); anything missing falls back to the filesystem rather than
 * failing half-configured, which would be a service that boots and then
 * fails on the first upload.
 */
export function createStorageProvider(source: NodeJS.ProcessEnv = process.env): StorageProvider {
  const driver = (source.STORAGE_DRIVER ?? 'local').toLowerCase()

  if (driver === 's3') {
    const config = readS3Config(source)
    if (config) return new S3StorageProvider(config)
  }

  return new LocalStorageProvider(source.MEDIA_LOCAL_ROOT ?? '.data/storage')
}

function readS3Config(source: NodeJS.ProcessEnv): S3Config | null {
  const endpoint = source.S3_ENDPOINT
  const bucket = source.S3_BUCKET
  const accessKeyId = source.S3_ACCESS_KEY_ID
  const secretAccessKey = source.S3_SECRET_ACCESS_KEY

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: source.S3_REGION ?? 'us-east-1',
    // Default on: MinIO, the local stand-in, only speaks path-style.
    forcePathStyle: (source.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
  }
}

let active: StorageProvider | null = null

/** The process-wide provider. Constructed once, on first use. */
export function storage(): StorageProvider {
  active ??= createStorageProvider()
  return active
}
