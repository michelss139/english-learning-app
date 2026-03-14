-- Migration: Refactor clusters content and mastery model
-- Date: 2026-03-06
-- Goal: Extend the existing clusters module with theory, patterns, examples,
--       additional task types, and multi-day mastery while preserving
--       current routes, unlock logic, and answer logging.

begin;

alter table public.vocab_clusters
  add column if not exists theory_md text,
  add column if not exists theory_summary text,
  add column if not exists learning_goal text,
  add column if not exists display_order integer not null default 0;

create table if not exists public.vocab_cluster_patterns (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.vocab_clusters(id) on delete cascade,
  title text not null,
  pattern_en text not null,
  pattern_pl text,
  usage_note text,
  contrast_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vocab_cluster_patterns_unique unique (cluster_id, title, pattern_en)
);

create index if not exists idx_vocab_cluster_patterns_cluster_id
  on public.vocab_cluster_patterns(cluster_id, sort_order);

create table if not exists public.vocab_cluster_examples (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.vocab_clusters(id) on delete cascade,
  example_en text not null,
  example_pl text,
  focus_term text,
  note text,
  source text not null default 'manual',
  difficulty text,
  last_used_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vocab_cluster_examples_unique unique (cluster_id, example_en)
);

create index if not exists idx_vocab_cluster_examples_cluster_id
  on public.vocab_cluster_examples(cluster_id, sort_order, last_used_at);

alter table public.vocab_cluster_patterns enable row level security;
alter table public.vocab_cluster_examples enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_cluster_patterns' and policyname = 'Vocab cluster patterns: authenticated select'
  ) then
    create policy "Vocab cluster patterns: authenticated select"
      on public.vocab_cluster_patterns
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_cluster_patterns' and policyname = 'Vocab cluster patterns: admin manage all'
  ) then
    create policy "Vocab cluster patterns: admin manage all"
      on public.vocab_cluster_patterns
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_cluster_examples' and policyname = 'Vocab cluster examples: authenticated select'
  ) then
    create policy "Vocab cluster examples: authenticated select"
      on public.vocab_cluster_examples
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocab_cluster_examples' and policyname = 'Vocab cluster examples: admin manage all'
  ) then
    create policy "Vocab cluster examples: admin manage all"
      on public.vocab_cluster_examples
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

alter table public.vocab_cluster_questions
  add column if not exists task_type text not null default 'choice',
  add column if not exists instruction text,
  add column if not exists source_text text,
  add column if not exists expected_answer text,
  add column if not exists accepted_answers text[],
  add column if not exists example_id uuid references public.vocab_cluster_examples(id) on delete set null,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

alter table public.vocab_cluster_questions
  drop constraint if exists vocab_cluster_questions_task_type_check;

alter table public.vocab_cluster_questions
  add constraint vocab_cluster_questions_task_type_check
  check (task_type in ('choice', 'correction', 'translation'));

alter table public.vocab_answer_events
  drop constraint if exists vocab_answer_events_question_mode_check;

alter table public.vocab_answer_events
  add constraint vocab_answer_events_question_mode_check
  check (question_mode in ('en-pl', 'pl-en', 'cluster-choice', 'cluster-correction', 'cluster-translation'));

update public.vocab_cluster_questions
set task_type = coalesce(task_type, 'choice'),
    sort_order = case when coalesce(sort_order, 0) = 0 then 10 else sort_order end,
    is_active = coalesce(is_active, true)
where true;

