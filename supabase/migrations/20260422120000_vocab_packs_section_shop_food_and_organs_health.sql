-- Shop → Food & Shopping (remove standalone "Start Here" section in catalog).
-- Internal organs daily pack → Health & Body (avoids unsectioned / "Inne" bucket when display_section was never set).

begin;

update public.vocab_packs
set display_section = 'Food & Shopping'
where slug = 'shop'
  and vocab_mode = 'daily';

update public.vocab_packs
set display_section = 'Health & Body'
where slug = 'body-daily-organs'
  and vocab_mode = 'daily';

commit;
