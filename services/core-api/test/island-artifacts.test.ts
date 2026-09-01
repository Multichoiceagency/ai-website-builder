import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { islandArtifactKey, mimeForPath, publishIslandArtifacts } from '../src/lib/motionsites/island-artifacts.js'
import { assertSafeKey } from '../src/lib/storage/types.js'

/**
 * A built island is only useful if every file lands under a key the store
 * accepts and the browser's request for the name in index.html folds to the
 * same key.
 */

describe('islandArtifactKey', () => {
  it('folds Vite output names into keys the store accepts', () => {
    for (const rel of ['index.html', 'assets/index-BxT9k2.js', 'assets/three.module.js', 'assets/Index.CSS']) {
      expect(() => assertSafeKey(islandArtifactKey('gen-hero-spaceedu', rel))).not.toThrow()
    }
  })

  it('folds the served path to the published key', () => {
    expect(islandArtifactKey('a1', 'assets/three.module.js')).toBe(islandArtifactKey('a1', 'assets/three-module.js'))
    expect(islandArtifactKey('a1', 'Assets/Index.JS')).toBe('motionsites/islands/a1/assets/index.js')
  })

  it('never lets an id or path escape the island', () => {
    expect(() => islandArtifactKey('../x', 'index.html')).toThrow()
    expect(islandArtifactKey('a1', '../../index.html')).toBe('motionsites/islands/a1/index.html')
  })
})

describe('publishIslandArtifacts', () => {
  it('uploads every file with its MIME type', async () => {
    const dist = await mkdtemp(join(tmpdir(), 'island-'))
    await mkdir(join(dist, 'assets'))
    await writeFile(join(dist, 'index.html'), '<html></html>')
    await writeFile(join(dist, 'assets', 'index-AbC1.js'), 'export {}')
    await writeFile(join(dist, 'assets', 'index.css'), 'body{}')
    const puts: { key: string; mime: string }[] = []

    const keys = await publishIslandArtifacts({
      sectionId: 'gen-hero',
      distDir: dist,
      store: { put: async (key, _body, mime) => void puts.push({ key, mime }) },
    })

    expect(keys).toHaveLength(3)
    expect(puts).toContainEqual({ key: 'motionsites/islands/gen-hero/index.html', mime: 'text/html; charset=utf-8' })
    expect(puts).toContainEqual({ key: 'motionsites/islands/gen-hero/assets/index-abc1.js', mime: 'text/javascript; charset=utf-8' })
    expect(mimeForPath('x.woff2')).toBe('font/woff2')
  })
})
