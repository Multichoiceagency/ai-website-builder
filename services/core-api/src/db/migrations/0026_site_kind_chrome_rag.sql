-- Site categorization (website vs ecommerce), chrome page roles, pgvector knowledge.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'website'
    CHECK (kind IN ('website', 'ecommerce'));

CREATE INDEX IF NOT EXISTS sites_tenant_kind_idx ON sites (tenant_id, kind);

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'page'
    CHECK (role IN ('page', 'header', 'footer'));

CREATE INDEX IF NOT EXISTS pages_site_role_idx ON pages (tenant_id, site_id, role)
  WHERE role IN ('header', 'footer');

-- Unique chrome docs per site (one header, one footer).
CREATE UNIQUE INDEX IF NOT EXISTS pages_one_chrome_per_site
  ON pages (tenant_id, site_id, role)
  WHERE role IN ('header', 'footer');

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE,
  source        text NOT NULL,
  source_path   text NOT NULL DEFAULT '',
  title         text NOT NULL DEFAULT '',
  content       text NOT NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  embedding     vector(768),
  embedding_model text NOT NULL DEFAULT 'lexical-v1',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_chunks_tenant_idx
  ON ai_knowledge_chunks (tenant_id);
CREATE INDEX IF NOT EXISTS ai_knowledge_chunks_source_idx
  ON ai_knowledge_chunks (source);

ALTER TABLE ai_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Platform rows (tenant_id IS NULL) are readable by every tenant; writes to
-- tenant-scoped rows still go through current_tenant_id().
CREATE POLICY ai_knowledge_chunks_select ON ai_knowledge_chunks
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id());

CREATE POLICY ai_knowledge_chunks_write ON ai_knowledge_chunks
  FOR ALL
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = current_tenant_id());

DO $$
BEGIN
  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ai_knowledge_chunks TO %I',
    current_setting('platform.app_role', true)
  );
END
$$;
