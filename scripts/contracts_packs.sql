-- Create vocab packs for contracts (idempotent)

begin;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-general', 'Umowy — Pojęcia ogólne', 'Podstawowe pojęcia związane z umowami.', true, 60)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-formation', 'Umowy — Zawarcie i obowiązywanie umowy', 'Zawarcie, czas trwania i zakończenie umowy.', true, 61)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-parties', 'Umowy — Strony i role', 'Role i strony umowy.', true, 62)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-rental', 'Umowy — Umowa najmu', 'Najem i podstawowe warunki.', true, 63)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-leasing', 'Umowy — Leasing', 'Leasing i warunki umowy leasingowej.', true, 64)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-services', 'Umowy — Umowy usługowe', 'Usługi i ich realizacja.', true, 65)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-trade', 'Umowy — Umowy handlowe i współpraca', 'Handel, współpraca i dostawy.', true, 66)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-payments', 'Umowy — Wynagrodzenie i płatności', 'Rozliczenia i terminy płatności.', true, 67)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-liability', 'Umowy — Odpowiedzialność i zabezpieczenia', 'Odpowiedzialność, kary i gwarancje.', true, 68)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-confidentiality', 'Umowy — Poufność i dane', 'Poufność i dane w umowach.', true, 69)
on conflict (slug) do nothing;

insert into vocab_packs (slug, title, description, is_published, order_index)
values ('contracts-disputes', 'Umowy — Spory i zakończenie współpracy', 'Spory i zakończenie relacji.', true, 70)
on conflict (slug) do nothing;

commit;
