import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FRAME_CAPS,
  extractFramesToDir,
  resolveExtractFps,
  FRAME_MAX_COUNT,
  FRAME_TARGET_FPS,
} from '../src/lib/media/frames.js'
import { mediaFramePublicUrl, mediaFrameStorageKey } from '../src/lib/media/url.js'

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))))
  })
}

describe('scroll frame caps', () => {
  it('keeps target fps for short clips', () => {
    expect(resolveExtractFps(3, DEFAULT_FRAME_CAPS)).toBe(FRAME_TARGET_FPS)
  })

  it('lowers fps so duration × fps never exceeds max frames', () => {
    const fps = resolveExtractFps(5, DEFAULT_FRAME_CAPS)
    expect(fps * 5).toBeLessThanOrEqual(FRAME_MAX_COUNT + 0.01)
    expect(fps).toBeLessThanOrEqual(FRAME_TARGET_FPS)
  })

  it('still yields at least 1 fps for tiny clips', () => {
    expect(resolveExtractFps(0.05, DEFAULT_FRAME_CAPS)).toBeGreaterThanOrEqual(1)
  })
})

describe('frame URL helpers', () => {
  it('builds public frame URLs from media id + index', () => {
    expect(mediaFramePublicUrl('11111111-1111-4111-8111-111111111111', 3)).toBe(
      '/api/v1/content/public/media/11111111-1111-4111-8111-111111111111/frames/3.jpg',
    )
  })

  it('derives storage keys beside the parent video object', () => {
    expect(mediaFrameStorageKey('media/2026/08/abcdef12-3456-7890-abcd-ef1234567890.mp4', 7)).toBe(
      'media/2026/08/abcdef12-3456-7890-abcd-ef1234567890/frames/007.jpg',
    )
  })
})

describe('ffmpeg extract', () => {
  it('writes a 0-based JPEG sequence from a short clip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'media-frames-test-'))
    const video = join(dir, 'clip.mp4')
    const out = join(dir, 'frames')
    try {
      await run('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=blue:s=320x240:d=1',
        '-pix_fmt',
        'yuv420p',
        video,
      ])
      const result = await extractFramesToDir(video, out, {
        ...DEFAULT_FRAME_CAPS,
        fps: 8,
        maxCount: 12,
      })
      expect(result.count).toBeGreaterThan(0)
      expect(result.count).toBeLessThanOrEqual(12)
      const files = (await readdir(out)).filter((name) => name.endsWith('.jpg')).sort()
      expect(files[0]).toBe('000.jpg')
      expect(files.length).toBe(result.count)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }, 30_000)
})
