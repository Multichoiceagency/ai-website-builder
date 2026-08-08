-- ===========================================================================
-- 0023 — Scroll-scrub frame packs for media library videos.
--
-- After upload, core-api extracts a capped WebP sequence (see lib/media/frames.ts)
-- so storefront sections can paint frames from scroll progress without seeking
-- the source MP4 on every frame.
-- ===========================================================================

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS frame_status text NOT NULL DEFAULT 'none'
    CHECK (frame_status IN ('none', 'pending', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS frame_count integer NOT NULL DEFAULT 0
    CHECK (frame_count >= 0),
  ADD COLUMN IF NOT EXISTS frame_fps real NOT NULL DEFAULT 0
    CHECK (frame_fps >= 0),
  ADD COLUMN IF NOT EXISTS frame_width integer NOT NULL DEFAULT 0
    CHECK (frame_width >= 0),
  ADD COLUMN IF NOT EXISTS frame_error text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS media_assets_frame_pending_idx
  ON media_assets (tenant_id, created_at DESC)
  WHERE frame_status = 'pending';

-- Public locator also returns frame metadata so the unauthenticated frame
-- route can validate index without a second SECURITY DEFINER function.
DROP FUNCTION IF EXISTS resolve_public_media(uuid);

CREATE OR REPLACE FUNCTION resolve_public_media(p_media_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  storage_key text,
  mime text,
  size_bytes bigint,
  filename text,
  frame_status text,
  frame_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.tenant_id,
    m.storage_key,
    m.mime,
    m.size_bytes,
    m.filename,
    m.frame_status,
    m.frame_count
  FROM media_assets m
  WHERE m.id = p_media_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION resolve_public_media(uuid) FROM PUBLIC;

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION resolve_public_media(uuid) TO %I', app_role);
END
$$;
