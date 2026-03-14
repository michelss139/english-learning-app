-- Migration: Seed production content package for hear-listen cluster
-- Date: 2026-03-13
-- Scope: content only for the existing hear-listen cluster

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
  'hear-listen',
  'hear / listen',
  true,
  false,
  'Hear oznacza słyszeć, czyli dźwięk dociera do ciebie sam, a listen oznacza słuchać, czyli świadomie kierować uwagę na dźwięk lub osobę.',
  'Rozróżniaj hear i listen w codziennych sytuacjach oraz wybieraj właściwy czasownik w krótkich, naturalnych zdaniach.',
  E'hear i listen oba odnoszą się do słuchania, ale nie znaczą tego samego. hear oznacza, że coś słyszysz, czyli dźwięk po prostu dociera do twoich uszu, na przykład I can hear music. listen oznacza, że słuchasz uważnie, czyli świadomie kierujesz uwagę na dźwięk, osobę albo nagranie, na przykład Listen to me albo I listen to podcasts. Ważna wskazówka gramatyczna jest taka, że bardzo często mówimy listen to somebody / something, a po hear zwykle od razu stawiamy osobę, dźwięk albo rzecz, na przykład hear somebody, hear music, hear a noise. Prosta reguła: jeśli dźwięk dociera do ciebie sam, zwykle użyj hear; jeśli aktywnie skupiasz uwagę, zwykle użyj listen.

Polskie tłumaczenie:
- hear -> słyszeć, usłyszeć
- listen -> słuchać, posłuchać

Verb forms:
- hear -> hear / hears / heard / heard
- listen -> listen / listens / listened / listened',
  60
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
set is_recommended = case when slug in ('make-do', 'bring-take', 'hear-listen') then true else false end
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

with hear_listen as (
  select id from public.vocab_clusters where slug = 'hear-listen'
)
delete from public.vocab_cluster_patterns
where cluster_id in (select id from hear_listen);

update public.vocab_cluster_questions
set is_active = false
where cluster_id = (select id from public.vocab_clusters where slug = 'hear-listen');

alter table public.vocab_cluster_questions
  add column if not exists target_tokens text[];

insert into public.lexicon_entries (lemma, lemma_norm, pos)
select
  x.lemma,
  x.lemma_norm,
  x.pos
from (
  values
    ('hear', 'hear', 'verb'),
    ('listen', 'listen', 'verb')
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
 and le.lemma_norm in ('hear', 'listen')
where c.slug = 'hear-listen'
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
    ('hear-listen', 'passive sound vs active attention', 'hear a noise / hear music / listen carefully / listen to me', 'usłyszeć hałas / słyszeć muzykę / słuchać uważnie / słuchaj mnie', 'Użyj hear, gdy dźwięk po prostu do ciebie dociera. Użyj listen, gdy świadomie skupiasz uwagę na tym, co słyszysz.', 'Przy listen bardzo często mamy listen to someone / something. Po hear od razu stawiamy osobę, dźwięk albo rzecz: hear somebody / something.', 10),
    ('hear-listen', 'listen to people and audio', 'listen to the teacher / listen to music / listen to a podcast', 'słuchać nauczyciela / słuchać muzyki / słuchać podcastu', 'Listen zwykle łączy się z to, gdy mówimy, kogo lub czego słuchamy.', 'Nie mówimy listen music. Naturalny wzór to listen to music.', 20),
    ('hear-listen', 'hear sounds and voices', 'hear a sound / hear a voice / hear the news / hear someone at the door', 'usłyszeć dźwięk / usłyszeć głos / usłyszeć wiadomość / usłyszeć kogoś przy drzwiach', 'Hear pasuje do dźwięków, głosów i informacji, które po prostu docierają do uszu.', 'Po hear nie dajemy to. Mówimy hear a voice, nie hear to a voice.', 30),
    ('hear-listen', 'short everyday phrases', 'can you hear me / listen to me / hear the phone / listen carefully', 'czy mnie słyszysz / posłuchaj mnie / słyszeć telefon / słuchaj uważnie', 'To bardzo częste krótkie wyrażenia w codziennych rozmowach.', 'Hear sprawdza, czy dźwięk dociera. Listen prosi o uwagę i skupienie.', 40)
) as x(slug, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order)
  on x.slug = c.slug
where c.slug = 'hear-listen';

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
  x.correct_choice,
  x.choices,
  x.explanation,
  x.task_type,
  x.instruction,
  null,
  null,
  null,
  null,
  null,
  x.sort_order,
  true
