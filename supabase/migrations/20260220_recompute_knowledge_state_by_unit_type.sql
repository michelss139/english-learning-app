-- Migration: Recompute user_learning_unit_knowledge with unit-type-specific model
-- Date: 2026-02-20
--
-- sense      -> trend model (answer-based)
-- cluster    -> session/accuracy model (history approximation from aggregated counts)
-- irregular  -> session/accuracy model (history approximation from aggregated counts)
--
-- NOTE:
-- For session-mode backfill we only have aggregated totals in this table,
-- so "previous_accuracy" cannot be reconstructed exactly per session timeline.
-- This CASE follows the deterministic session model using available aggregate data.

begin;

update public.user_learning_unit_knowledge
set
  stability_score = (coalesce(correct_count, 0) * 2) - (coalesce(wrong_count, 0) * 3),
  knowledge_state = case
    -- sense: trend model
    when unit_type = 'sense' then
      case
        when coalesce(total_attempts, 0) = 1 and coalesce(correct_count, 0) >= 1 then 'mastered'
        when coalesce(total_attempts, 0) = 1 and coalesce(correct_count, 0) < 1 then 'unstable'
        when last_wrong_at is not null and (last_correct_at is null or last_wrong_at > last_correct_at) then 'unstable'
        when last_correct_at is not null and (last_wrong_at is null or last_correct_at > last_wrong_at) then
          case
            when (coalesce(correct_count, 0) - coalesce(wrong_count, 0)) >= 1 then 'mastered'
            else 'improving'
          end
        else 'unstable'
      end

    -- cluster/irregular: session/accuracy model
    when unit_type in ('cluster', 'irregular') then
      case
        when coalesce(total_attempts, 0) <= 0 then 'unstable'
        when coalesce(total_attempts, 0) = 1 then
          case
            when (coalesce(correct_count, 0)::double precision / nullif((coalesce(correct_count, 0) + coalesce(wrong_count, 0))::double precision, 0.0)) = 1.0 then 'mastered'
            when (coalesce(correct_count, 0)::double precision / nullif((coalesce(correct_count, 0) + coalesce(wrong_count, 0))::double precision, 0.0)) >= 0.7 then 'improving'
            else 'unstable'
          end
        else
          case
            when (coalesce(correct_count, 0)::double precision / nullif((coalesce(correct_count, 0) + coalesce(wrong_count, 0))::double precision, 0.0)) = 1.0 then 'mastered'
            else 'improving'
          end
      end

    else 'unstable'
  end,
  updated_at = now();

commit;
