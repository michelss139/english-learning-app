-- Migration: Seed production content package for make-do cluster
-- Date: 2026-03-12
-- Scope: content only for the existing make-do cluster

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
  'make-do',
  'make / do',
  true,
  false,
  'Oba czasowniki często tłumaczymy jako robić, ale make używamy, gdy coś tworzymy, przygotowujemy albo wywołujemy efekt, a do przy czynnościach, obowiązkach i aktywnościach.',
  'Rozróżniaj make i do w najczęstszych połączeniach oraz wybieraj poprawny czasownik w krótkich, prostych zdaniach.',
  E'make i do bardzo często tłumaczymy po polsku jako robić albo zrobić, ale w angielskim używamy ich w innych typach połączeń. make najczęściej oznacza tworzenie, przygotowanie albo wywołanie jakiegoś efektu, np. make breakfast, make a plan, make a mistake. do odnosi się głównie do czynności, obowiązków, pracy i aktywności, np. do homework, do the dishes, do exercise.

Najprościej zapamiętać to tak: jeśli coś powstaje albo pojawia się efekt, zwykle używamy make. Jeśli mówimy o wykonywaniu czynności, obowiązku albo zadania, zwykle używamy do.

Polskie tłumaczenie:
- make -> robić, zrobić, tworzyć, przygotować
- do -> robić, wykonywać, zajmować się

Verb forms:
- make -> make / makes / made / made
- do -> do / does / did / done',
  10
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

with make_do as (
  select id from public.vocab_clusters where slug = 'make-do'
)
delete from public.vocab_cluster_patterns
where cluster_id in (select id from make_do);

