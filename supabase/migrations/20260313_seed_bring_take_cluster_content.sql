-- Migration: Seed production content package for bring-take cluster
-- Date: 2026-03-13
-- Scope: content only for the existing bring-take cluster

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
  'bring-take',
  'bring / take',
  true,
  false,
  'Bring używamy, gdy coś idzie do mówiącego, słuchacza albo na wspólne miejsce spotkania, a take gdy coś zabieramy stąd gdzie indziej.',
  'Rozróżniaj bring i take w najczęstszych sytuacjach oraz wybieraj właściwy czasownik w prostych zdaniach.',
  E'bring i take często tłumaczymy po polsku podobnie: jako przynieść, zabrać, zanieść albo wziąć, ale w angielskim najważniejszy jest kierunek ruchu. bring używamy, gdy coś porusza się do mówiącego, do słuchacza albo do miejsca spotkania, na przykład bring your book here albo bring dessert to dinner. take używamy, gdy coś jest zabierane z obecnego miejsca gdzieś indziej, na przykład take it home albo take the kids to school.

Najprostsza reguła jest taka: jeśli myślisz do mnie, tutaj albo na nasze spotkanie, zwykle użyj bring. Jeśli myślisz stąd tam albo zabierz to ze sobą, zwykle użyj take.

Polskie tłumaczenie:
- bring -> przynieść, przyprowadzić, donieść
- take -> zabrać, zanieść, wziąć

Verb forms:
- bring -> bring / brings / brought / brought
- take -> take / takes / took / taken',
  20
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
set is_recommended = case when slug in ('make-do', 'bring-take') then true else false end
where slug in (
  'make-do',
  'make-do-take-get',
  'get-take',
  'say-tell',
  'say-tell-speak-talk',
  'lend-borrow-rent-hire',
  'bring-take',
  'tenses'
);

with bring_take as (
  select id from public.vocab_clusters where slug = 'bring-take'
)
delete from public.vocab_cluster_patterns
where cluster_id in (select id from bring_take);

with bring_take as (
  select id from public.vocab_clusters where slug = 'bring-take'
)
delete from public.vocab_cluster_examples
where cluster_id in (select id from bring_take);

