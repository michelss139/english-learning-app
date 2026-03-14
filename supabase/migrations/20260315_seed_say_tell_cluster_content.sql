-- Migration: Seed production content package for say-tell cluster
-- Date: 2026-03-15
-- Scope: content only for the existing say-tell cluster

begin;

insert into public.vocab_clusters (
  slug,
  title,
  is_recommended,
  is_unlockable,
  theory_summary,
  learning_goal,
  theory_md,
  display_order
)
values (
  'say-tell',
  'say / tell',
  true,
  false,
  'Say skupia się na samych słowach lub informacji, tell potrzebuje odbiorcy albo stałego połączenia.',
  'Rozróżniaj say i tell w codziennych sytuacjach oraz wybieraj właściwy czasownik w krótkich, naturalnych zdaniach.',
  E'say i tell oba często tłumaczymy jako powiedzieć, ale używamy ich w innych konstrukcjach. say skupia się głównie na samych słowach lub informacji: say something, say hello, say that.... tell zwykle potrzebuje odbiorcy albo stałego połączenia: tell me, tell the truth, tell a story, tell someone to do something. Prosta reguła: jeśli po czasowniku od razu stoi osoba, bardzo często potrzebujesz tell; jeśli mówisz głównie o samych słowach, częściej użyjesz say.

Polskie tłumaczenie:
- say -> powiedzieć, mówić
- tell -> powiedzieć komuś, opowiedzieć, poinformować

Verb forms:
- say -> say / says / said / said
- tell -> tell / tells / told / told',
  70
)
on conflict (slug) do update
set
  title = excluded.title,
  is_recommended = excluded.is_recommended,
  is_unlockable = excluded.is_unlockable,
  theory_summary = excluded.theory_summary,
  learning_goal = excluded.learning_goal,
  theory_md = excluded.theory_md,
  display_order = excluded.display_order;

update public.vocab_clusters
set is_recommended = case when slug in ('make-do', 'bring-take', 'hear-listen', 'say-tell') then true else false end
where slug in (
  'make-do',
  'make-do-take-get',
  'get-take',
  'say-tell',
  'say-tell-speak-talk',
  'lend-borrow-rent-hire',
  'bring-take',
  'hear-listen',
  'tenses'
);

with say_tell as (
  select id from public.vocab_clusters where slug = 'say-tell'
)
delete from public.vocab_cluster_patterns
where cluster_id in (select id from say_tell);

update public.vocab_cluster_questions
set is_active = false
where cluster_id = (select id from public.vocab_clusters where slug = 'say-tell');

alter table public.vocab_cluster_questions
  add column if not exists target_tokens text[];

insert into public.lexicon_entries (lemma, lemma_norm, pos)
select
  x.lemma,
  x.lemma_norm,
  x.pos
from (
  values
    ('say', 'say', 'verb'),
    ('tell', 'tell', 'verb')
) as x(lemma, lemma_norm, pos)
where not exists (
  select 1
  from public.lexicon_entries le
  where le.lemma_norm = x.lemma_norm
    and le.pos = x.pos
);

insert into public.vocab_cluster_entries (cluster_id, entry_id)
select
  c.id,
  le.id
from public.vocab_clusters c
join public.lexicon_entries le
  on le.pos = 'verb'
 and le.lemma_norm in ('say', 'tell')
where c.slug = 'say-tell'
  and not exists (
    select 1
    from public.vocab_cluster_entries vce
    where vce.cluster_id = c.id
      and vce.entry_id = le.id
  );

insert into public.vocab_cluster_patterns (
  cluster_id,
  title,
  pattern_en,
  pattern_pl,
  usage_note,
  contrast_note,
  sort_order
)
select
  c.id,
  x.title,
  x.pattern_en,
  x.pattern_pl,
  x.usage_note,
  x.contrast_note,
  x.sort_order
