import { computed, ref } from 'vue'
import type { MediaAsset } from '@platform/schemas'

/**
 * A queue for uploading files to the media library.
 *
 * `XMLHttpRequest` rather than `fetch`, for one reason: `fetch` has no upload
 * progress event, so a large image would sit at "uploading…" with nothing to
 * show. Everything else about the request matches `useApi` — session cookie,
 * active workspace header, the same envelope unwrapping.
 *
 * Each file is its own request and its own failure. One rejected file — wrong
 * type, too large, sanitiser refused it — leaves the rest of the batch alone
 * and reports itself in place, because dropping twelve photos and losing all
 * of them to the one screenshot among them is not an acceptable outcome.
 */

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'failed'

export interface UploadItem {
  id: string
  name: string
  sizeBytes: number
  /** 0–1. Stays at 0 while queued. */
  progress: number
  status: UploadStatus
  error: string
  asset: MediaAsset | null
  /** Constructs an SVG lost to sanitisation. Empty for everything else. */
  sanitised: string[]
}

/** Three at a time: enough to saturate a connection, few enough to stay ordered. */
const CONCURRENCY = 3

export function useMediaUpload() {
  const config = useRuntimeConfig()
  const tenantId = useActiveTenantId()

  const items = ref<UploadItem[]>([])

  const active = computed(() => items.value.filter((item) => item.status === 'uploading' || item.status === 'pending'))
  const busy = computed(() => active.value.length > 0)
  const failed = computed(() => items.value.filter((item) => item.status === 'failed'))

  function sendOne(item: UploadItem, file: File, folder: string): Promise<MediaAsset | null> {
    return new Promise((resolve) => {
      const query = new URLSearchParams({ filename: file.name })
      if (folder) query.set('folder', folder)

      const request = new XMLHttpRequest()
      request.open('POST', `${config.public.coreApiUrl}/api/v1/content/media?${query.toString()}`)
      // The session lives in an httpOnly cookie; it is never readable here.
      request.withCredentials = true
      if (tenantId.value) request.setRequestHeader('x-tenant-id', tenantId.value)

      item.status = 'uploading'

      request.upload.addEventListener('progress', (event) => {
        item.progress = event.lengthComputable ? event.loaded / event.total : 0
      })

      request.addEventListener('load', () => {
        let envelope: { success?: boolean; data?: { asset: MediaAsset; sanitised: string[] }; error?: { message: string } } = {}
        try {
          envelope = JSON.parse(request.responseText)
        } catch {
          envelope = {}
        }

        if (request.status >= 200 && request.status < 300 && envelope.success && envelope.data) {
          item.status = 'done'
          item.progress = 1
          item.asset = envelope.data.asset
          item.sanitised = envelope.data.sanitised ?? []
          resolve(envelope.data.asset)
          return
        }

        item.status = 'failed'
        item.error = envelope.error?.message ?? `Upload failed (${request.status}).`
        resolve(null)
      })

      request.addEventListener('error', () => {
        item.status = 'failed'
        item.error = 'Could not reach the platform API.'
        resolve(null)
      })

      request.addEventListener('abort', () => {
        item.status = 'failed'
        item.error = 'Upload cancelled.'
        resolve(null)
      })

      // No explicit content-type: the browser sets it from the File, which is
      // the *claim* the API then checks against the actual bytes.
      request.send(file)
    })
  }

  /**
   * Queue a batch. Resolves once every file has finished, with only the ones
   * that succeeded — the failures stay visible in `items`.
   */
  async function upload(files: File[], options: { folder?: string } = {}): Promise<MediaAsset[]> {
    const queued = files.map((file) => {
      const item: UploadItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        sizeBytes: file.size,
        progress: 0,
        status: 'pending',
        error: '',
        asset: null,
        sanitised: [],
      }
      return { item, file }
    })

    items.value = [...items.value, ...queued.map((entry) => entry.item)]

    const uploaded: MediaAsset[] = []
    let cursor = 0

    async function worker() {
      for (;;) {
        const next = queued[cursor++]
        if (!next) return
        const asset = await sendOne(next.item, next.file, options.folder ?? '')
        if (asset) uploaded.push(asset)
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queued.length) }, worker))
    return uploaded
  }

  /** Drop everything that finished cleanly, keeping failures on screen. */
  function clearFinished() {
    items.value = items.value.filter((item) => item.status !== 'done')
  }

  function dismiss(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  return { items, busy, failed, upload, clearFinished, dismiss }
}
