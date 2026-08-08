/**
 * Ops helper: re-extract scroll frames for one media id.
 * Usage: pnpm exec tsx --env-file=../../.env --env-file-if-exists=../../.env.local scripts/rebuild-frames.ts <mediaId>
 */
import postgres from 'postgres'
import { processVideoFrames } from '../src/lib/media/frames.js'

async function main() {
  const mediaId = process.argv[2]
  if (!mediaId) throw new Error('usage: rebuild-frames.ts <mediaId>')

  const sql = postgres({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'platform',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
  })

  const [row] = await sql`
    SELECT tenant_id::text AS tenant_id, frame_status, frame_count
    FROM media_assets WHERE id = ${mediaId}
  `
  if (!row) throw new Error('asset not found')
  console.log('before', row)

  const asset = await processVideoFrames(String(row.tenant_id), mediaId)
  console.log('after', {
    status: asset?.frameStatus,
    count: asset?.frameCount,
    fps: asset?.frameFps,
    width: asset?.frameWidth,
    error: asset?.frameError,
  })

  await sql.end({ timeout: 5 })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