from public.vocab_clusters c
join (
  values
    ('say-tell', 'words vs listener', 'say something / say no / say that... / tell me / tell us / tell John', 'powiedzieć coś / powiedzieć nie / powiedzieć, że... / powiedzieć mi / powiedzieć nam / powiedzieć Johnowi', 'Use say when you focus on the words or message itself. Use tell when you mention the person who receives the information.', 'We say say something, but tell someone something.', 10),
    ('say-tell', 'common fixed expressions', 'say hello / say sorry / say thank you / tell the truth / tell a lie / tell a story', 'powiedzieć cześć / powiedzieć przepraszam / powiedzieć dziękuję / powiedzieć prawdę / skłamać / opowiedzieć historię', 'Some very common expressions are fixed and must be learned as whole chunks.', 'We say say hello, but we tell the truth or a story.', 20),
    ('say-tell', 'instructions and information', 'tell me the answer / tell her the time / tell them what happened', 'powiedzieć mi odpowiedź / powiedzieć jej, która godzina / powiedzieć im, co się stało', 'Tell is natural when you pass information directly to a person.', 'Do not use say me or say her. Use tell me, tell her, tell them.', 30),
    ('say-tell', 'orders and reporting speech', 'tell someone to wait / say that you are tired / say something funny', 'powiedzieć komuś, żeby poczekał / powiedzieć, że jesteś zmęczony / powiedzieć coś zabawnego', 'Use tell for instructions with a person + infinitive. Use say before that clauses and general statements.', 'We say say that..., but tell someone to do something.', 40)
) as x(slug, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
  on x.slug = c.slug
where c.slug = 'say-tell';

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
  x.correct_choice,
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  null,
  null,
  null,
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('say-tell', 'Can you __ that again, please?', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 10, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Please __ me your name.', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 20, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She __ she was busy.', 'collocation', 'choice', null, 'said', 'said', ARRAY['said', 'told']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 30, 'Wybierz właściwe słowo.'),
    ('say-tell', 'He __ me the answer right away.', 'collocation', 'choice', null, 'told', 'told', ARRAY['told', 'said']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 40, 'Wybierz właściwe słowo.'),
    ('say-tell', 'I want to __ sorry.', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 50, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Can you __ us what happened?', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 60, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She always __ hello to my mum.', 'collocation', 'choice', null, 'says', 'says', ARRAY['says', 'tells']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 70, 'Wybierz właściwe słowo.'),
    ('say-tell', 'He never __ the truth.', 'collocation', 'choice', null, 'tells', 'tells', ARRAY['tells', 'says']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 80, 'Wybierz właściwe słowo.'),
    ('say-tell', 'They __ they are ready.', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 90, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Please __ the kids to be quiet.', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 100, 'Wybierz właściwe słowo.'),
    ('say-tell', 'I didn''t __ anything rude.', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 110, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She __ me to call later.', 'collocation', 'choice', null, 'told', 'told', ARRAY['told', 'said']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 120, 'Wybierz właściwe słowo.'),
    ('say-tell', 'What did he __ to you?', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 130, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Can you __ me the time?', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 140, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She __ thank you and left.', 'collocation', 'choice', null, 'said', 'said', ARRAY['said', 'told']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 150, 'Wybierz właściwe słowo.'),
    ('say-tell', 'He __ us a funny story.', 'collocation', 'choice', null, 'told', 'told', ARRAY['told', 'said']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 160, 'Wybierz właściwe słowo.'),
    ('say-tell', 'I often __ that word wrong.', 'collocation', 'choice', null, 'say', 'say', ARRAY['say', 'tell']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 170, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Don''t __ anyone my secret.', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 180, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She was __ goodbye when I arrived.', 'collocation', 'choice', null, 'saying', 'saying', ARRAY['saying', 'telling']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 190, 'Wybierz właściwe słowo.'),
    ('say-tell', 'He is __ the children a joke.', 'collocation', 'choice', null, 'telling', 'telling', ARRAY['telling', 'saying']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 200, 'Wybierz właściwe słowo.'),
    ('say-tell', 'We already __ no.', 'collocation', 'choice', null, 'said', 'said', ARRAY['said', 'told']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 210, 'Wybierz właściwe słowo.'),
    ('say-tell', 'Can you __ her I''m outside?', 'collocation', 'choice', null, 'tell', 'tell', ARRAY['tell', 'say']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 220, 'Wybierz właściwe słowo.'),
    ('say-tell', 'I didn''t hear what you __.', 'collocation', 'choice', null, 'said', 'said', ARRAY['said', 'told']::text[], 'say', 'W tym zdaniu potrzebujesz say w odpowiedniej formie.', 230, 'Wybierz właściwe słowo.'),
    ('say-tell', 'She __ me she was tired.', 'collocation', 'choice', null, 'told', 'told', ARRAY['told', 'said']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 240, 'Wybierz właściwe słowo.'),
    ('say-tell', 'They are __ everyone the good news.', 'collocation', 'choice', null, 'telling', 'telling', ARRAY['telling', 'saying']::text[], 'tell', 'W tym zdaniu potrzebujesz tell w odpowiedniej formie.', 250, 'Wybierz właściwe słowo.')
) as x(
  slug,
  prompt,
  slot,
  task_type,
  source_text_unused,
  correct_choice,
  expected_answer_unused,
  choices,
  target_lemma,
  explanation,
  sort_order,
  instruction
)
  on x.slug = c.slug
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
join public.lexicon_entries le
  on le.id = vce.entry_id
 and le.lemma_norm = x.target_lemma
where c.slug = 'say-tell';

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
  target_tokens,
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
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  x.source_text,
  x.expected_answer,
  x.accepted_answers,
  x.target_tokens,
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz coś głośno.', 'Say something loudly.', ARRAY['Say something loudly.']::text[], ARRAY['Say something loudly.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2000, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz mi prawdę.', 'Tell me the truth.', ARRAY['Tell me the truth.']::text[], ARRAY['Tell me the truth.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2001, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona powiedziała, że jest zmęczona.', 'She said she was tired.', ARRAY['She said she was tired.', 'She said that she was tired.']::text[], ARRAY['She said she was tired.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2002, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz mu to teraz.', 'Tell him now.', ARRAY['Tell him now.', 'Tell him that now.']::text[], ARRAY['Tell him now.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2003, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Nie mów tak.', 'Don''t say that.', ARRAY['Don''t say that.', 'Do not say that.']::text[], ARRAY['Don''t say that.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2004, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz mi swoje imię.', 'Tell me your name.', ARRAY['Tell me your name.']::text[], ARRAY['Tell me your name.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2005, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'On powiedział cześć.', 'He said hello.', ARRAY['He said hello.']::text[], ARRAY['He said hello.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2006, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Opowiedz nam tę historię.', 'Tell us that story.', ARRAY['Tell us that story.', 'Tell us the story.']::text[], ARRAY['Tell us that story.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2007, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Co powiedziała?', 'What did she say?', ARRAY['What did she say?']::text[], ARRAY['What did she say?', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2008, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz dzieciom, żeby usiadły.', 'Tell the children to sit down.', ARRAY['Tell the children to sit down.', 'Tell the kids to sit down.']::text[], ARRAY['Tell the children to sit down.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2009, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Nie powiedział nic.', 'He didn''t say anything.', ARRAY['He didn''t say anything.', 'He did not say anything.']::text[], ARRAY['He didn''t say anything.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2010, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz jej, że czekamy.', 'Tell her we are waiting.', ARRAY['Tell her we are waiting.', 'Tell her that we are waiting.']::text[], ARRAY['Tell her we are waiting.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2011, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Zawsze mówi przepraszam.', 'She always says sorry.', ARRAY['She always says sorry.']::text[], ARRAY['She always says sorry.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2012, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedz mi, co się stało.', 'Tell me what happened.', ARRAY['Tell me what happened.']::text[], ARRAY['Tell me what happened.', '__text__']::text[], 'tell', 'Użyj właściwego czasownika z pary say / tell.', 2013, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['tell']::text[]),
    ('say-tell', 'Przetłumacz zdanie', 'translation', 'translation', 'Powiedzieli, że już idą.', 'They said they were coming.', ARRAY['They said they were coming.', 'They said that they were coming.']::text[], ARRAY['They said they were coming.', '__text__']::text[], 'say', 'Użyj właściwego czasownika z pary say / tell.', 2014, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['say']::text[])
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
  instruction,
  target_tokens
)
  on x.slug = c.slug
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
join public.lexicon_entries le
  on le.id = vce.entry_id
 and le.lemma_norm = x.target_lemma
where c.slug = 'say-tell';

commit;
