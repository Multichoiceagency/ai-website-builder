-- Site-level UX component assignments (ADR-0003: block id + props only).
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS component_targets jsonb NOT NULL DEFAULT '{}'::jsonb;
