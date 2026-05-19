ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS meta_pixel_id   TEXT,
  ADD COLUMN IF NOT EXISTS google_analytics_id TEXT;
