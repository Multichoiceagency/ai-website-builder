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
