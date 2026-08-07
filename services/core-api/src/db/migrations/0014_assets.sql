-- ===========================================================================
-- 0014 — Reusable assets: saved compositions that can be dropped into any page.
--
-- An asset is *data*, never code (ADR-0003): `sections` holds an ordered array
-- of `{ block, props, motion? }` where every `block` already exists in the
-- registry. Storing one adds no renderer and executes nothing new, which is why
-- a plain JSONB column is the whole storage story.
--
-- Only workspace assets live here. Platform presets ship as a generated,
-- committed catalogue in `packages/assets` — putting them in a table would
-- make a shipped, reviewed artefact editable at runtime for no benefit.
--
-- `fingerprint` is a hash of the arrangement with section ids stripped. It is
-- deliberately NOT a unique constraint: saving the same layout twice is a
-- mistake worth *surfacing*, not a write worth rejecting — the user may well
-- have a reason, and a 409 on "Save as asset" would be an odd way to find out.
-- ===========================================================================

CREATE TABLE assets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text NOT NULL DEFAULT '',
  collection         text NOT NULL DEFAULT 'utility'
                       CHECK (collection IN ('hero', 'features', 'proof', 'pricing', 'conversion',
                                             'content', 'navigation', 'footer', 'utility')),
  tags               text[] NOT NULL DEFAULT '{}',
  sections           jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Derived from the heaviest block the composition contains, recomputed on
  -- every write. Stored so the panel can filter without parsing every document.
  performance_class  text NOT NULL DEFAULT 'A' CHECK (performance_class IN ('A', 'B', 'C', 'D')),
  thumbnail          text NOT NULL DEFAULT '',
  -- A workspace asset is an arrangement of our own registry blocks, so it is
  -- ours. The column exists because the *shape* is shared with platform
  -- presets, which do carry a third-party licence.
  --
  -- This list is narrower than `ASSET_LICENCES` in the schema, and deliberately
  -- so: it enumerates what a *row here* may hold, not every value the type can
  -- express. The refusal values never reach this table — `proprietary` is
  -- omitted entirely, and `unknown` only survives as a tripwire — because an
  -- asset that fails the licence gate is rejected by the importer long before
  -- storage, and no write path in the API can produce one.
  licence            text NOT NULL DEFAULT 'platform-owned'
                       CHECK (licence IN ('platform-owned', 'mit', 'apache-2.0', 'bsd-3-clause', 'cc0', 'unknown')),
  attribution        text NOT NULL DEFAULT '',
  source             jsonb NOT NULL DEFAULT '{}'::jsonb,
  fingerprint        text NOT NULL DEFAULT '',
  created_by         text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- One name per workspace: the panel lists assets by name, and two identically
  -- named assets are indistinguishable there.
  UNIQUE (tenant_id, name)
);

CREATE INDEX assets_tenant_idx ON assets (tenant_id, created_at DESC);
CREATE INDEX assets_tenant_collection_idx ON assets (tenant_id, collection);
CREATE INDEX assets_tenant_fingerprint_idx ON assets (tenant_id, fingerprint);

CREATE TRIGGER assets_set_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security (ADR-0004)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['assets']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      target || '_tenant_isolation',
      target
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Privileges for the runtime role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON assets TO %I', app_role);
END
$$;
