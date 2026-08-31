-- 005 (#34): skuggloggen får landskod. Sverige = 'SE' för allt gammalt.
ALTER TABLE public.shadow_log ADD COLUMN IF NOT EXISTS land text NOT NULL DEFAULT 'SE';
CREATE INDEX IF NOT EXISTS shadow_log_land_run_idx ON public.shadow_log (land, run_at DESC);
