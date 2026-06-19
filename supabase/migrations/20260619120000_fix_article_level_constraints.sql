-- Fix article_glossary and article_conversation_questions level constraints
-- to allow all CEFR levels (A1-C2) instead of only odd ones (A1, B1, C1)

ALTER TABLE article_glossary
  DROP CONSTRAINT IF EXISTS article_glossary_level_check;

ALTER TABLE article_glossary
  ADD CONSTRAINT article_glossary_level_check
  CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

ALTER TABLE article_conversation_questions
  DROP CONSTRAINT IF EXISTS article_conversation_questions_level_check;

ALTER TABLE article_conversation_questions
  ADD CONSTRAINT article_conversation_questions_level_check
  CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
