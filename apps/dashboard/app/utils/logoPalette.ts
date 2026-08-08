/**
 * Extract a brand palette from a logo file in the browser.
 *
 * Raster images are sampled on a canvas. SVG is read as text for fill/stroke
 * colours. Greys and near-white/black are skipped the same way discovery does.
 */

function isBrandish(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max > 242 && min > 242) return false
  if (max < 24) return false
  if (max - min < 18) return false
  return true
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function rankColors(counts: Map<string, number>, limit = 8): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([hex]) => hex)
}

function extractFromSvgText(svg: string): string[] {
  const counts = new Map<string, number>()

  const consider = (hex: string) => {
    const normalized = hex.toLowerCase()
    if (!isBrandish(normalized)) return
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  for (const match of svg.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const raw = match[1]!
    const hex =
      raw.length === 3
        ? `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
        : `#${raw}`
    consider(hex)
  }

  for (const match of svg.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    const r = Number(match[1])
    const g = Number(match[2])
    const b = Number(match[3])
    if ([r, g, b].some((channel) => channel > 255)) continue
    consider(toHex(r, g, b))
  }

  return rankColors(counts)
}

function extractFromImageElement(image: HTMLImageElement): string[] {
  const canvas = document.createElement('canvas')
  const size = 96
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []

  context.drawImage(image, 0, 0, size, size)
  const { data } = context.getImageData(0, 0, size, size)
  const counts = new Map<string, number>()

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3]!
    if (alpha < 200) continue
    // Quantise to reduce noise from anti-aliasing.
    const r = data[i]! & 0xf0
    const g = data[i + 1]! & 0xf0
    const b = data[i + 2]! & 0xf0
    const hex = toHex(r, g, b)
    if (!isBrandish(hex)) continue
    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }

  return rankColors(counts)
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    image.src = url
  })
}

/** Dominant brand-ish colours from a logo File (PNG/JPEG/WebP/SVG/GIF). */
export async function extractPaletteFromLogoFile(file: File): Promise<string[]> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    const text = await file.text()
    return extractFromSvgText(text)
  }

  const image = await loadImageFromBlob(file)
  return extractFromImageElement(image)
}
