-- Dashboard personalisation on white_label_settings (logo, fonts, surfaces).
-- Available to every plan for chrome branding; custom domain / hide-platform stay Advanced+.

ALTER TABLE white_label_settings
  ADD COLUMN IF NOT EXISTS color_surface      text NOT NULL DEFAULT '#fafaf9',
  ADD COLUMN IF NOT EXISTS color_surface_alt  text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS color_text         text NOT NULL DEFAULT '#18181b',
  ADD COLUMN IF NOT EXISTS font_heading       text NOT NULL DEFAULT 'Figtree',
  ADD COLUMN IF NOT EXISTS font_body          text NOT NULL DEFAULT 'Rubik';
