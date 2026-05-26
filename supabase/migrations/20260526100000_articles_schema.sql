-- Migration: Articles section schema
-- Date: 2026-05-26

begin;

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.article_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('A1', 'B1', 'C1')),
  body_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, level)
);

CREATE TABLE IF NOT EXISTS public.article_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('A1', 'B1', 'C1')),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.article_conversation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('A1', 'B1', 'C1')),
  question TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(is_published);
CREATE INDEX IF NOT EXISTS idx_article_levels_article_id ON public.article_levels(article_id);
CREATE INDEX IF NOT EXISTS idx_article_glossary_article_id ON public.article_glossary(article_id);
CREATE INDEX IF NOT EXISTS idx_article_questions_article_id ON public.article_conversation_questions(article_id);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_conversation_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_select_authenticated"
  ON public.articles FOR SELECT TO authenticated USING (true);

CREATE POLICY "article_levels_select_authenticated"
  ON public.article_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "article_glossary_select_authenticated"
  ON public.article_glossary FOR SELECT TO authenticated USING (true);

CREATE POLICY "article_questions_select_authenticated"
  ON public.article_conversation_questions FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.articles IS 'Educational articles with multiple CEFR level versions';
COMMENT ON TABLE public.article_levels IS 'Level-specific body text for each article (A1/B1/C1)';
COMMENT ON TABLE public.article_glossary IS 'Vocabulary glossary entries per article and level';
COMMENT ON TABLE public.article_conversation_questions IS 'Discussion questions per article and level';

commit;