update public.vocab_clusters
set theory_summary = case slug
    when 'make-do' then 'Use make for creating or producing things, and do for tasks, work, and routines.'
    when 'get-take' then 'Use take for deliberate movement, transport, and time; use get for receiving, becoming, or arriving.'
    when 'say-tell-speak-talk' then 'Choose the verb by structure and context: tell someone, say something, speak formally, talk interactively.'
    when 'lend-borrow-rent-hire' then 'Pick the verb by direction: lend outward, borrow inward, rent or hire for paid temporary use.'
    when 'bring-take' then 'Use bring toward the speaker or destination focus, and take away from the speaker or current location.'
    when 'tenses' then 'This cluster focuses on common grammar mistakes with tense and auxiliary patterns.'
    else theory_summary
  end,
  learning_goal = case slug
    when 'make-do' then 'Distinguish creating results from doing tasks and routines.'
    when 'get-take' then 'Recognize when English needs take for time and transport, not get.'
    when 'say-tell-speak-talk' then 'Choose the correct reporting or speaking verb based on grammar pattern and situation.'
    when 'lend-borrow-rent-hire' then 'Track direction and paid use accurately in common exchange situations.'
    when 'bring-take' then 'Choose movement verbs based on speaker perspective and destination.'
    when 'tenses' then 'Notice and correct high-frequency form mistakes in short grammar patterns.'
    else learning_goal
  end,
  theory_md = case slug
    when 'make-do' then E'- make + food, plans, decisions, mistakes\n- do + work, homework, chores, exercise\n- Ask: are you creating a result or performing a task?'
    when 'get-take' then E'- take + time, bus, train, medicine, photo\n- get + message, chance, better, home\n- If English focuses on duration or transport, take is often the safe choice.'
    when 'say-tell-speak-talk' then E'- say + words or sentence content\n- tell + person + information\n- speak = language / formal speaking\n- talk = conversation / interaction'
    when 'lend-borrow-rent-hire' then E'- lend: give temporarily\n- borrow: receive temporarily\n- rent: pay to use property / room / car\n- hire: pay for service, person, or sometimes vehicle'
    when 'bring-take' then E'- bring = movement toward here / the listener / destination focus\n- take = movement away from here / from the speaker\n- Always imagine the viewpoint first.'
    when 'tenses' then E'- after does / did use the base verb\n- watch for extra -s and wrong auxiliary combinations\n- correction tasks here focus on short, high-frequency tense mistakes'
    else theory_md
  end,
  display_order = case slug
    when 'make-do' then 10
    when 'get-take' then 20
    when 'say-tell-speak-talk' then 30
    when 'lend-borrow-rent-hire' then 40
    when 'bring-take' then 50
    when 'tenses' then 60
    else display_order
  end
where slug in ('make-do', 'get-take', 'say-tell-speak-talk', 'lend-borrow-rent-hire', 'bring-take', 'tenses');

