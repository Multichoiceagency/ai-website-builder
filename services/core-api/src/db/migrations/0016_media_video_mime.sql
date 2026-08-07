-- Align media_assets.mime with MEDIA_MIME_TYPES in @platform/schemas.
-- Video was allowed in prepareUpload / sniff / content routes but never in the
-- table CHECK, so every MP4 / WebM insert failed with media_assets_mime_check.

ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_mime_check;

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_mime_check
  CHECK (mime IN (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm'
  ));