with make_do as (
  select id from public.vocab_clusters where slug = 'make-do'
)
delete from public.vocab_cluster_examples
where cluster_id in (select id from make_do);

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
    ('make-do', 'create vs result', 'make breakfast / make a plan / make a mistake', 'zrobić śniadanie / zrobić plan / popełnić błąd', 'Użyj make, gdy coś tworzysz, przygotowujesz albo powodujesz jakiś efekt.', 'Nie mówimy do breakfast ani do a mistake.', 10),
    ('make-do', 'tasks and duties', 'do homework / do the dishes / do the shopping', 'odrabiać pracę domową / zmywać naczynia / robić zakupy', 'Użyj do przy obowiązkach, rutynowych czynnościach i zadaniach.', 'Nie mówimy make homework ani make the dishes.', 20),
    ('make-do', 'common make collocations', 'make a decision / make progress / make money / make friends', 'podjąć decyzję / robić postępy / zarabiać pieniądze / zaprzyjaźniać się', 'To bardzo częste stałe połączenia z make.', 'W tych wyrażeniach nie używamy do.', 30),
    ('make-do', 'common do collocations', 'do your best / do business / do research / do a favour', 'zrobić wszystko, co się da / prowadzić biznes / prowadzić badania / wyświadczyć przysługę', 'To częste stałe połączenia z do.', 'W tych wyrażeniach nie używamy make.', 40)
) as x(slug, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
  on x.slug = c.slug
where c.slug = 'make-do';

insert into public.vocab_cluster_examples (
  cluster_id,
  example_en,
  example_pl,
  focus_term,
  note,
  source,
  difficulty,
  sort_order
)
select
  c.id,
  x.example_en,
  x.example_pl,
  x.focus_term,
  x.note,
  x.source,
  x.difficulty,
  x.sort_order
from public.vocab_clusters c
join (
  values
    ('make-do', 'I usually make breakfast at 7.', null, 'make', 'Kolokacja: make', 'manual', '1', 10),
    ('make-do', 'She makes coffee every morning.', null, 'makes', 'Kolokacja: makes', 'manual', '1', 20),
    ('make-do', 'We make dinner together on Fridays.', null, 'make', 'Kolokacja: make', 'manual', '1', 30),
    ('make-do', 'He makes a sandwich for lunch every day.', null, 'makes', 'Kolokacja: makes', 'manual', '1', 40),
    ('make-do', 'They make a cake for every birthday.', null, 'make', 'Kolokacja: make', 'manual', '1', 50),
    ('make-do', 'I need to make a plan before we start.', null, 'make', 'Kolokacja: make', 'manual', '1', 60),
    ('make-do', 'Let''s make a list of everything we need.', null, 'make', 'Kolokacja: make', 'manual', '1', 70),
    ('make-do', 'She made an important decision very quickly.', null, 'made', 'Kolokacja: made', 'manual', '2', 80),
    ('make-do', 'We have made good progress this month.', null, 'made', 'Kolokacja: made', 'manual', '2', 90),
    ('make-do', 'He made a promise and kept it.', null, 'made', 'Kolokacja: made', 'manual', '2', 100),
    ('make-do', 'I made a mistake in my email yesterday.', null, 'made', 'Kolokacja: made', 'manual', '1', 110),
    ('make-do', 'The children made too much noise in class.', null, 'made', 'Kolokacja: made', 'manual', '1', 120),
    ('make-do', 'She made a good impression at the interview.', null, 'made', 'Kolokacja: made', 'manual', '2', 130),
    ('make-do', 'They made enough money to pay for the trip.', null, 'made', 'Kolokacja: made', 'manual', '2', 140),
    ('make-do', 'Can you make a phone call for me?', null, 'make', 'Kolokacja: make', 'manual', '2', 150),
    ('make-do', 'I want to make an appointment with the dentist.', null, 'make', 'Kolokacja: make', 'manual', '2', 160),
    ('make-do', 'They made a reservation for eight people.', null, 'made', 'Kolokacja: made', 'manual', '2', 170),
    ('make-do', 'Please make sure the door is closed.', null, 'make', 'Kolokacja: make', 'manual', '2', 180),
    ('make-do', 'He makes friends easily at university.', null, 'makes', 'Kolokacja: makes', 'manual', '2', 190),
    ('make-do', 'We make an effort to speak English in class.', null, 'make', 'Kolokacja: make', 'manual', '2', 200),
    ('make-do', 'She made an excuse for being late.', null, 'made', 'Kolokacja: made', 'manual', '2', 210),
    ('make-do', 'I make the beds every morning before school.', null, 'make', 'Kolokacja: make', 'manual', '2', 220),
    ('make-do', 'He always makes time for his family.', null, 'makes', 'Kolokacja: makes', 'manual', '2', 230),
    ('make-do', 'The film made me happy.', null, 'made', 'Kolokacja: made', 'manual', '2', 240),
    ('make-do', 'This song makes me want to dance.', null, 'makes', 'Kolokacja: makes', 'manual', '2', 250),
    ('make-do', 'They made a mess in the kitchen.', null, 'made', 'Kolokacja: made', 'manual', '1', 260),
    ('make-do', 'I made a choice and I don''t regret it.', null, 'made', 'Kolokacja: made', 'manual', '2', 270),
    ('make-do', 'We should make a suggestion before the meeting ends.', null, 'make', 'Kolokacja: make', 'manual', '3', 280),
    ('make-do', 'She made a complaint about the noise.', null, 'made', 'Kolokacja: made', 'manual', '3', 290),
    ('make-do', 'They made a simple website for their school project.', null, 'made', 'Kolokacja: made', 'manual', '3', 300),
    ('make-do', 'I have to do my homework tonight.', null, 'do', 'Kolokacja: do', 'manual', '1', 310),
    ('make-do', 'She does the dishes after dinner.', null, 'does', 'Kolokacja: does', 'manual', '1', 320),
    ('make-do', 'We do the shopping on Saturdays.', null, 'do', 'Kolokacja: do', 'manual', '1', 330),
    ('make-do', 'He does the housework at the weekend.', null, 'does', 'Kolokacja: does', 'manual', '1', 340),
    ('make-do', 'They do exercise every morning.', null, 'do', 'Kolokacja: do', 'manual', '1', 350),
    ('make-do', 'I always do my best in tests.', null, 'do', 'Kolokacja: do', 'manual', '2', 360),
    ('make-do', 'Can you do me a favour?', null, 'do', 'Kolokacja: do', 'manual', '2', 370),
    ('make-do', 'She does the washing on Mondays.', null, 'does', 'Kolokacja: does', 'manual', '2', 380),
    ('make-do', 'We do the laundry every two days.', null, 'do', 'Kolokacja: do', 'manual', '2', 390),
    ('make-do', 'He does the cleaning before guests arrive.', null, 'does', 'Kolokacja: does', 'manual', '2', 400),
    ('make-do', 'They do business with companies in Germany.', null, 'do', 'Kolokacja: do', 'manual', '2', 410),
    ('make-do', 'I need to do some work after lunch.', null, 'do', 'Kolokacja: do', 'manual', '1', 420),
    ('make-do', 'She does research for the school project.', null, 'does', 'Kolokacja: does', 'manual', '3', 430),
    ('make-do', 'We do yoga together on Tuesdays.', null, 'do', 'Kolokacja: do', 'manual', '2', 440),
    ('make-do', 'He does the ironing in the evening.', null, 'does', 'Kolokacja: does', 'manual', '2', 450),
    ('make-do', 'They do the cooking when their parents are busy.', null, 'do', 'Kolokacja: do', 'manual', '2', 460),
    ('make-do', 'I do nothing on Sunday mornings.', null, 'do', 'Kolokacja: do', 'manual', '1', 470),
    ('make-do', 'She does well at school.', null, 'does', 'Kolokacja: does', 'manual', '3', 480),
    ('make-do', 'He does badly in interviews because he gets nervous.', null, 'does', 'Kolokacja: does', 'manual', '3', 490),
    ('make-do', 'We do the paperwork every Friday.', null, 'do', 'Kolokacja: do', 'manual', '3', 500),
    ('make-do', 'I did the shopping yesterday.', null, 'did', 'Kolokacja: did', 'manual', '1', 510),
    ('make-do', 'She has done her homework already.', null, 'done', 'Kolokacja: done', 'manual', '1', 520),
    ('make-do', 'We had done the dishes before the guests arrived.', null, 'done', 'Kolokacja: done', 'manual', '2', 530),
    ('make-do', 'He did me a big favour last week.', null, 'did', 'Kolokacja: did', 'manual', '2', 540),
    ('make-do', 'They did their best, but they still lost.', null, 'did', 'Kolokacja: did', 'manual', '2', 550),
    ('make-do', 'I can''t go out now because I''m doing my homework.', null, 'doing', 'Kolokacja: doing', 'manual', '2', 560),
    ('make-do', 'She is doing the shopping right now.', null, 'doing', 'Kolokacja: doing', 'manual', '2', 570),
    ('make-do', 'We''re doing business with a new client this month.', null, 'doing', 'Kolokacja: doing', 'manual', '3', 580),
    ('make-do', 'He does an online course after work.', null, 'does', 'Kolokacja: does', 'manual', '3', 590),
    ('make-do', 'I need to do the washing-up before bed.', null, 'do', 'Kolokacja: do', 'manual', '2', 600)
) as x(slug, example_en, example_pl, focus_term, note, source, difficulty, sort_order)
  on x.slug = c.slug
where c.slug = 'make-do';

update public.vocab_cluster_questions
set is_active = false
where cluster_id = (select id from public.vocab_clusters where slug = 'make-do')
  and (
    (task_type = 'choice' and prompt = 'How often do you ___ breakfast?')
    or (task_type = 'correction' and source_text = 'I do breakfast before school.')
    or (task_type = 'translation' and source_text = 'Muszę odrobić pracę domową dziś wieczorem.')
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
  x.correct_choice,
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  null,
  null,
  null,
  ex.id,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('make-do', 'I usually __ breakfast at 7.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 10, 'Wybierz właściwe słowo.', 'I usually make breakfast at 7.'),
    ('make-do', 'She __ coffee every morning.', 'collocation', 'choice', null, 'makes', 'makes', ARRAY['makes', 'does']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 20, 'Wybierz właściwe słowo.', 'She makes coffee every morning.'),
    ('make-do', 'We __ dinner together on Fridays.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 30, 'Wybierz właściwe słowo.', 'We make dinner together on Fridays.'),
    ('make-do', 'He __ a sandwich for lunch every day.', 'collocation', 'choice', null, 'makes', 'makes', ARRAY['makes', 'does']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 40, 'Wybierz właściwe słowo.', 'He makes a sandwich for lunch every day.'),
    ('make-do', 'They __ a cake for every birthday.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 50, 'Wybierz właściwe słowo.', 'They make a cake for every birthday.'),
    ('make-do', 'I need to __ a plan before we start.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 60, 'Wybierz właściwe słowo.', 'I need to make a plan before we start.'),
    ('make-do', 'Let''s __ a list of everything we need.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 70, 'Wybierz właściwe słowo.', 'Let''s make a list of everything we need.'),
    ('make-do', 'She __ an important decision very quickly.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 80, 'Wybierz właściwe słowo.', 'She made an important decision very quickly.'),
    ('make-do', 'We have __ good progress this month.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'done']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 90, 'Wybierz właściwe słowo.', 'We have made good progress this month.'),
    ('make-do', 'He __ a promise and kept it.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 100, 'Wybierz właściwe słowo.', 'He made a promise and kept it.'),
    ('make-do', 'I __ a mistake in my email yesterday.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 110, 'Wybierz właściwe słowo.', 'I made a mistake in my email yesterday.'),
    ('make-do', 'The children __ too much noise in class.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 120, 'Wybierz właściwe słowo.', 'The children made too much noise in class.'),
    ('make-do', 'She __ a good impression at the interview.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 130, 'Wybierz właściwe słowo.', 'She made a good impression at the interview.'),
    ('make-do', 'They __ enough money to pay for the trip.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 140, 'Wybierz właściwe słowo.', 'They made enough money to pay for the trip.'),
    ('make-do', 'Can you __ a phone call for me?', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 150, 'Wybierz właściwe słowo.', 'Can you make a phone call for me?'),
    ('make-do', 'I want to __ an appointment with the dentist.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 160, 'Wybierz właściwe słowo.', 'I want to make an appointment with the dentist.'),
    ('make-do', 'They __ a reservation for eight people.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 170, 'Wybierz właściwe słowo.', 'They made a reservation for eight people.'),
    ('make-do', 'Please __ sure the door is closed.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 180, 'Wybierz właściwe słowo.', 'Please make sure the door is closed.'),
    ('make-do', 'He __ friends easily at university.', 'collocation', 'choice', null, 'makes', 'makes', ARRAY['makes', 'does']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 190, 'Wybierz właściwe słowo.', 'He makes friends easily at university.'),
    ('make-do', 'We __ an effort to speak English in class.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 200, 'Wybierz właściwe słowo.', 'We make an effort to speak English in class.'),
    ('make-do', 'She __ an excuse for being late.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 210, 'Wybierz właściwe słowo.', 'She made an excuse for being late.'),
    ('make-do', 'I __ the beds every morning before school.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 220, 'Wybierz właściwe słowo.', 'I make the beds every morning before school.'),
    ('make-do', 'He always __ time for his family.', 'collocation', 'choice', null, 'makes', 'makes', ARRAY['makes', 'does']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 230, 'Wybierz właściwe słowo.', 'He always makes time for his family.'),
    ('make-do', 'The film __ me happy.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 240, 'Wybierz właściwe słowo.', 'The film made me happy.'),
    ('make-do', 'This song __ me want to dance.', 'collocation', 'choice', null, 'makes', 'makes', ARRAY['makes', 'does']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 250, 'Wybierz właściwe słowo.', 'This song makes me want to dance.'),
    ('make-do', 'They __ a mess in the kitchen.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 260, 'Wybierz właściwe słowo.', 'They made a mess in the kitchen.'),
    ('make-do', 'I __ a choice and I don''t regret it.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 270, 'Wybierz właściwe słowo.', 'I made a choice and I don''t regret it.'),
    ('make-do', 'We should __ a suggestion before the meeting ends.', 'collocation', 'choice', null, 'make', 'make', ARRAY['make', 'do']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 280, 'Wybierz właściwe słowo.', 'We should make a suggestion before the meeting ends.'),
    ('make-do', 'She __ a complaint about the noise.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 290, 'Wybierz właściwe słowo.', 'She made a complaint about the noise.'),
    ('make-do', 'They __ a simple website for their school project.', 'collocation', 'choice', null, 'made', 'made', ARRAY['made', 'did']::text[], 'make', 'W tym zdaniu potrzebujesz make w odpowiedniej formie.', 300, 'Wybierz właściwe słowo.', 'They made a simple website for their school project.'),
    ('make-do', 'I have to __ my homework tonight.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 310, 'Wybierz właściwe słowo.', 'I have to do my homework tonight.'),
    ('make-do', 'She __ the dishes after dinner.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 320, 'Wybierz właściwe słowo.', 'She does the dishes after dinner.'),
    ('make-do', 'We __ the shopping on Saturdays.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 330, 'Wybierz właściwe słowo.', 'We do the shopping on Saturdays.'),
    ('make-do', 'He __ the housework at the weekend.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 340, 'Wybierz właściwe słowo.', 'He does the housework at the weekend.'),
    ('make-do', 'They __ exercise every morning.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 350, 'Wybierz właściwe słowo.', 'They do exercise every morning.'),
    ('make-do', 'I always __ my best in tests.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 360, 'Wybierz właściwe słowo.', 'I always do my best in tests.'),
    ('make-do', 'Can you __ me a favour?', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 370, 'Wybierz właściwe słowo.', 'Can you do me a favour?'),
    ('make-do', 'She __ the washing on Mondays.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 380, 'Wybierz właściwe słowo.', 'She does the washing on Mondays.'),
    ('make-do', 'We __ the laundry every two days.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 390, 'Wybierz właściwe słowo.', 'We do the laundry every two days.'),
    ('make-do', 'He __ the cleaning before guests arrive.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 400, 'Wybierz właściwe słowo.', 'He does the cleaning before guests arrive.'),
    ('make-do', 'They __ business with companies in Germany.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 410, 'Wybierz właściwe słowo.', 'They do business with companies in Germany.'),
    ('make-do', 'I need to __ some work after lunch.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 420, 'Wybierz właściwe słowo.', 'I need to do some work after lunch.'),
    ('make-do', 'She __ research for the school project.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 430, 'Wybierz właściwe słowo.', 'She does research for the school project.'),
    ('make-do', 'We __ yoga together on Tuesdays.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 440, 'Wybierz właściwe słowo.', 'We do yoga together on Tuesdays.'),
    ('make-do', 'He __ the ironing in the evening.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 450, 'Wybierz właściwe słowo.', 'He does the ironing in the evening.'),
    ('make-do', 'They __ the cooking when their parents are busy.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 460, 'Wybierz właściwe słowo.', 'They do the cooking when their parents are busy.'),
    ('make-do', 'I __ nothing on Sunday mornings.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 470, 'Wybierz właściwe słowo.', 'I do nothing on Sunday mornings.'),
    ('make-do', 'She __ well at school.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 480, 'Wybierz właściwe słowo.', 'She does well at school.'),
    ('make-do', 'He __ badly in interviews because he gets nervous.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 490, 'Wybierz właściwe słowo.', 'He does badly in interviews because he gets nervous.'),
    ('make-do', 'We __ the paperwork every Friday.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 500, 'Wybierz właściwe słowo.', 'We do the paperwork every Friday.'),
    ('make-do', 'I __ the shopping yesterday.', 'collocation', 'choice', null, 'did', 'did', ARRAY['did', 'made']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 510, 'Wybierz właściwe słowo.', 'I did the shopping yesterday.'),
    ('make-do', 'She has __ her homework already.', 'collocation', 'choice', null, 'done', 'done', ARRAY['done', 'made']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 520, 'Wybierz właściwe słowo.', 'She has done her homework already.'),
    ('make-do', 'We had __ the dishes before the guests arrived.', 'collocation', 'choice', null, 'done', 'done', ARRAY['done', 'made']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 530, 'Wybierz właściwe słowo.', 'We had done the dishes before the guests arrived.'),
    ('make-do', 'He __ me a big favour last week.', 'collocation', 'choice', null, 'did', 'did', ARRAY['did', 'made']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 540, 'Wybierz właściwe słowo.', 'He did me a big favour last week.'),
    ('make-do', 'They __ their best, but they still lost.', 'collocation', 'choice', null, 'did', 'did', ARRAY['did', 'made']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 550, 'Wybierz właściwe słowo.', 'They did their best, but they still lost.'),
    ('make-do', 'I can''t go out now because I''m __ my homework.', 'collocation', 'choice', null, 'doing', 'doing', ARRAY['doing', 'making']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 560, 'Wybierz właściwe słowo.', 'I can''t go out now because I''m doing my homework.'),
    ('make-do', 'She is __ the shopping right now.', 'collocation', 'choice', null, 'doing', 'doing', ARRAY['doing', 'making']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 570, 'Wybierz właściwe słowo.', 'She is doing the shopping right now.'),
    ('make-do', 'We''re __ business with a new client this month.', 'collocation', 'choice', null, 'doing', 'doing', ARRAY['doing', 'making']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 580, 'Wybierz właściwe słowo.', 'We''re doing business with a new client this month.'),
    ('make-do', 'He __ an online course after work.', 'collocation', 'choice', null, 'does', 'does', ARRAY['does', 'makes']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 590, 'Wybierz właściwe słowo.', 'He does an online course after work.'),
    ('make-do', 'I need to __ the washing-up before bed.', 'collocation', 'choice', null, 'do', 'do', ARRAY['do', 'make']::text[], 'do', 'W tym zdaniu potrzebujesz do w odpowiedniej formie.', 600, 'Wybierz właściwe słowo.', 'I need to do the washing-up before bed.')
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
  instruction,
  example_en
)
  on x.slug = c.slug
join public.vocab_cluster_entries vce
  on vce.cluster_id = c.id
join public.lexicon_entries le
  on le.id = vce.entry_id
 and le.lemma_norm = x.target_lemma
left join public.vocab_cluster_examples ex
  on ex.cluster_id = c.id and ex.example_en = x.example_en
where c.slug = 'make-do'
  and not exists (
    select 1
    from public.vocab_cluster_questions q
    where q.cluster_id = c.id
      and q.task_type = 'choice'
      and q.prompt = x.prompt
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
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  x.source_text,
  x.expected_answer,
  x.accepted_answers,
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'She did a mistake.', 'She made a mistake.', ARRAY['She made a mistake.']::text[], ARRAY['She made a mistake.', '__text__']::text[], 'make', 'We say make a mistake.', 1000, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I have to make my homework tonight.', 'I have to do my homework tonight.', ARRAY['I have to do my homework tonight.']::text[], ARRAY['I have to do my homework tonight.', '__text__']::text[], 'do', 'We say do homework.', 1001, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'We made the shopping yesterday.', 'We did the shopping yesterday.', ARRAY['We did the shopping yesterday.']::text[], ARRAY['We did the shopping yesterday.', '__text__']::text[], 'do', 'We say do the shopping.', 1002, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'He did breakfast for the children.', 'He made breakfast for the children.', ARRAY['He made breakfast for the children.']::text[], ARRAY['He made breakfast for the children.', '__text__']::text[], 'make', 'We say make breakfast.', 1003, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'They made the housework together.', 'They did the housework together.', ARRAY['They did the housework together.']::text[], ARRAY['They did the housework together.', '__text__']::text[], 'do', 'We say do the housework.', 1004, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'Can you make me a favour?', 'Can you do me a favour?', ARRAY['Can you do me a favour?']::text[], ARRAY['Can you do me a favour?', '__text__']::text[], 'do', 'We say do somebody a favour.', 1005, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'She did an important decision too quickly.', 'She made an important decision too quickly.', ARRAY['She made an important decision too quickly.']::text[], ARRAY['She made an important decision too quickly.', '__text__']::text[], 'make', 'We say make a decision.', 1006, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I always make my best in exams.', 'I always do my best in exams.', ARRAY['I always do my best in exams.']::text[], ARRAY['I always do my best in exams.', '__text__']::text[], 'do', 'We say do your best.', 1007, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'We did a reservation online.', 'We made a reservation online.', ARRAY['We made a reservation online.']::text[], ARRAY['We made a reservation online.', '__text__']::text[], 'make', 'We say make a reservation.', 1008, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'He made the dishes after dinner.', 'He did the dishes after dinner.', ARRAY['He did the dishes after dinner.']::text[], ARRAY['He did the dishes after dinner.', '__text__']::text[], 'do', 'We say do the dishes.', 1009, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'They did too much noise in class.', 'They made too much noise in class.', ARRAY['They made too much noise in class.']::text[], ARRAY['They made too much noise in class.', '__text__']::text[], 'make', 'We say make noise.', 1010, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I made exercise before work.', 'I did some exercise before work.', ARRAY['I did some exercise before work.']::text[], ARRAY['I did some exercise before work.', '__text__']::text[], 'do', 'We usually say do exercise or do some exercise.', 1011, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'She has done a promise to help us.', 'She has made a promise to help us.', ARRAY['She has made a promise to help us.']::text[], ARRAY['She has made a promise to help us.', '__text__']::text[], 'make', 'We say make a promise.', 1012, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'We made business with them last year.', 'We did business with them last year.', ARRAY['We did business with them last year.']::text[], ARRAY['We did business with them last year.', '__text__']::text[], 'do', 'We say do business.', 1013, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'He did good progress very quickly.', 'He made good progress very quickly.', ARRAY['He made good progress very quickly.']::text[], ARRAY['He made good progress very quickly.', '__text__']::text[], 'make', 'We say make progress.', 1014, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I need to do a phone call.', 'I need to make a phone call.', ARRAY['I need to make a phone call.']::text[], ARRAY['I need to make a phone call.', '__text__']::text[], 'make', 'We say make a phone call.', 1015, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'She made the washing on Monday.', 'She did the washing on Monday.', ARRAY['She did the washing on Monday.']::text[], ARRAY['She did the washing on Monday.', '__text__']::text[], 'do', 'We say do the washing.', 1016, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'They have made the cleaning already.', 'They have already done the cleaning.', ARRAY['They have already done the cleaning.']::text[], ARRAY['They have already done the cleaning.', '__text__']::text[], 'do', 'We say do the cleaning.', 1017, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'He did friends quickly at school.', 'He made friends quickly at school.', ARRAY['He made friends quickly at school.']::text[], ARRAY['He made friends quickly at school.', '__text__']::text[], 'make', 'We say make friends.', 1018, 'Popraw zdanie tak, aby użyć właściwego czasownika.'),
    ('make-do', 'Popraw zdanie', 'correction', 'correction', 'I usually make the shopping on Friday evenings.', 'I usually do the shopping on Friday evenings.', ARRAY['I usually do the shopping on Friday evenings.']::text[], ARRAY['I usually do the shopping on Friday evenings.', '__text__']::text[], 'do', 'We say do the shopping.', 1019, 'Popraw zdanie tak, aby użyć właściwego czasownika.')
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
join public.lexicon_entries le
  on le.id = vce.entry_id
 and le.lemma_norm = x.target_lemma
where c.slug = 'make-do'
  and not exists (
    select 1
    from public.vocab_cluster_questions q
    where q.cluster_id = c.id
      and q.task_type = 'correction'
      and q.prompt = x.prompt
      and coalesce(q.source_text, '') = coalesce(x.source_text, '')
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
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  x.source_text,
  x.expected_answer,
  x.accepted_answers,
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Muszę zrobić plan.', 'I need to make a plan.', ARRAY['I need to make a plan.', 'I have to make a plan.']::text[], ARRAY['I need to make a plan.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a plan', 2000, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona odrabia pracę domową po szkole.', 'She does her homework after school.', ARRAY['She does her homework after school.', 'She does homework after school.']::text[], ARRAY['She does her homework after school.', '__text__']::text[], 'do', 'Kluczowe połączenie: do homework', 2001, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Zrobiłem błąd.', 'I made a mistake.', ARRAY['I made a mistake.']::text[], ARRAY['I made a mistake.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a mistake', 2002, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Zrobiliśmy zakupy rano.', 'We did the shopping this morning.', ARRAY['We did the shopping this morning.', 'We did the shopping in the morning.']::text[], ARRAY['We did the shopping this morning.', '__text__']::text[], 'do', 'Kluczowe połączenie: do the shopping', 2003, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'On robi kawę każdego ranka.', 'He makes coffee every morning.', ARRAY['He makes coffee every morning.']::text[], ARRAY['He makes coffee every morning.', '__text__']::text[], 'make', 'Kluczowe połączenie: make coffee', 2004, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona zmywa naczynia po kolacji.', 'She does the dishes after dinner.', ARRAY['She does the dishes after dinner.', 'She does the washing-up after dinner.']::text[], ARRAY['She does the dishes after dinner.', '__text__']::text[], 'do', 'Kluczowe połączenie: do the dishes', 2005, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Musimy zrobić rezerwację.', 'We need to make a reservation.', ARRAY['We need to make a reservation.', 'We have to make a reservation.']::text[], ARRAY['We need to make a reservation.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a reservation', 2006, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Zawsze robię wszystko, co mogę.', 'I always do my best.', ARRAY['I always do my best.']::text[], ARRAY['I always do my best.', '__text__']::text[], 'do', 'Kluczowe połączenie: do my best', 2007, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Oni robią hałas w klasie.', 'They make noise in class.', ARRAY['They make noise in class.', 'They are making noise in class.']::text[], ARRAY['They make noise in class.', '__text__']::text[], 'make', 'Kluczowe połączenie: make noise', 2008, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Robię pranie w sobotę.', 'I do the laundry on Saturday.', ARRAY['I do the laundry on Saturday.', 'I do the washing on Saturday.']::text[], ARRAY['I do the laundry on Saturday.', '__text__']::text[], 'do', 'Kluczowe połączenie: do the laundry', 2009, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'On podejmuje szybką decyzję.', 'He makes a quick decision.', ARRAY['He makes a quick decision.']::text[], ARRAY['He makes a quick decision.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a decision', 2010, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona ćwiczy codziennie.', 'She does some exercise every day.', ARRAY['She does some exercise every day.', 'She does exercise every day.']::text[], ARRAY['She does some exercise every day.', '__text__']::text[], 'do', 'Kluczowe połączenie: do exercise', 2011, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Złożyłem obietnicę.', 'I made a promise.', ARRAY['I made a promise.']::text[], ARRAY['I made a promise.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a promise', 2012, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Czy możesz wyświadczyć mi przysługę?', 'Can you do me a favour?', ARRAY['Can you do me a favour?', 'Could you do me a favour?']::text[], ARRAY['Can you do me a favour?', '__text__']::text[], 'do', 'Kluczowe połączenie: do somebody a favour', 2013, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona robi postępy.', 'She is making progress.', ARRAY['She is making progress.', 'She makes progress.']::text[], ARRAY['She is making progress.', '__text__']::text[], 'make', 'Kluczowe połączenie: make progress', 2014, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Oni robią biznes w Polsce.', 'They do business in Poland.', ARRAY['They do business in Poland.', 'They are doing business in Poland.']::text[], ARRAY['They do business in Poland.', '__text__']::text[], 'do', 'Kluczowe połączenie: do business', 2015, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Zrobiła kanapkę na lunch.', 'She made a sandwich for lunch.', ARRAY['She made a sandwich for lunch.']::text[], ARRAY['She made a sandwich for lunch.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a sandwich', 2016, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Muszę zrobić telefon.', 'I need to make a phone call.', ARRAY['I need to make a phone call.', 'I have to make a phone call.']::text[], ARRAY['I need to make a phone call.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a phone call', 2017, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'On sprząta w weekend.', 'He does the cleaning at the weekend.', ARRAY['He does the cleaning at the weekend.', 'He does the cleaning on the weekend.']::text[], ARRAY['He does the cleaning at the weekend.', '__text__']::text[], 'do', 'Kluczowe połączenie: do the cleaning', 2018, 'Przetłumacz na angielski, używając make albo do.'),
    ('make-do', 'Przetłumacz zdanie', 'translation', 'translation', 'Zrobiliśmy duży bałagan.', 'We made a big mess.', ARRAY['We made a big mess.', 'We made a huge mess.']::text[], ARRAY['We made a big mess.', '__text__']::text[], 'make', 'Kluczowe połączenie: make a mess', 2019, 'Przetłumacz na angielski, używając make albo do.')
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
join public.lexicon_entries le
  on le.id = vce.entry_id
 and le.lemma_norm = x.target_lemma
where c.slug = 'make-do'
  and not exists (
    select 1
    from public.vocab_cluster_questions q
    where q.cluster_id = c.id
      and q.task_type = 'translation'
      and q.prompt = x.prompt
      and coalesce(q.source_text, '') = coalesce(x.source_text, '')
  );

commit;