insert into public.vocab_cluster_patterns (cluster_id, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
select c.id, x.title, x.pattern_en, x.pattern_pl, x.usage_note, x.contrast_note, x.sort_order
from public.vocab_clusters c
join (
  values
    ('make-do', 'create vs perform', 'make breakfast / make a plan / make a mistake', 'zrobić śniadanie / zrobić plan / popełnić błąd', 'Use make when a result is created.', 'Do is usually wrong for created results.', 10),
    ('make-do', 'tasks and routines', 'do homework / do housework / do exercise', 'odrabiać pracę domową / wykonywać obowiązki / ćwiczyć', 'Use do for work, tasks, and repeated activities.', 'Make homework is a classic learner error.', 20),
    ('get-take', 'time pattern', 'It takes me 20 minutes.', 'Zajmuje mi to 20 minut.', 'Use take for duration with it + takes.', 'Get is not used for duration in this pattern.', 10),
    ('get-take', 'movement and transport', 'take a bus / take a taxi / take medicine', 'jechać autobusem / wziąć taksówkę / wziąć lekarstwo', 'Take is common for transport and deliberate actions.', 'Get often means receive or arrive, not choose transport.', 20),
    ('say-tell-speak-talk', 'content vs listener', 'say something / tell somebody something', 'powiedzieć coś / powiedzieć komuś coś', 'Tell normally needs a person after it.', 'Say me is wrong; tell me is correct.', 10),
    ('say-tell-speak-talk', 'formal vs interactive', 'speak English / talk to a friend', 'mówić po angielsku / rozmawiać z przyjacielem', 'Speak is often formal or language-related; talk is conversational.', 'On the phone we usually say talk, not say.', 20),
    ('lend-borrow-rent-hire', 'direction of movement', 'lend someone something / borrow something from someone', 'pożyczyć komuś / pożyczyć od kogoś', 'Decide whether the item moves out or in.', 'Borrow your pen? means receive it, not give it.', 10),
    ('lend-borrow-rent-hire', 'paid temporary use', 'rent a room / hire a driver', 'wynająć pokój / wynająć kierowcę', 'Rent is common for property and longish use; hire often for people/services.', 'The border can vary by region, but the direction logic stays useful.', 20),
    ('bring-take', 'speaker perspective', 'bring it here / take it there', 'przynieś to tutaj / zanieś to tam', 'Imagine the point of view before choosing the verb.', 'The same real movement can be described differently from another viewpoint.', 10),
    ('bring-take', 'destination focus', 'Can you bring dessert to dinner?', 'Czy możesz przynieść deser na kolację?', 'Bring fits when the destination is where speaker/listener will be.', 'Take is used when something leaves the current place.', 20),
    ('tenses', 'after auxiliary', 'Does she work? / Did they go?', 'Czy ona pracuje? / Czy oni poszli?', 'After does and did, use the base form.', 'Extra -s or past endings after auxiliaries are wrong.', 10),
    ('tenses', 'short correction habit', 'She does not likes coffee. -> She does not like coffee.', 'krótka korekta formy', 'Check auxiliary + base form first.', 'This cluster trains error detection more than vocabulary choice.', 20)
) as x(slug, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
  on x.slug = c.slug
where not exists (
  select 1
  from public.vocab_cluster_patterns p
  where p.cluster_id = c.id and p.title = x.title and p.pattern_en = x.pattern_en
);

insert into public.vocab_cluster_examples (cluster_id, example_en, example_pl, focus_term, note, source, difficulty, sort_order)
select c.id, x.example_en, x.example_pl, x.focus_term, x.note, 'manual', x.difficulty, x.sort_order
from public.vocab_clusters c
join (
  values
    ('make-do', 'We need to make a plan before the meeting.', 'Musimy zrobić plan przed spotkaniem.', 'make', 'result', 'A2', 10),
    ('make-do', 'I do my homework after dinner every day.', 'Codziennie odrabiam pracę domową po kolacji.', 'do', 'routine', 'A2', 20),
    ('get-take', 'It took her three months to finish the project.', 'Zajęło jej trzy miesiące, żeby skończyć projekt.', 'took', 'duration', 'B1', 10),
    ('get-take', 'I took the bus because it was raining.', 'Pojechałem autobusem, bo padało.', 'took', 'transport', 'A2', 20),
    ('say-tell-speak-talk', 'She told me the answer, but she did not say why.', 'Powiedziała mi odpowiedź, ale nie powiedziała dlaczego.', 'told / say', 'structure contrast', 'B1', 10),
    ('say-tell-speak-talk', 'We talked on the phone for almost an hour.', 'Rozmawialiśmy przez telefon prawie godzinę.', 'talked', 'natural collocation', 'A2', 20),
    ('lend-borrow-rent-hire', 'Can I borrow your charger for a minute?', 'Czy mogę pożyczyć twoją ładowarkę na chwilę?', 'borrow', 'direction in', 'A2', 10),
    ('lend-borrow-rent-hire', 'They rented a flat near the beach for July.', 'Wynajęli mieszkanie blisko plaży na lipiec.', 'rented', 'paid use', 'B1', 20),
    ('bring-take', 'Please bring your notes to class tomorrow.', 'Przynieś jutro swoje notatki na zajęcia.', 'bring', 'toward destination', 'A2', 10),
    ('bring-take', 'I will take these boxes to the office later.', 'Zaniosę te pudełka później do biura.', 'take', 'away from here', 'A2', 20),
    ('tenses', 'Does she work on Saturdays?', 'Czy ona pracuje w soboty?', 'work', 'base form after does', 'A2', 10),
    ('tenses', 'He did not go to school yesterday.', 'On nie poszedł wczoraj do szkoły.', 'go', 'base form after did not', 'A2', 20)
) as x(slug, example_en, example_pl, focus_term, note, difficulty, sort_order)
  on x.slug = c.slug
where not exists (
  select 1
  from public.vocab_cluster_examples e
  where e.cluster_id = c.id and e.example_en = x.example_en
);

insert into public.vocab_cluster_questions (
  cluster_id,
  prompt,
  slot,
  correct_entry_id,
  correct_choice,
  choices,
  explanation,
  task_type,
  instruction,
  source_text,
  expected_answer,
  accepted_answers,
  example_id,
  sort_order,
  is_active
)
select
  c.id,
  x.prompt,
  x.slot,
  vce.id,
  x.expected_answer,
  case
    when x.task_type = 'choice' then x.choices
    else array[x.expected_answer, '__text__']::text[]
  end,
  x.explanation,
  x.task_type,
  x.instruction,
  x.source_text,
  x.expected_answer,
  x.accepted_answers,
  ex.id,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I do breakfast before school.', 'I make breakfast before school.', ARRAY['I make breakfast before school.']::text[], ARRAY['__text__','__text__']::text[], 'make', 'Use make for creating breakfast, not do.', 20, 'Popraw zdanie tak, aby użyć właściwego słowa.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Muszę odrobić pracę domową dziś wieczorem.', 'I need to do my homework this evening.', ARRAY['I need to do my homework this evening.','I need to do my homework tonight.']::text[], ARRAY['__text__','__text__']::text[], 'do', 'Homework goes with do.', 30, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('get-take', 'Popraw zdanie', 'correction', 'correction', 'It got me two hours to finish.', 'It took me two hours to finish.', ARRAY['It took me two hours to finish.']::text[], ARRAY['__text__','__text__']::text[], 'take', 'Use take with time duration.', 20, 'Popraw zdanie tak, aby użyć właściwego słowa.'),
    ('get-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Wziąłem autobus do pracy.', 'I took the bus to work.', ARRAY['I took the bus to work.']::text[], ARRAY['__text__','__text__']::text[], 'take', 'Transport usually takes take in this pattern.', 30, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('say-tell-speak-talk', 'Popraw zdanie', 'correction', 'correction', 'She said me the truth.', 'She told me the truth.', ARRAY['She told me the truth.']::text[], ARRAY['__text__','__text__']::text[], 'tell', 'Tell normally needs a person after it.', 20, 'Popraw zdanie tak, aby użyć właściwego słowa.'),
    ('say-tell-speak-talk', 'Przetłumacz zdanie', 'translation', 'translation', 'Rozmawialiśmy przez telefon przez godzinę.', 'We talked on the phone for an hour.', ARRAY['We talked on the phone for an hour.']::text[], ARRAY['__text__','__text__']::text[], 'talk', 'Talk on the phone is the natural collocation here.', 30, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('lend-borrow-rent-hire', 'Popraw zdanie', 'correction', 'correction', 'Can I lend your pen for a minute?', 'Can I borrow your pen for a minute?', ARRAY['Can I borrow your pen for a minute?']::text[], ARRAY['__text__','__text__']::text[], 'borrow', 'Borrow means receive temporarily.', 20, 'Popraw zdanie tak, aby użyć właściwego słowa.'),
    ('lend-borrow-rent-hire', 'Przetłumacz zdanie', 'translation', 'translation', 'Musimy wynająć samochód na weekend.', 'We need to rent a car for the weekend.', ARRAY['We need to rent a car for the weekend.']::text[], ARRAY['__text__','__text__']::text[], 'rent', 'Rent is the best neutral choice for a car here.', 30, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Popraw zdanie', 'correction', 'correction', 'Please bring this document to the office tomorrow morning.', 'Please take this document to the office tomorrow morning.', ARRAY['Please take this document to the office tomorrow morning.']::text[], ARRAY['__text__','__text__']::text[], 'take', 'The document moves away from the current place.', 20, 'Popraw zdanie tak, aby użyć właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Czy możesz przynieść deser na kolację?', 'Can you bring dessert to dinner?', ARRAY['Can you bring dessert to dinner?']::text[], ARRAY['__text__','__text__']::text[], 'bring', 'Bring matches the destination where speaker and listener meet.', 30, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('tenses', 'Popraw zdanie', 'grammar', 'correction', 'Does she works on Saturdays?', 'Does she work on Saturdays?', ARRAY['Does she work on Saturdays?']::text[], ARRAY['__text__','__text__']::text[], null, 'After does, use the base verb.', 20, 'Popraw błąd gramatyczny.'),
    ('tenses', 'Przetłumacz zdanie', 'grammar', 'translation', 'Czy ona pracuje w soboty?', 'Does she work on Saturdays?', ARRAY['Does she work on Saturdays?']::text[], ARRAY['__text__','__text__']::text[], null, 'Use does + base form in the question.', 30, 'Przetłumacz na angielski poprawnym wzorcem gramatycznym.')
) as x(
  slug,
  prompt,
  slot,
  task_type,
  source_text,
  expected_answer,
  accepted_answers,
  choices,
  target_lemma,
  explanation,
  sort_order,
  instruction
)
  on x.slug = c.slug
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
left join public.lexicon_entries le
  on le.id = vce.entry_id
left join public.vocab_cluster_examples ex
  on ex.cluster_id = c.id and ex.example_en = x.expected_answer
where (x.target_lemma is null or le.lemma_norm = x.target_lemma)
  and not exists (
    select 1
    from public.vocab_cluster_questions q
    where q.cluster_id = c.id
      and q.task_type = x.task_type
      and coalesce(q.source_text, '') = coalesce(x.source_text, '')
      and q.prompt = x.prompt
  )
limit 1000;

commit;

drop materialized view if exists public.mv_user_cluster_day_accuracy;
create materialized view public.mv_user_cluster_day_accuracy as
with daily as (
  select
    vae.student_id,
    vae.context_id as cluster_slug,
    timezone('UTC', vae.created_at)::date as activity_date,
    count(*)::bigint as total_answers,
    count(*) filter (where vae.is_correct = true)::bigint as correct_answers
  from public.vocab_answer_events vae
  where vae.context_type = 'vocab_cluster'
    and vae.context_id is not null
    and vae.question_mode in ('cluster-choice', 'cluster-correction', 'cluster-translation')
  group by vae.student_id, vae.context_id, timezone('UTC', vae.created_at)::date
)
select
  d.student_id,
  d.cluster_slug,
  d.activity_date,
  d.total_answers,
  d.correct_answers,
  (d.correct_answers::double precision / nullif(d.total_answers::double precision, 0.0)) as accuracy
from daily d
with data;

create unique index if not exists idx_mv_user_cluster_day_accuracy_unique
  on public.mv_user_cluster_day_accuracy(student_id, cluster_slug, activity_date);

create index if not exists idx_mv_user_cluster_day_accuracy_lookup
  on public.mv_user_cluster_day_accuracy(student_id, cluster_slug);

drop materialized view if exists public.mv_user_cluster_mastery;
create materialized view public.mv_user_cluster_mastery as
with day_rollup as (
  select
    student_id,
    cluster_slug,
    count(*)::bigint as practiced_days,
    count(*) filter (where accuracy >= 0.8)::bigint as stable_days,
    max(activity_date) as latest_activity_date,
    sum(correct_answers)::bigint as correct_answers,
    sum(total_answers)::bigint as total_answers
  from public.mv_user_cluster_day_accuracy
  group by student_id, cluster_slug
)
select
  dr.student_id,
  dr.cluster_slug,
  dr.practiced_days,
  dr.stable_days,
  dr.latest_activity_date,
  (dr.correct_answers::double precision / nullif(dr.total_answers::double precision, 0.0)) as rolling_accuracy,
  case
    when dr.practiced_days <= 0 then 'new'
    when dr.stable_days >= 3 and (dr.correct_answers::double precision / nullif(dr.total_answers::double precision, 0.0)) >= 0.85 then 'mastered'
    when dr.stable_days >= 2 then 'stable'
    else 'building'
  end as mastery_state
from day_rollup dr
with data;

create unique index if not exists idx_mv_user_cluster_mastery_unique
  on public.mv_user_cluster_mastery(student_id, cluster_slug);

create index if not exists idx_mv_user_cluster_mastery_student_state
  on public.mv_user_cluster_mastery(student_id, mastery_state);

revoke all on public.mv_user_cluster_day_accuracy from anon;
revoke all on public.mv_user_cluster_mastery from anon;
grant select on public.mv_user_cluster_day_accuracy to authenticated;
grant select on public.mv_user_cluster_day_accuracy to service_role;
grant select on public.mv_user_cluster_mastery to authenticated;
grant select on public.mv_user_cluster_mastery to service_role;
