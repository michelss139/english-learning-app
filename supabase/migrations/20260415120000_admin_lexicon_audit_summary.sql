-- Admin-only RPC: lexicon audit summary for GET /api/admin/lexicon/audit-summary
-- Execute with service role from backend after admin JWT check.

begin;

create or replace function public.admin_lexicon_audit_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_entries', (select count(*)::bigint from lexicon_entries),
    'total_senses', (select count(*)::bigint from lexicon_senses),
    'entries_without_senses',
      (select count(*)::bigint from lexicon_entries e
       where not exists (select 1 from lexicon_senses s where s.entry_id = e.id)),
    'senses_without_translation',
      (select count(*)::bigint from lexicon_senses ls
       where not exists (select 1 from lexicon_translations t where t.sense_id = ls.id)),
    'senses_without_examples',
      (select count(*)::bigint from lexicon_senses ls
       where not exists (select 1 from lexicon_examples ex where ex.sense_id = ls.id)),
    'senses_without_patterns',
      (select count(*)::bigint from lexicon_senses ls
       where not exists (select 1 from lexicon_patterns p where p.sense_id = ls.id)),
    'top_pos_distribution',
      (select jsonb_build_object(
        'noun',
          count(*) filter (
            where coalesce(lower(trim(pos)), '') in ('noun', 'nouns')
          )::bigint,
        'verb',
          count(*) filter (
            where coalesce(lower(trim(pos)), '') in ('verb', 'verbs')
          )::bigint,
        'adjective',
          count(*) filter (
            where coalesce(lower(trim(pos)), '') in ('adjective', 'adjectives', 'adj')
          )::bigint,
        'other',
          count(*) filter (
            where coalesce(lower(trim(pos)), '') not in (
              'noun', 'nouns',
              'verb', 'verbs',
              'adjective', 'adjectives', 'adj'
            )
          )::bigint
      )
      from lexicon_entries),
    'top_lemmas_by_sense_count',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'lemma', sub.lemma,
              'pos', sub.pos,
              'sense_count', sub.sense_count
            )
            order by sub.sense_count desc
          )
          from (
            select e.lemma, e.pos, count(s.id)::int as sense_count
            from lexicon_entries e
            join lexicon_senses s on s.entry_id = e.id
            group by e.id, e.lemma, e.pos
            order by sense_count desc
            limit 20
          ) sub
        ),
        '[]'::jsonb
      ),
    'random_lemmas',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'lemma', r.lemma,
              'lemma_norm', r.lemma_norm,
              'pos', r.pos
            )
          )
          from (
            select lemma, lemma_norm, pos
            from lexicon_entries
            order by random()
            limit 20
          ) r
        ),
        '[]'::jsonb
      )
  );
$$;

revoke all on function public.admin_lexicon_audit_summary() from public;
grant execute on function public.admin_lexicon_audit_summary() to service_role;

commit;
