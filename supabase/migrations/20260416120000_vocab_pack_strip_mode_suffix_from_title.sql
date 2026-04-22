-- Remove " (Daily)" / " (Precise)" from pack titles (mode is shown in UI tabs).

begin;

update public.vocab_packs
set title = trim(regexp_replace(title, '\s*\([Dd]aily\)\s*$', ''))
where title ~ '\([Dd]aily\)\s*$';

update public.vocab_packs
set title = trim(regexp_replace(title, '\s*\([Pp]recise\)\s*$', ''))
where title ~ '\([Pp]recise\)\s*$';

commit;