from public.vocab_clusters c
join (
  values
    ('hear-listen', 'Can you __ me now?', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 10, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Please __ to me for a minute.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 20, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'I can __ music from the kitchen.', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 30, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'She always __ to podcasts on the bus.', 'collocation', 'choice', null, 'listens', 'listens', ARRAY['listens', 'hears']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 40, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Did you __ that strange noise?', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 50, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'The children never __ to the teacher.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 60, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'I couldn''t __ what he said.', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 70, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'You should __ carefully to the instructions.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 80, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'We __ someone knocking at the door.', 'collocation', 'choice', null, 'heard', 'heard', ARRAY['heard', 'listened']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 90, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'He never __ to my advice.', 'collocation', 'choice', null, 'listens', 'listens', ARRAY['listens', 'hears']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 100, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Can you __ the birds outside?', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 110, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'I like to __ to music when I work.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 120, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'She __ a loud crash last night.', 'collocation', 'choice', null, 'heard', 'heard', ARRAY['heard', 'listened']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 130, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Please __ to this song.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 140, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'I didn''t __ my phone ring.', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 150, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'They often __ to the radio in the car.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 160, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'We could __ people talking outside.', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 170, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'You need to __ to the whole question.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 180, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'He __ his name in the crowd.', 'collocation', 'choice', null, 'heard', 'heard', ARRAY['heard', 'listened']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 190, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'My dad always __ to the news in the morning.', 'collocation', 'choice', null, 'listens', 'listens', ARRAY['listens', 'hears']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 200, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Can you __ me at the back?', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 210, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'Nobody __ to him during the meeting.', 'collocation', 'choice', null, 'listened', 'listened', ARRAY['listened', 'heard']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 220, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'I __ a voice behind me.', 'collocation', 'choice', null, 'heard', 'heard', ARRAY['heard', 'listened']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 230, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'She likes to __ to true crime podcasts.', 'collocation', 'choice', null, 'listen', 'listen', ARRAY['listen', 'hear']::text[], 'listen', 'W tym zdaniu potrzebujesz listen w odpowiedniej formie.', 240, 'Wybierz właściwe słowo.'),
    ('hear-listen', 'We can __ the rain on the roof.', 'collocation', 'choice', null, 'hear', 'hear', ARRAY['hear', 'listen']::text[], 'hear', 'W tym zdaniu potrzebujesz hear w odpowiedniej formie.', 250, 'Wybierz właściwe słowo.')
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
where c.slug = 'hear-listen';

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
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Czy mnie słyszysz?', 'Can you hear me?', ARRAY['Can you hear me?', 'Do you hear me?']::text[], ARRAY['Can you hear me?', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2000, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Posłuchaj mnie przez chwilę.', 'Listen to me for a minute.', ARRAY['Listen to me for a minute.', 'Please listen to me for a minute.']::text[], ARRAY['Listen to me for a minute.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2001, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Słyszę muzykę z kuchni.', 'I can hear music from the kitchen.', ARRAY['I can hear music from the kitchen.', 'I hear music from the kitchen.']::text[], ARRAY['I can hear music from the kitchen.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2002, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Ona słucha podcastów w autobusie.', 'She listens to podcasts on the bus.', ARRAY['She listens to podcasts on the bus.']::text[], ARRAY['She listens to podcasts on the bus.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2003, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Usłyszałem dziwny hałas.', 'I heard a strange noise.', ARRAY['I heard a strange noise.']::text[], ARRAY['I heard a strange noise.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2004, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Dzieci nie słuchają nauczyciela.', 'The children don''t listen to the teacher.', ARRAY['The children don''t listen to the teacher.', 'The children do not listen to the teacher.']::text[], ARRAY['The children don''t listen to the teacher.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2005, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Nie słyszałem telefonu.', 'I didn''t hear the phone.', ARRAY['I didn''t hear the phone.', 'I did not hear the phone.']::text[], ARRAY['I didn''t hear the phone.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2006, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Zawsze słuchamy radia w samochodzie.', 'We always listen to the radio in the car.', ARRAY['We always listen to the radio in the car.']::text[], ARRAY['We always listen to the radio in the car.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2007, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Słyszę ptaki na zewnątrz.', 'I can hear the birds outside.', ARRAY['I can hear the birds outside.', 'I hear the birds outside.']::text[], ARRAY['I can hear the birds outside.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2008, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Powinieneś słuchać uważnie.', 'You should listen carefully.', ARRAY['You should listen carefully.']::text[], ARRAY['You should listen carefully.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2009, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Usłyszeliśmy pukanie do drzwi.', 'We heard someone knocking at the door.', ARRAY['We heard someone knocking at the door.', 'We heard knocking at the door.']::text[], ARRAY['We heard someone knocking at the door.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2010, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Proszę, posłuchaj tej piosenki.', 'Please listen to this song.', ARRAY['Please listen to this song.', 'Listen to this song, please.']::text[], ARRAY['Please listen to this song.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2011, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Czy słyszysz deszcz?', 'Can you hear the rain?', ARRAY['Can you hear the rain?', 'Do you hear the rain?']::text[], ARRAY['Can you hear the rain?', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2012, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'On nigdy nie słucha moich rad.', 'He never listens to my advice.', ARRAY['He never listens to my advice.']::text[], ARRAY['He never listens to my advice.', '__text__']::text[], 'listen', 'Użyj właściwego czasownika z pary hear / listen.', 2013, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['listen']::text[]),
    ('hear-listen', 'Przetłumacz zdanie', 'translation', 'translation', 'Usłyszałam swoje imię.', 'I heard my name.', ARRAY['I heard my name.']::text[], ARRAY['I heard my name.', '__text__']::text[], 'hear', 'Użyj właściwego czasownika z pary hear / listen.', 2014, 'Przetłumacz na angielski, używając właściwego słowa.', ARRAY['hear']::text[])
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
where c.slug = 'hear-listen';

commit;
