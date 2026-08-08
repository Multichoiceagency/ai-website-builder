import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { isVideoMime, type MediaAsset, type MediaFrameStatus } from '@platform/schemas'
import { withTenant } from '../../db/client.js'
import { findMediaById, updateMediaFramePack } from '../../db/repositories/content.js'
import { storage } from '../storage/index.js'
import { mediaFrameStorageKey } from './url.js'

/**
 * Post-upload scroll-frame extraction.
 *
 * Caps tuned for Apple-style image-sequence scrub (industry ~90–150 frames from
 * a ~3–6s clip at ~24fps). We target 24fps, max 120 frames, first 5s, max width
 * 960, JPEG — smooth scrub without a multi‑MB PNG dump. (Direct MP4 scrub needs
 * dense keyframes instead; we use a frame pack for precise canvas scrubbing.)
 */

export const FRAME_TARGET_FPS = 24
export const FRAME_MAX_COUNT = 120
export const FRAME_MAX_DURATION_SEC = 5
export const FRAME_MAX_WIDTH = 960
/** JPEG keeps scroll packs small when libwebp is missing from Homebrew ffmpeg. */
export const FRAME_EXT = 'jpg'
export const FRAME_MIME = 'image/jpeg' as const
/** ffmpeg mjpeg quality 2–31 (lower = better). ~5 ≈ good product scrub. */
export const FRAME_JPEG_Q = 5

export type FrameCaps = {
  fps: number
  maxCount: number
  maxDurationSec: number
  maxWidth: number
}

export const DEFAULT_FRAME_CAPS: FrameCaps = {
  fps: FRAME_TARGET_FPS,
  maxCount: FRAME_MAX_COUNT,
  maxDurationSec: FRAME_MAX_DURATION_SEC,
  maxWidth: FRAME_MAX_WIDTH,
}

/** Effective fps so duration × fps never exceeds maxCount. */
export function resolveExtractFps(durationSec: number, caps: FrameCaps = DEFAULT_FRAME_CAPS): number {
  const usable = Math.min(Math.max(durationSec, 0.1), caps.maxDurationSec)
  const byDuration = caps.maxCount / usable
  return Math.min(caps.fps, Math.max(1, byDuration))
}

function run(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      resolve({ code: 127, stdout, stderr: error.message })
    })
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

export async function ffmpegAvailable(): Promise<boolean> {
  const probe = await run('ffprobe', ['-version'])
  const ffmpeg = await run('ffmpeg', ['-version'])
  return probe.code === 0 && ffmpeg.code === 0
}

async function probeDurationSec(inputPath: string): Promise<number> {
  const result = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    inputPath,
  ])
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || 'ffprobe failed')
  }
  const duration = Number.parseFloat(result.stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Could not read video duration')
  }
  return duration
}

/**
 * Extract JPEG frames from a local video file into `outDir` as `000.jpg`…
 * Returns how many frames were written and the fps used.
 */
export async function extractFramesToDir(
  inputPath: string,
  outDir: string,
  caps: FrameCaps = DEFAULT_FRAME_CAPS,
): Promise<{ count: number; fps: number; width: number }> {
  await mkdir(outDir, { recursive: true })
  const duration = await probeDurationSec(inputPath)
  const fps = resolveExtractFps(duration, caps)
  const pattern = join(outDir, `%03d.${FRAME_EXT}`)

  const result = await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '0',
    '-t',
    String(caps.maxDurationSec),
    '-i',
    inputPath,
    '-vf',
    `fps=${fps},scale='min(${caps.maxWidth},iw)':-2`,
    '-frames:v',
    String(caps.maxCount),
    '-start_number',
    '0',
    '-c:v',
    'mjpeg',
    '-q:v',
    String(FRAME_JPEG_Q),
    pattern,
  ])

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || 'ffmpeg frame extract failed')
  }

  const files = (await readdir(outDir))
    .filter((name) => new RegExp(`^\\d{3}\\.${FRAME_EXT}$`, 'i').test(name))
    .sort()
  if (!files.length) {
    throw new Error('ffmpeg produced no frames')
  }

  return { count: files.length, fps, width: caps.maxWidth }
}

export async function removeFrameObjects(videoStorageKey: string, frameCount: number): Promise<void> {
  const store = storage()
  for (let i = 0; i < frameCount; i += 1) {
    const jpg = mediaFrameStorageKey(videoStorageKey, i)
    await store.remove(jpg)
    await store.remove(jpg.replace(/\.jpg$/i, '.png'))
    await store.remove(jpg.replace(/\.jpg$/i, '.webp'))
  }
}

/**
 * Full extract for one library video: download → ffmpeg → put frames → update row.
 * Safe to call fire-and-forget after upload.
 */
export async function processVideoFrames(tenantId: string, mediaId: string): Promise<MediaAsset | null> {
  const asset = await withTenant(tenantId, (tx) => findMediaById(tx, tenantId, mediaId))
  if (!asset || !isVideoMime(asset.mime)) return asset

  await withTenant(tenantId, (tx) =>
    updateMediaFramePack(tx, tenantId, mediaId, {
      frameStatus: 'pending',
      frameCount: 0,
      frameFps: 0,
      frameWidth: 0,
      frameError: '',
    }),
  )

  if (!(await ffmpegAvailable())) {
    return withTenant(tenantId, (tx) =>
      updateMediaFramePack(tx, tenantId, mediaId, {
        frameStatus: 'failed',
        frameCount: 0,
        frameFps: 0,
        frameWidth: 0,
        frameError: 'ffmpeg/ffprobe not installed on the API host',
      }),
    )
  }

  const store = storage()
  const bytes = await store.get(asset.storageKey)
  if (!bytes) {
    return withTenant(tenantId, (tx) =>
      updateMediaFramePack(tx, tenantId, mediaId, {
        frameStatus: 'failed',
        frameCount: 0,
        frameFps: 0,
        frameWidth: 0,
        frameError: 'Video bytes missing from storage',
      }),
    )
  }

  const work = await mkdtemp(join(tmpdir(), 'media-frames-'))
  const inputPath = join(work, `source${asset.mime === 'video/webm' ? '.webm' : '.mp4'}`)
  const outDir = join(work, 'frames')

  try {
    if (asset.frameCount > 0) {
      await removeFrameObjects(asset.storageKey, asset.frameCount)
    }

    await writeFile(inputPath, bytes)
    const { count, fps, width } = await extractFramesToDir(inputPath, outDir)

    for (let i = 0; i < count; i += 1) {
      const frameBytes = await readFile(join(outDir, `${String(i).padStart(3, '0')}.${FRAME_EXT}`))
      await store.put(mediaFrameStorageKey(asset.storageKey, i), frameBytes, FRAME_MIME)
    }

    return withTenant(tenantId, (tx) =>
      updateMediaFramePack(tx, tenantId, mediaId, {
        frameStatus: 'ready' satisfies MediaFrameStatus,
        frameCount: count,
        frameFps: Math.round(fps * 100) / 100,
        frameWidth: width,
        frameError: '',
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Frame extract failed'
    return withTenant(tenantId, (tx) =>
      updateMediaFramePack(tx, tenantId, mediaId, {
        frameStatus: 'failed',
        frameCount: 0,
        frameFps: 0,
        frameWidth: 0,
        frameError: message,
      }),
    )
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

/** Schedule extract without blocking the upload response. */
export function scheduleVideoFrameExtract(tenantId: string, mediaId: string): void {
  setImmediate(() => {
    void processVideoFrames(tenantId, mediaId).catch((error) => {
      console.error('[media-frames]', mediaId, error)
    })
  })
}