update public.vocab_cluster_questions
set is_active = false
where cluster_id = (select id from public.vocab_clusters where slug = 'bring-take');

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
    ('bring-take', 'toward the speaker', 'bring it here / bring me some water / bring your book to class', 'przynieś to tutaj / przynieś mi trochę wody / przynieś książkę na zajęcia', 'Użyj bring, gdy coś trafia do mówiącego, słuchacza albo do wspólnego miejsca spotkania.', 'Nie używamy take, jeśli perspektywa jest ''do mnie'', ''tutaj'' albo ''na nasze spotkanie''.', 10),
    ('bring-take', 'away from here', 'take it home / take this upstairs / take the kids to school', 'zabierz to do domu / zanieś to na górę / zabierz dzieci do szkoły', 'Użyj take, gdy coś lub ktoś jest zabierane z obecnego miejsca gdzieś indziej.', 'Nie używamy bring, jeśli ruch jest ''stąd tam''.', 20),
    ('bring-take', 'bring to people and events', 'bring dessert to dinner / bring a friend / bring flowers', 'przynieść deser na kolację / przyprowadzić kolegę / przynieść kwiaty', 'Bring często występuje przy rzeczach i osobach, które przychodzą do kogoś albo na wydarzenie.', 'Take nie pasuje, gdy punkt widzenia jest po stronie miejsca docelowego lub gospodarza.', 30),
    ('bring-take', 'common take collocations', 'take a bus / take a taxi / take a photo / take medicine', 'jechać autobusem / wziąć taksówkę / zrobić zdjęcie / wziąć lekarstwo', 'Take ma też bardzo częste stałe połączenia niezwiązane dosłownie z noszeniem czegoś.', 'W tych wyrażeniach nie używamy bring.', 40)
) as x(slug, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
  on x.slug = c.slug
where c.slug = 'bring-take';

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
    ('bring-take', 'Please bring your bag here.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 10),
    ('bring-take', 'I''ll take this box upstairs.', null, 'take', 'Kolokacja: take', 'manual', '1', 20),
    ('bring-take', 'Can you bring me a glass of water?', null, 'bring', 'Kolokacja: bring', 'manual', '1', 30),
    ('bring-take', 'She always takes the bus to work.', null, 'takes', 'Kolokacja: takes', 'manual', '1', 40),
    ('bring-take', 'Please bring your homework to class tomorrow.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 50),
    ('bring-take', 'Don''t forget to take your keys with you.', null, 'take', 'Kolokacja: take', 'manual', '1', 60),
    ('bring-take', 'I''ll bring some snacks to the party.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 70),
    ('bring-take', 'Can you take the kids to school today?', null, 'take', 'Kolokacja: take', 'manual', '1', 80),
    ('bring-take', 'She brings her laptop to every meeting.', null, 'brings', 'Kolokacja: brings', 'manual', '1', 90),
    ('bring-take', 'We need to take a taxi to the station.', null, 'take', 'Kolokacja: take', 'manual', '1', 100),
    ('bring-take', 'Can I bring a friend to dinner?', null, 'bring', 'Kolokacja: bring', 'manual', '2', 110),
    ('bring-take', 'He takes his lunch to the park.', null, 'takes', 'Kolokacja: takes', 'manual', '2', 120),
    ('bring-take', 'Please bring those chairs in here.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 130),
    ('bring-take', 'I need to take this letter to the post office.', null, 'take', 'Kolokacja: take', 'manual', '1', 140),
    ('bring-take', 'They bring flowers when they visit us.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 150),
    ('bring-take', 'She takes medicine after breakfast.', null, 'takes', 'Kolokacja: takes', 'manual', '2', 160),
    ('bring-take', 'Could you bring your guitar to my place tonight?', null, 'bring', 'Kolokacja: bring', 'manual', '1', 170),
    ('bring-take', 'I''ll take these plates to the kitchen.', null, 'take', 'Kolokacja: take', 'manual', '1', 180),
    ('bring-take', 'He always brings good energy to the team.', null, 'brings', 'Kolokacja: brings', 'manual', '3', 190),
    ('bring-take', 'Can you take a photo of us?', null, 'take', 'Kolokacja: take', 'manual', '1', 200),
    ('bring-take', 'Please bring your umbrella when you come.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 210),
    ('bring-take', 'He takes the dog for a walk every evening.', null, 'takes', 'Kolokacja: takes', 'manual', '2', 220),
    ('bring-take', 'I''ll bring dessert to dinner tonight.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 230),
    ('bring-take', 'Please take this bag home with you.', null, 'take', 'Kolokacja: take', 'manual', '1', 240),
    ('bring-take', 'Can you bring me my phone?', null, 'bring', 'Kolokacja: bring', 'manual', '1', 250),
    ('bring-take', 'She takes the train at seven.', null, 'takes', 'Kolokacja: takes', 'manual', '1', 260),
    ('bring-take', 'They brought their baby to our house yesterday.', null, 'brought', 'Kolokacja: brought', 'manual', '2', 270),
    ('bring-take', 'I took my phone upstairs last night.', null, 'took', 'Kolokacja: took', 'manual', '1', 280),
    ('bring-take', 'She brought some cake for everyone.', null, 'brought', 'Kolokacja: brought', 'manual', '1', 290),
    ('bring-take', 'We took a bus to the museum yesterday.', null, 'took', 'Kolokacja: took', 'manual', '1', 300),
    ('bring-take', 'He brought his brother to the match with us.', null, 'brought', 'Kolokacja: brought', 'manual', '2', 310),
    ('bring-take', 'She took the children to school this morning.', null, 'took', 'Kolokacja: took', 'manual', '1', 320),
    ('bring-take', 'Please bring your notes to my office.', null, 'bring', 'Kolokacja: bring', 'manual', '2', 330),
    ('bring-take', 'I''ll take this jacket back home.', null, 'take', 'Kolokacja: take', 'manual', '1', 340),
    ('bring-take', 'Can you bring some coffee into the room?', null, 'bring', 'Kolokacja: bring', 'manual', '2', 350),
    ('bring-take', 'He took a deep breath before he spoke.', null, 'took', 'Kolokacja: took', 'manual', '2', 360),
    ('bring-take', 'She brought her cousin to our wedding.', null, 'brought', 'Kolokacja: brought', 'manual', '2', 370),
    ('bring-take', 'Please take these books back to the library.', null, 'take', 'Kolokacja: take', 'manual', '2', 380),
    ('bring-take', 'I''ll bring my camera to the party.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 390),
    ('bring-take', 'We took a lot of photos on holiday.', null, 'took', 'Kolokacja: took', 'manual', '1', 400),
    ('bring-take', 'Could you bring a chair over here?', null, 'bring', 'Kolokacja: bring', 'manual', '1', 410),
    ('bring-take', 'She takes some work home every Friday.', null, 'takes', 'Kolokacja: takes', 'manual', '2', 420),
    ('bring-take', 'They bring extra blankets when they stay with us.', null, 'bring', 'Kolokacja: bring', 'manual', '2', 430),
    ('bring-take', 'I''ll take these cups to the kitchen.', null, 'take', 'Kolokacja: take', 'manual', '1', 440),
    ('bring-take', 'Please bring your little sister with you.', null, 'bring', 'Kolokacja: bring', 'manual', '2', 450),
    ('bring-take', 'He brought the shopping into the house.', null, 'brought', 'Kolokacja: brought', 'manual', '2', 460),
    ('bring-take', 'Can you take this folder to the manager?', null, 'take', 'Kolokacja: take', 'manual', '2', 470),
    ('bring-take', 'She brought me my coat a minute ago.', null, 'brought', 'Kolokacja: brought', 'manual', '1', 480),
    ('bring-take', 'We took sandwiches to the beach yesterday.', null, 'took', 'Kolokacja: took', 'manual', '2', 490),
    ('bring-take', 'Please bring some music to the party.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 500),
    ('bring-take', 'I took my umbrella to work this morning.', null, 'took', 'Kolokacja: took', 'manual', '2', 510),
    ('bring-take', 'They brought a nice gift for us.', null, 'brought', 'Kolokacja: brought', 'manual', '1', 520),
    ('bring-take', 'Can you take the empty bottles outside?', null, 'take', 'Kolokacja: take', 'manual', '1', 530),
    ('bring-take', 'She brings her own lunch when she visits us.', null, 'brings', 'Kolokacja: brings', 'manual', '2', 540),
    ('bring-take', 'We need to take the dog to the vet.', null, 'take', 'Kolokacja: take', 'manual', '1', 550),
    ('bring-take', 'I''ll bring your book back tomorrow.', null, 'bring', 'Kolokacja: bring', 'manual', '2', 560),
    ('bring-take', 'He takes a sandwich to school every day.', null, 'takes', 'Kolokacja: takes', 'manual', '1', 570),
    ('bring-take', 'Can you bring your passport to the airport desk?', null, 'bring', 'Kolokacja: bring', 'manual', '2', 580),
    ('bring-take', 'She took the baby upstairs after lunch.', null, 'took', 'Kolokacja: took', 'manual', '2', 590),
    ('bring-take', 'Please bring your friend to my birthday party.', null, 'bring', 'Kolokacja: bring', 'manual', '1', 600)
) as x(slug, example_en, example_pl, focus_term, note, source, difficulty, sort_order)
  on x.slug = c.slug
where c.slug = 'bring-take';

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
    ('bring-take', 'Please __ your bag here.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 10, 'Wybierz właściwe słowo.', 'Please bring your bag here.'),
    ('bring-take', 'I''ll __ this box upstairs.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 20, 'Wybierz właściwe słowo.', 'I''ll take this box upstairs.'),
    ('bring-take', 'Can you __ me a glass of water?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 30, 'Wybierz właściwe słowo.', 'Can you bring me a glass of water?'),
    ('bring-take', 'She always __ the bus to work.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 40, 'Wybierz właściwe słowo.', 'She always takes the bus to work.'),
    ('bring-take', 'Please __ your homework to class tomorrow.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 50, 'Wybierz właściwe słowo.', 'Please bring your homework to class tomorrow.'),
    ('bring-take', 'Don''t forget to __ your keys with you.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 60, 'Wybierz właściwe słowo.', 'Don''t forget to take your keys with you.'),
    ('bring-take', 'I''ll __ some snacks to the party.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 70, 'Wybierz właściwe słowo.', 'I''ll bring some snacks to the party.'),
    ('bring-take', 'Can you __ the kids to school today?', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 80, 'Wybierz właściwe słowo.', 'Can you take the kids to school today?'),
    ('bring-take', 'She __ her laptop to every meeting.', 'collocation', 'choice', null, 'brings', 'brings', ARRAY['brings', 'takes']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 90, 'Wybierz właściwe słowo.', 'She brings her laptop to every meeting.'),
    ('bring-take', 'We need to __ a taxi to the station.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 100, 'Wybierz właściwe słowo.', 'We need to take a taxi to the station.'),
    ('bring-take', 'Can I __ a friend to dinner?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 110, 'Wybierz właściwe słowo.', 'Can I bring a friend to dinner?'),
    ('bring-take', 'He __ his lunch to the park.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 120, 'Wybierz właściwe słowo.', 'He takes his lunch to the park.'),
    ('bring-take', 'Please __ those chairs in here.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 130, 'Wybierz właściwe słowo.', 'Please bring those chairs in here.'),
    ('bring-take', 'I need to __ this letter to the post office.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 140, 'Wybierz właściwe słowo.', 'I need to take this letter to the post office.'),
    ('bring-take', 'They __ flowers when they visit us.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 150, 'Wybierz właściwe słowo.', 'They bring flowers when they visit us.'),
    ('bring-take', 'She __ medicine after breakfast.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 160, 'Wybierz właściwe słowo.', 'She takes medicine after breakfast.'),
    ('bring-take', 'Could you __ your guitar to my place tonight?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 170, 'Wybierz właściwe słowo.', 'Could you bring your guitar to my place tonight?'),
    ('bring-take', 'I''ll __ these plates to the kitchen.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 180, 'Wybierz właściwe słowo.', 'I''ll take these plates to the kitchen.'),
    ('bring-take', 'He always __ good energy to the team.', 'collocation', 'choice', null, 'brings', 'brings', ARRAY['brings', 'takes']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 190, 'Wybierz właściwe słowo.', 'He always brings good energy to the team.'),
    ('bring-take', 'Can you __ a photo of us?', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 200, 'Wybierz właściwe słowo.', 'Can you take a photo of us?'),
    ('bring-take', 'Please __ your umbrella when you come.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 210, 'Wybierz właściwe słowo.', 'Please bring your umbrella when you come.'),
    ('bring-take', 'He __ the dog for a walk every evening.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 220, 'Wybierz właściwe słowo.', 'He takes the dog for a walk every evening.'),
    ('bring-take', 'I''ll __ dessert to dinner tonight.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 230, 'Wybierz właściwe słowo.', 'I''ll bring dessert to dinner tonight.'),
    ('bring-take', 'Please __ this bag home with you.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 240, 'Wybierz właściwe słowo.', 'Please take this bag home with you.'),
    ('bring-take', 'Can you __ me my phone?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 250, 'Wybierz właściwe słowo.', 'Can you bring me my phone?'),
    ('bring-take', 'She __ the train at seven.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 260, 'Wybierz właściwe słowo.', 'She takes the train at seven.'),
    ('bring-take', 'They __ their baby to our house yesterday.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 270, 'Wybierz właściwe słowo.', 'They brought their baby to our house yesterday.'),
    ('bring-take', 'I __ my phone upstairs last night.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 280, 'Wybierz właściwe słowo.', 'I took my phone upstairs last night.'),
    ('bring-take', 'She __ some cake for everyone.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 290, 'Wybierz właściwe słowo.', 'She brought some cake for everyone.'),
    ('bring-take', 'We __ a bus to the museum yesterday.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 300, 'Wybierz właściwe słowo.', 'We took a bus to the museum yesterday.'),
    ('bring-take', 'He __ his brother to the match with us.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 310, 'Wybierz właściwe słowo.', 'He brought his brother to the match with us.'),
    ('bring-take', 'She __ the children to school this morning.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 320, 'Wybierz właściwe słowo.', 'She took the children to school this morning.'),
    ('bring-take', 'Please __ your notes to my office.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 330, 'Wybierz właściwe słowo.', 'Please bring your notes to my office.'),
    ('bring-take', 'I''ll __ this jacket back home.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 340, 'Wybierz właściwe słowo.', 'I''ll take this jacket back home.'),
    ('bring-take', 'Can you __ some coffee into the room?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 350, 'Wybierz właściwe słowo.', 'Can you bring some coffee into the room?'),
    ('bring-take', 'He __ a deep breath before he spoke.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 360, 'Wybierz właściwe słowo.', 'He took a deep breath before he spoke.'),
    ('bring-take', 'She __ her cousin to our wedding.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 370, 'Wybierz właściwe słowo.', 'She brought her cousin to our wedding.'),
    ('bring-take', 'Please __ these books back to the library.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 380, 'Wybierz właściwe słowo.', 'Please take these books back to the library.'),
    ('bring-take', 'I''ll __ my camera to the party.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 390, 'Wybierz właściwe słowo.', 'I''ll bring my camera to the party.'),
    ('bring-take', 'We __ a lot of photos on holiday.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 400, 'Wybierz właściwe słowo.', 'We took a lot of photos on holiday.'),
    ('bring-take', 'Could you __ a chair over here?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 410, 'Wybierz właściwe słowo.', 'Could you bring a chair over here?'),
    ('bring-take', 'She __ some work home every Friday.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 420, 'Wybierz właściwe słowo.', 'She takes some work home every Friday.'),
    ('bring-take', 'They __ extra blankets when they stay with us.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 430, 'Wybierz właściwe słowo.', 'They bring extra blankets when they stay with us.'),
    ('bring-take', 'I''ll __ these cups to the kitchen.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 440, 'Wybierz właściwe słowo.', 'I''ll take these cups to the kitchen.'),
    ('bring-take', 'Please __ your little sister with you.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 450, 'Wybierz właściwe słowo.', 'Please bring your little sister with you.'),
    ('bring-take', 'He __ the shopping into the house.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 460, 'Wybierz właściwe słowo.', 'He brought the shopping into the house.'),
    ('bring-take', 'Can you __ this folder to the manager?', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 470, 'Wybierz właściwe słowo.', 'Can you take this folder to the manager?'),
    ('bring-take', 'She __ me my coat a minute ago.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 480, 'Wybierz właściwe słowo.', 'She brought me my coat a minute ago.'),
    ('bring-take', 'We __ sandwiches to the beach yesterday.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 490, 'Wybierz właściwe słowo.', 'We took sandwiches to the beach yesterday.'),
    ('bring-take', 'Please __ some music to the party.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 500, 'Wybierz właściwe słowo.', 'Please bring some music to the party.'),
    ('bring-take', 'I __ my umbrella to work this morning.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 510, 'Wybierz właściwe słowo.', 'I took my umbrella to work this morning.'),
    ('bring-take', 'They __ a nice gift for us.', 'collocation', 'choice', null, 'brought', 'brought', ARRAY['brought', 'took']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 520, 'Wybierz właściwe słowo.', 'They brought a nice gift for us.'),
    ('bring-take', 'Can you __ the empty bottles outside?', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 530, 'Wybierz właściwe słowo.', 'Can you take the empty bottles outside?'),
    ('bring-take', 'She __ her own lunch when she visits us.', 'collocation', 'choice', null, 'brings', 'brings', ARRAY['brings', 'takes']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 540, 'Wybierz właściwe słowo.', 'She brings her own lunch when she visits us.'),
    ('bring-take', 'We need to __ the dog to the vet.', 'collocation', 'choice', null, 'take', 'take', ARRAY['take', 'bring']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 550, 'Wybierz właściwe słowo.', 'We need to take the dog to the vet.'),
    ('bring-take', 'I''ll __ your book back tomorrow.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 560, 'Wybierz właściwe słowo.', 'I''ll bring your book back tomorrow.'),
    ('bring-take', 'He __ a sandwich to school every day.', 'collocation', 'choice', null, 'takes', 'takes', ARRAY['takes', 'brings']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 570, 'Wybierz właściwe słowo.', 'He takes a sandwich to school every day.'),
    ('bring-take', 'Can you __ your passport to the airport desk?', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 580, 'Wybierz właściwe słowo.', 'Can you bring your passport to the airport desk?'),
    ('bring-take', 'She __ the baby upstairs after lunch.', 'collocation', 'choice', null, 'took', 'took', ARRAY['took', 'brought']::text[], 'take', 'W tym zdaniu potrzebujesz take w odpowiedniej formie.', 590, 'Wybierz właściwe słowo.', 'She took the baby upstairs after lunch.'),
    ('bring-take', 'Please __ your friend to my birthday party.', 'collocation', 'choice', null, 'bring', 'bring', ARRAY['bring', 'take']::text[], 'bring', 'W tym zdaniu potrzebujesz bring w odpowiedniej formie.', 600, 'Wybierz właściwe słowo.', 'Please bring your friend to my birthday party.')
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
where c.slug = 'bring-take';

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
  array[x.target_lemma]::text[],
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś to tutaj.', 'Bring it here.', ARRAY['Bring it here.', 'Please bring it here.']::text[], ARRAY['Bring it here.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring it here', 2000, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zabierz to do domu.', 'Take it home.', ARRAY['Take it home.', 'Please take it home.']::text[], ARRAY['Take it home.', '__text__']::text[], 'take', 'Kluczowe połączenie: take it home', 2001, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś mi wodę.', 'Bring me some water.', ARRAY['Bring me some water.', 'Please bring me some water.']::text[], ARRAY['Bring me some water.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring me some water', 2002, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zabierz dzieci do szkoły.', 'Take the kids to school.', ARRAY['Take the kids to school.', 'Take the children to school.']::text[], ARRAY['Take the kids to school.', '__text__']::text[], 'take', 'Kluczowe połączenie: take the kids to school', 2003, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś laptop na spotkanie.', 'Bring your laptop to the meeting.', ARRAY['Bring your laptop to the meeting.', 'Please bring your laptop to the meeting.']::text[], ARRAY['Bring your laptop to the meeting.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring your laptop to the meeting', 2004, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Weź autobus do pracy.', 'Take the bus to work.', ARRAY['Take the bus to work.', 'You can take the bus to work.']::text[], ARRAY['Take the bus to work.', '__text__']::text[], 'take', 'Kluczowe połączenie: take the bus', 2005, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś deser na kolację.', 'Bring dessert to dinner.', ARRAY['Bring dessert to dinner.', 'Please bring dessert to dinner.']::text[], ARRAY['Bring dessert to dinner.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring dessert to dinner', 2006, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zanieś to na górę.', 'Take it upstairs.', ARRAY['Take it upstairs.', 'Please take it upstairs.']::text[], ARRAY['Take it upstairs.', '__text__']::text[], 'take', 'Kluczowe połączenie: take it upstairs', 2007, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przyprowadź kolegę na imprezę.', 'Bring a friend to the party.', ARRAY['Bring a friend to the party.', 'You can bring a friend to the party.']::text[], ARRAY['Bring a friend to the party.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring a friend', 2008, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zabierz psa do weterynarza.', 'Take the dog to the vet.', ARRAY['Take the dog to the vet.', 'Please take the dog to the vet.']::text[], ARRAY['Take the dog to the vet.', '__text__']::text[], 'take', 'Kluczowe połączenie: take the dog to the vet', 2009, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś książkę do klasy.', 'Bring your book to class.', ARRAY['Bring your book to class.', 'Please bring your book to class.']::text[], ARRAY['Bring your book to class.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring your book to class', 2010, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Weź taksówkę na lotnisko.', 'Take a taxi to the airport.', ARRAY['Take a taxi to the airport.', 'You should take a taxi to the airport.']::text[], ARRAY['Take a taxi to the airport.', '__text__']::text[], 'take', 'Kluczowe połączenie: take a taxi', 2011, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś mi mój płaszcz.', 'Bring me my coat.', ARRAY['Bring me my coat.', 'Please bring me my coat.']::text[], ARRAY['Bring me my coat.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring me my coat', 2012, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zabierz te talerze do kuchni.', 'Take these plates to the kitchen.', ARRAY['Take these plates to the kitchen.', 'Please take these plates to the kitchen.']::text[], ARRAY['Take these plates to the kitchen.', '__text__']::text[], 'take', 'Kluczowe połączenie: take these plates to the kitchen', 2013, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś trochę muzyki na imprezę.', 'Bring some music to the party.', ARRAY['Bring some music to the party.', 'Please bring some music to the party.']::text[], ARRAY['Bring some music to the party.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring some music to the party', 2014, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zabierz to ze sobą.', 'Take it with you.', ARRAY['Take it with you.', 'Please take it with you.']::text[], ARRAY['Take it with you.', '__text__']::text[], 'take', 'Kluczowe połączenie: take it with you', 2015, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś kwiaty do mamy.', 'Bring flowers to your mum.', ARRAY['Bring flowers to your mum.', 'Bring some flowers to your mum.']::text[], ARRAY['Bring flowers to your mum.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring flowers', 2016, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Zrób zdjęcie.', 'Take a photo.', ARRAY['Take a photo.', 'Please take a photo.']::text[], ARRAY['Take a photo.', '__text__']::text[], 'take', 'Kluczowe połączenie: take a photo', 2017, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Przynieś dzieci do mnie.', 'Bring the kids to me.', ARRAY['Bring the kids to me.', 'Bring the children to me.']::text[], ARRAY['Bring the kids to me.', '__text__']::text[], 'bring', 'Kluczowe połączenie: bring the kids to me', 2018, 'Przetłumacz na angielski, używając właściwego słowa.'),
    ('bring-take', 'Przetłumacz zdanie', 'translation', 'translation', 'Weź lekarstwo po śniadaniu.', 'Take your medicine after breakfast.', ARRAY['Take your medicine after breakfast.', 'Take the medicine after breakfast.']::text[], ARRAY['Take your medicine after breakfast.', '__text__']::text[], 'take', 'Kluczowe połączenie: take your medicine', 2019, 'Przetłumacz na angielski, używając właściwego słowa.')
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
where c.slug = 'bring-take';

commit;
