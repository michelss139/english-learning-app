-- CORE lexicon senses (A1–B1) for admin cleanup / enrichment: GET /api/admin/lexicon/core-senses

begin;

create or replace function public.admin_core_senses()
returns table (
  sense_id uuid,
  lemma text,
  pos text,
  definition_en text,
  translation_pl text,
  cefr_level text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    e.lemma,
    e.pos,
    s.definition_en,
    t.translation_pl,
    s.cefr_level
  from lexicon_senses s
  inner join lexicon_entries e on e.id = s.entry_id
  left join lateral (
    select lt.translation_pl
    from lexicon_translations lt
    where lt.sense_id = s.id
    order by lt.created_at asc nulls last, lt.id asc
    limit 1
  ) t on true
  where s.cefr_level in ('A1', 'A2', 'B1')
    and s.definition_en is not null
    and length(trim(s.definition_en)) > 0
    and e.lemma is not null
    and length(trim(e.lemma)) > 0
  order by
    case s.cefr_level
      when 'A1' then 1
      when 'A2' then 2
      when 'B1' then 3
      else 4
    end,
    e.lemma asc,
    s.sense_order asc
  limit 500;
$$;

revoke all on function public.admin_core_senses() from public;
grant execute on function public.admin_core_senses() to service_role;

commit;
