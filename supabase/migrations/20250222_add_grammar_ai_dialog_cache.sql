-- Migration: Add grammar_ai_dialog_cache table for caching AI-generated dialogs
-- Created: 2025-02-22

-- Table: grammar_ai_dialog_cache
-- Purpose: Cache AI-generated dialogs for grammar tense comparisons
-- Key format: "present-simple__present-perfect__v1"

CREATE TABLE IF NOT EXISTS grammar_ai_dialog_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_grammar_ai_dialog_cache_key ON grammar_ai_dialog_cache(key);
CREATE INDEX IF NOT EXISTS idx_grammar_ai_dialog_cache_created_at ON grammar_ai_dialog_cache(created_at);

-- RLS Policies
ALTER TABLE grammar_ai_dialog_cache ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can SELECT (read cache)
CREATE POLICY "grammar_ai_dialog_cache_select_authenticated"
  ON grammar_ai_dialog_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can INSERT/UPDATE (backend only)
-- Note: INSERT/UPDATE will be done via service role in API routes
-- No policy needed for authenticated users (they can't insert/update)

-- Comments
COMMENT ON TABLE grammar_ai_dialog_cache IS 'Cache for AI-generated grammar tense comparison dialogs';
COMMENT ON COLUMN grammar_ai_dialog_cache.key IS 'Unique cache key, e.g., "present-simple__present-perfect__v1"';
COMMENT ON COLUMN grammar_ai_dialog_cache.content IS 'Cached AI-generated dialog content (text)';
COMMENT ON COLUMN grammar_ai_dialog_cache.created_at IS 'When the cache entry was first created';
COMMENT ON COLUMN grammar_ai_dialog_cache.updated_at IS 'When the cache entry was last updated';
