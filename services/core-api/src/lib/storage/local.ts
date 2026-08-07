import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { assertSafeKey, StorageKeyError, type StorageProvider } from './types.js'

/**
 * Filesystem storage, under a single root directory.
 *
 * This is the development default and the driver the tests exercise, so the
 * media library works on a laptop with nothing else running. It is not a
 * lesser implementation: it enforces the same key rules as the object store,
 * and adds the one check a filesystem needs and a bucket does not — that the
 * *resolved* path is still inside the root. `assertSafeKey` already makes that
 * impossible; the check stays because a containment bug that depends on a
 * regex being perfect is a containment bug.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly driver = 'local' as const
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  private pathFor(key: string): string {
    const path = resolve(join(this.root, assertSafeKey(key)))
    if (path !== this.root && !path.startsWith(this.root + sep)) {
      throw new StorageKeyError(key)
    }
    return path
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathFor(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true })
  }
}
