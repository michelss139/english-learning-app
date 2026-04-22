-- Remove " (Precyzyjne)" / " (Codzienne)" from pack titles (mode is shown in UI tabs).
-- Complements 20260416120000_vocab_pack_strip_mode_suffix_from_title.sql (English only).

begin;

update public.vocab_packs
set title = trim(regexp_replace(title, '\s*\([Pp]recyzyjne\)\s*$', ''))
where title ~ '\([Pp]recyzyjne\)\s*$';

update public.vocab_packs
set title = trim(regexp_replace(title, '\s*\([Cc]odzienne\)\s*$', ''))
where title ~ '\([Cc]odzienne\)\s*$';

update public.vocab_packs
set display_title = trim(regexp_replace(display_title, '\s*\([Pp]recyzyjne\)\s*$', ''))
where display_title is not null
  and display_title ~ '\([Pp]recyzyjne\)\s*$';

update public.vocab_packs
set display_title = trim(regexp_replace(display_title, '\s*\([Cc]odzienne\)\s*$', ''))
where display_title is not null
  and display_title ~ '\([Cc]odzienne\)\s*$';

commit;
