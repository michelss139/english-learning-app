-- Migration: Remove 'dare' from irregular verbs
-- Date: 2026-03-19
-- 'dare' is a semi-modal/auxiliary verb; its past forms (dared/durst) are archaic.
-- We exclude it from the irregular verbs list for clarity.

delete from irregular_verbs where base_norm = 'dare';
