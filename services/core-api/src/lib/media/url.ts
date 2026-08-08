/**
 * Where stored bytes are addressed from.
 *
 * One constant, because the URL ends up embedded in page documents — every
 * published site holds copies of it — and a prefix that is spelled out at four
 * call sites is a prefix that eventually differs at one of them.
 */
export const MEDIA_PUBLIC_PATH = '/api/v1/content/public/media'

export function mediaPublicUrl(mediaId: string | null): string {
  return mediaId ? `${MEDIA_PUBLIC_PATH}/${mediaId}` : ''
}

/** Public URL for one scroll-scrub JPEG frame (0-based index). */
export function mediaFramePublicUrl(mediaId: string, index: number): string {
  const safe = Math.max(0, Math.floor(index))
  return `${MEDIA_PUBLIC_PATH}/${mediaId}/frames/${safe}.jpg`
}

/**
 * Storage key for frame `index` next to the parent video object.
 * `media/2026/08/{uuid}.mp4` → `media/2026/08/{uuid}/frames/000.jpg`
 */
export function mediaFrameStorageKey(videoStorageKey: string, index: number): string {
  const base = videoStorageKey.replace(/\.[a-z0-9]+$/i, '')
  const safe = Math.max(0, Math.floor(index))
  return `${base}/frames/${String(safe).padStart(3, '0')}.jpg`
}
