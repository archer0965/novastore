-- Site visit / pageview tracking for admin ops dashboard

CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL DEFAULT '/',
  visitor_key TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS site_visits_created_at_idx
  ON public.site_visits (created_at DESC);

CREATE INDEX IF NOT EXISTS site_visits_visitor_created_idx
  ON public.site_visits (visitor_key, created_at DESC);

COMMENT ON TABLE public.site_visits IS '公開頁面造訪紀錄（pageview），供管理者後台統計';

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (admin API) reads/writes

NOTIFY pgrst, 'reload schema';
