-- Batch import for contracts packs lexicon data (business/legal nouns)
-- Idempotent inserts: lexicon_entries, lexicon_senses, lexicon_translations, lexicon_examples

begin;

-- ============================================
-- Pack A: UMOWY — Pojecia ogolne
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('agreement', 'agreement', 'noun', 'a formal arrangement between parties', 'umowa', 'The agreement is signed.', 1),
    ('contract', 'contract', 'noun', 'a legally binding agreement', 'kontrakt', 'The contract is binding.', 2),
    ('understanding', 'understanding', 'noun', 'an informal agreement between parties', 'porozumienie', 'We reached an understanding.', 3),
    ('terms', 'terms', 'noun', 'the conditions of a contract', 'warunki', 'The terms are clear.', 4),
    ('provisions', 'provisions', 'noun', 'specific rules in a contract', 'postanowienia', 'Read the provisions carefully.', 5),
    ('contracting parties', 'contracting parties', 'noun', 'the parties that sign a contract', 'strony umowy', 'The contracting parties met today.', 6),
    ('subject of the contract', 'subject of the contract', 'noun', 'what the contract covers', 'przedmiot umowy', 'The subject of the contract is delivery.', 7),
    ('scope', 'scope', 'noun', 'the extent of obligations', 'zakres', 'The scope is limited.', 8),
    ('obligations', 'obligations', 'noun', 'duties under a contract', 'obowiazki', 'The obligations are listed.', 9),
    ('rights', 'rights', 'noun', 'legal entitlements under a contract', 'prawa', 'The rights are protected.', 10),
    ('liability', 'liability', 'noun', 'legal responsibility for damage', 'odpowiedzialnosc', 'Liability is limited.', 11),
    ('risk', 'risk', 'noun', 'the chance of loss', 'ryzyko', 'The risk is shared.', 12),
    ('clause', 'clause', 'noun', 'a specific part of a contract', 'klauzula', 'This clause is important.', 13),
    ('appendix', 'appendix', 'noun', 'an attachment to a contract', 'zalacznik', 'The appendix is attached.', 14),
    ('amendment', 'amendment', 'noun', 'a formal change to a contract', 'aneks', 'The amendment changes the price.', 15),
    ('contract version', 'contract version', 'noun', 'a specific version of a contract', 'wersja umowy', 'Use the latest contract version.', 16)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('agreement', 'agreement', 'noun', 'a formal arrangement between parties', 'umowa', 'The agreement is signed.', 1),
    ('contract', 'contract', 'noun', 'a legally binding agreement', 'kontrakt', 'The contract is binding.', 2),
    ('understanding', 'understanding', 'noun', 'an informal agreement between parties', 'porozumienie', 'We reached an understanding.', 3),
    ('terms', 'terms', 'noun', 'the conditions of a contract', 'warunki', 'The terms are clear.', 4),
    ('provisions', 'provisions', 'noun', 'specific rules in a contract', 'postanowienia', 'Read the provisions carefully.', 5),
    ('contracting parties', 'contracting parties', 'noun', 'the parties that sign a contract', 'strony umowy', 'The contracting parties met today.', 6),
    ('subject of the contract', 'subject of the contract', 'noun', 'what the contract covers', 'przedmiot umowy', 'The subject of the contract is delivery.', 7),
    ('scope', 'scope', 'noun', 'the extent of obligations', 'zakres', 'The scope is limited.', 8),
    ('obligations', 'obligations', 'noun', 'duties under a contract', 'obowiazki', 'The obligations are listed.', 9),
    ('rights', 'rights', 'noun', 'legal entitlements under a contract', 'prawa', 'The rights are protected.', 10),
    ('liability', 'liability', 'noun', 'legal responsibility for damage', 'odpowiedzialnosc', 'Liability is limited.', 11),
    ('risk', 'risk', 'noun', 'the chance of loss', 'ryzyko', 'The risk is shared.', 12),
    ('clause', 'clause', 'noun', 'a specific part of a contract', 'klauzula', 'This clause is important.', 13),
    ('appendix', 'appendix', 'noun', 'an attachment to a contract', 'zalacznik', 'The appendix is attached.', 14),
    ('amendment', 'amendment', 'noun', 'a formal change to a contract', 'aneks', 'The amendment changes the price.', 15),
    ('contract version', 'contract version', 'noun', 'a specific version of a contract', 'wersja umowy', 'Use the latest contract version.', 16)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('agreement', 'agreement', 'noun', 'a formal arrangement between parties', 'umowa', 'The agreement is signed.', 1),
    ('contract', 'contract', 'noun', 'a legally binding agreement', 'kontrakt', 'The contract is binding.', 2),
    ('understanding', 'understanding', 'noun', 'an informal agreement between parties', 'porozumienie', 'We reached an understanding.', 3),
    ('terms', 'terms', 'noun', 'the conditions of a contract', 'warunki', 'The terms are clear.', 4),
    ('provisions', 'provisions', 'noun', 'specific rules in a contract', 'postanowienia', 'Read the provisions carefully.', 5),
    ('contracting parties', 'contracting parties', 'noun', 'the parties that sign a contract', 'strony umowy', 'The contracting parties met today.', 6),
    ('subject of the contract', 'subject of the contract', 'noun', 'what the contract covers', 'przedmiot umowy', 'The subject of the contract is delivery.', 7),
    ('scope', 'scope', 'noun', 'the extent of obligations', 'zakres', 'The scope is limited.', 8),
    ('obligations', 'obligations', 'noun', 'duties under a contract', 'obowiazki', 'The obligations are listed.', 9),
    ('rights', 'rights', 'noun', 'legal entitlements under a contract', 'prawa', 'The rights are protected.', 10),
    ('liability', 'liability', 'noun', 'legal responsibility for damage', 'odpowiedzialnosc', 'Liability is limited.', 11),
    ('risk', 'risk', 'noun', 'the chance of loss', 'ryzyko', 'The risk is shared.', 12),
    ('clause', 'clause', 'noun', 'a specific part of a contract', 'klauzula', 'This clause is important.', 13),
    ('appendix', 'appendix', 'noun', 'an attachment to a contract', 'zalacznik', 'The appendix is attached.', 14),
    ('amendment', 'amendment', 'noun', 'a formal change to a contract', 'aneks', 'The amendment changes the price.', 15),
    ('contract version', 'contract version', 'noun', 'a specific version of a contract', 'wersja umowy', 'Use the latest contract version.', 16)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('agreement', 'agreement', 'noun', 'a formal arrangement between parties', 'umowa', 'The agreement is signed.', 1),
    ('contract', 'contract', 'noun', 'a legally binding agreement', 'kontrakt', 'The contract is binding.', 2),
    ('understanding', 'understanding', 'noun', 'an informal agreement between parties', 'porozumienie', 'We reached an understanding.', 3),
    ('terms', 'terms', 'noun', 'the conditions of a contract', 'warunki', 'The terms are clear.', 4),
    ('provisions', 'provisions', 'noun', 'specific rules in a contract', 'postanowienia', 'Read the provisions carefully.', 5),
    ('contracting parties', 'contracting parties', 'noun', 'the parties that sign a contract', 'strony umowy', 'The contracting parties met today.', 6),
    ('subject of the contract', 'subject of the contract', 'noun', 'what the contract covers', 'przedmiot umowy', 'The subject of the contract is delivery.', 7),
    ('scope', 'scope', 'noun', 'the extent of obligations', 'zakres', 'The scope is limited.', 8),
    ('obligations', 'obligations', 'noun', 'duties under a contract', 'obowiazki', 'The obligations are listed.', 9),
    ('rights', 'rights', 'noun', 'legal entitlements under a contract', 'prawa', 'The rights are protected.', 10),
    ('liability', 'liability', 'noun', 'legal responsibility for damage', 'odpowiedzialnosc', 'Liability is limited.', 11),
    ('risk', 'risk', 'noun', 'the chance of loss', 'ryzyko', 'The risk is shared.', 12),
    ('clause', 'clause', 'noun', 'a specific part of a contract', 'klauzula', 'This clause is important.', 13),
    ('appendix', 'appendix', 'noun', 'an attachment to a contract', 'zalacznik', 'The appendix is attached.', 14),
    ('amendment', 'amendment', 'noun', 'a formal change to a contract', 'aneks', 'The amendment changes the price.', 15),
    ('contract version', 'contract version', 'noun', 'a specific version of a contract', 'wersja umowy', 'Use the latest contract version.', 16)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack B: UMOWY — Zawarcie i obowiazywanie umowy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('conclusion of the contract', 'conclusion of the contract', 'noun', 'the act of making a contract', 'zawarcie umowy', 'The conclusion of the contract was quick.', 1),
    ('contract signing', 'contract signing', 'noun', 'the act of signing a contract', 'podpisanie umowy', 'The contract signing is tomorrow.', 2),
    ('conclusion date', 'conclusion date', 'noun', 'the date the contract is made', 'data zawarcia', 'The conclusion date is in June.', 3),
    ('effective date', 'effective date', 'noun', 'the date the contract starts', 'data obowiazywania', 'The effective date is next week.', 4),
    ('duration', 'duration', 'noun', 'the length of time something lasts', 'czas trwania', 'The duration is one year.', 5),
    ('term', 'term', 'noun', 'the period a contract is valid', 'okres obowiazywania', 'The term is twelve months.', 6),
    ('extension', 'extension', 'noun', 'a longer period of validity', 'przedluzenie', 'The extension is approved.', 7),
    ('expiry', 'expiry', 'noun', 'the end of a contract period', 'wygasniecie', 'The expiry is next month.', 8),
    ('termination', 'termination', 'noun', 'ending a contract', 'rozwiazanie umowy', 'Termination is stated in the contract.', 9),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a contract', 'wypowiedzenie', 'The notice of termination was sent.', 10),
    ('withdrawal from the contract', 'withdrawal from the contract', 'noun', 'ending a contract by withdrawal', 'odstapienie od umowy', 'Withdrawal from the contract is allowed.', 11)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('conclusion of the contract', 'conclusion of the contract', 'noun', 'the act of making a contract', 'zawarcie umowy', 'The conclusion of the contract was quick.', 1),
    ('contract signing', 'contract signing', 'noun', 'the act of signing a contract', 'podpisanie umowy', 'The contract signing is tomorrow.', 2),
    ('conclusion date', 'conclusion date', 'noun', 'the date the contract is made', 'data zawarcia', 'The conclusion date is in June.', 3),
    ('effective date', 'effective date', 'noun', 'the date the contract starts', 'data obowiazywania', 'The effective date is next week.', 4),
    ('duration', 'duration', 'noun', 'the length of time something lasts', 'czas trwania', 'The duration is one year.', 5),
    ('term', 'term', 'noun', 'the period a contract is valid', 'okres obowiazywania', 'The term is twelve months.', 6),
    ('extension', 'extension', 'noun', 'a longer period of validity', 'przedluzenie', 'The extension is approved.', 7),
    ('expiry', 'expiry', 'noun', 'the end of a contract period', 'wygasniecie', 'The expiry is next month.', 8),
    ('termination', 'termination', 'noun', 'ending a contract', 'rozwiazanie umowy', 'Termination is stated in the contract.', 9),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a contract', 'wypowiedzenie', 'The notice of termination was sent.', 10),
    ('withdrawal from the contract', 'withdrawal from the contract', 'noun', 'ending a contract by withdrawal', 'odstapienie od umowy', 'Withdrawal from the contract is allowed.', 11)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('conclusion of the contract', 'conclusion of the contract', 'noun', 'the act of making a contract', 'zawarcie umowy', 'The conclusion of the contract was quick.', 1),
    ('contract signing', 'contract signing', 'noun', 'the act of signing a contract', 'podpisanie umowy', 'The contract signing is tomorrow.', 2),
    ('conclusion date', 'conclusion date', 'noun', 'the date the contract is made', 'data zawarcia', 'The conclusion date is in June.', 3),
    ('effective date', 'effective date', 'noun', 'the date the contract starts', 'data obowiazywania', 'The effective date is next week.', 4),
    ('duration', 'duration', 'noun', 'the length of time something lasts', 'czas trwania', 'The duration is one year.', 5),
    ('term', 'term', 'noun', 'the period a contract is valid', 'okres obowiazywania', 'The term is twelve months.', 6),
    ('extension', 'extension', 'noun', 'a longer period of validity', 'przedluzenie', 'The extension is approved.', 7),
    ('expiry', 'expiry', 'noun', 'the end of a contract period', 'wygasniecie', 'The expiry is next month.', 8),
    ('termination', 'termination', 'noun', 'ending a contract', 'rozwiazanie umowy', 'Termination is stated in the contract.', 9),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a contract', 'wypowiedzenie', 'The notice of termination was sent.', 10),
    ('withdrawal from the contract', 'withdrawal from the contract', 'noun', 'ending a contract by withdrawal', 'odstapienie od umowy', 'Withdrawal from the contract is allowed.', 11)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('conclusion of the contract', 'conclusion of the contract', 'noun', 'the act of making a contract', 'zawarcie umowy', 'The conclusion of the contract was quick.', 1),
    ('contract signing', 'contract signing', 'noun', 'the act of signing a contract', 'podpisanie umowy', 'The contract signing is tomorrow.', 2),
    ('conclusion date', 'conclusion date', 'noun', 'the date the contract is made', 'data zawarcia', 'The conclusion date is in June.', 3),
    ('effective date', 'effective date', 'noun', 'the date the contract starts', 'data obowiazywania', 'The effective date is next week.', 4),
    ('duration', 'duration', 'noun', 'the length of time something lasts', 'czas trwania', 'The duration is one year.', 5),
    ('term', 'term', 'noun', 'the period a contract is valid', 'okres obowiazywania', 'The term is twelve months.', 6),
    ('extension', 'extension', 'noun', 'a longer period of validity', 'przedluzenie', 'The extension is approved.', 7),
    ('expiry', 'expiry', 'noun', 'the end of a contract period', 'wygasniecie', 'The expiry is next month.', 8),
    ('termination', 'termination', 'noun', 'ending a contract', 'rozwiazanie umowy', 'Termination is stated in the contract.', 9),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a contract', 'wypowiedzenie', 'The notice of termination was sent.', 10),
    ('withdrawal from the contract', 'withdrawal from the contract', 'noun', 'ending a contract by withdrawal', 'odstapienie od umowy', 'Withdrawal from the contract is allowed.', 11)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack C: UMOWY — Strony i role
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('party', 'party', 'noun', 'a person or company in a contract', 'strona', 'Each party has rights.', 1),
    ('counterparty', 'counterparty', 'noun', 'the other party to a contract', 'kontrahent', 'The counterparty is reliable.', 2),
    ('client', 'client', 'noun', 'a customer receiving services', 'klient', 'The client accepted the offer.', 3),
    ('supplier', 'supplier', 'noun', 'a company that provides goods', 'dostawca', 'The supplier delivers on time.', 4),
    ('service provider', 'service provider', 'noun', 'a company that provides services', 'uslugodawca', 'The service provider sent a report.', 5),
    ('service recipient', 'service recipient', 'noun', 'a party receiving services', 'uslugobiorca', 'The service recipient approved the work.', 6),
    ('tenant', 'tenant', 'noun', 'a person who rents property', 'najemca', 'The tenant pays on time.', 7),
    ('landlord', 'landlord', 'noun', 'a person who rents out property', 'wynajmujacy', 'The landlord signed the agreement.', 8),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 9),
    ('lessee', 'lessee', 'noun', 'the party who leases an asset', 'leasingobiorca', 'The lessee uses the asset.', 10),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party approves the lease.', 11),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user operates the asset.', 12),
    ('employer', 'employer', 'noun', 'a person or company that employs staff', 'pracodawca', 'The employer signs the contract.', 13),
    ('contractor', 'contractor', 'noun', 'a party that performs work', 'wykonawca', 'The contractor starts on Monday.', 14),
    ('subcontractor', 'subcontractor', 'noun', 'a contractor hired by another contractor', 'podwykonawca', 'The subcontractor delivered the work.', 15)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('party', 'party', 'noun', 'a person or company in a contract', 'strona', 'Each party has rights.', 1),
    ('counterparty', 'counterparty', 'noun', 'the other party to a contract', 'kontrahent', 'The counterparty is reliable.', 2),
    ('client', 'client', 'noun', 'a customer receiving services', 'klient', 'The client accepted the offer.', 3),
    ('supplier', 'supplier', 'noun', 'a company that provides goods', 'dostawca', 'The supplier delivers on time.', 4),
    ('service provider', 'service provider', 'noun', 'a company that provides services', 'uslugodawca', 'The service provider sent a report.', 5),
    ('service recipient', 'service recipient', 'noun', 'a party receiving services', 'uslugobiorca', 'The service recipient approved the work.', 6),
    ('tenant', 'tenant', 'noun', 'a person who rents property', 'najemca', 'The tenant pays on time.', 7),
    ('landlord', 'landlord', 'noun', 'a person who rents out property', 'wynajmujacy', 'The landlord signed the agreement.', 8),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 9),
    ('lessee', 'lessee', 'noun', 'the party who leases an asset', 'leasingobiorca', 'The lessee uses the asset.', 10),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party approves the lease.', 11),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user operates the asset.', 12),
    ('employer', 'employer', 'noun', 'a person or company that employs staff', 'pracodawca', 'The employer signs the contract.', 13),
    ('contractor', 'contractor', 'noun', 'a party that performs work', 'wykonawca', 'The contractor starts on Monday.', 14),
    ('subcontractor', 'subcontractor', 'noun', 'a contractor hired by another contractor', 'podwykonawca', 'The subcontractor delivered the work.', 15)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('party', 'party', 'noun', 'a person or company in a contract', 'strona', 'Each party has rights.', 1),
    ('counterparty', 'counterparty', 'noun', 'the other party to a contract', 'kontrahent', 'The counterparty is reliable.', 2),
    ('client', 'client', 'noun', 'a customer receiving services', 'klient', 'The client accepted the offer.', 3),
    ('supplier', 'supplier', 'noun', 'a company that provides goods', 'dostawca', 'The supplier delivers on time.', 4),
    ('service provider', 'service provider', 'noun', 'a company that provides services', 'uslugodawca', 'The service provider sent a report.', 5),
    ('service recipient', 'service recipient', 'noun', 'a party receiving services', 'uslugobiorca', 'The service recipient approved the work.', 6),
    ('tenant', 'tenant', 'noun', 'a person who rents property', 'najemca', 'The tenant pays on time.', 7),
    ('landlord', 'landlord', 'noun', 'a person who rents out property', 'wynajmujacy', 'The landlord signed the agreement.', 8),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 9),
    ('lessee', 'lessee', 'noun', 'the party who leases an asset', 'leasingobiorca', 'The lessee uses the asset.', 10),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party approves the lease.', 11),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user operates the asset.', 12),
    ('employer', 'employer', 'noun', 'a person or company that employs staff', 'pracodawca', 'The employer signs the contract.', 13),
    ('contractor', 'contractor', 'noun', 'a party that performs work', 'wykonawca', 'The contractor starts on Monday.', 14),
    ('subcontractor', 'subcontractor', 'noun', 'a contractor hired by another contractor', 'podwykonawca', 'The subcontractor delivered the work.', 15)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('party', 'party', 'noun', 'a person or company in a contract', 'strona', 'Each party has rights.', 1),
    ('counterparty', 'counterparty', 'noun', 'the other party to a contract', 'kontrahent', 'The counterparty is reliable.', 2),
    ('client', 'client', 'noun', 'a customer receiving services', 'klient', 'The client accepted the offer.', 3),
    ('supplier', 'supplier', 'noun', 'a company that provides goods', 'dostawca', 'The supplier delivers on time.', 4),
    ('service provider', 'service provider', 'noun', 'a company that provides services', 'uslugodawca', 'The service provider sent a report.', 5),
    ('service recipient', 'service recipient', 'noun', 'a party receiving services', 'uslugobiorca', 'The service recipient approved the work.', 6),
    ('tenant', 'tenant', 'noun', 'a person who rents property', 'najemca', 'The tenant pays on time.', 7),
    ('landlord', 'landlord', 'noun', 'a person who rents out property', 'wynajmujacy', 'The landlord signed the agreement.', 8),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 9),
    ('lessee', 'lessee', 'noun', 'the party who leases an asset', 'leasingobiorca', 'The lessee uses the asset.', 10),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party approves the lease.', 11),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user operates the asset.', 12),
    ('employer', 'employer', 'noun', 'a person or company that employs staff', 'pracodawca', 'The employer signs the contract.', 13),
    ('contractor', 'contractor', 'noun', 'a party that performs work', 'wykonawca', 'The contractor starts on Monday.', 14),
    ('subcontractor', 'subcontractor', 'noun', 'a contractor hired by another contractor', 'podwykonawca', 'The subcontractor delivered the work.', 15)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack D: UMOWY — Umowa najmu
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('rental agreement', 'rental agreement', 'noun', 'a contract for renting property', 'umowa najmu', 'The rental agreement is signed.', 1),
    ('rent', 'rent', 'noun', 'money paid for using property', 'czynsz', 'The rent is due today.', 2),
    ('deposit', 'deposit', 'noun', 'money paid as security', 'kaucja', 'The deposit is refundable.', 3),
    ('rental period', 'rental period', 'noun', 'the time the rental lasts', 'okres najmu', 'The rental period is one year.', 4),
    ('premises', 'premises', 'noun', 'the property being rented', 'lokal', 'The premises are inspected.', 5),
    ('property', 'property', 'noun', 'real estate being rented', 'nieruchomosc', 'The property is new.', 6),
    ('fixtures', 'fixtures', 'noun', 'fixed equipment in a property', 'wyposazenie', 'The fixtures are included.', 7),
    ('technical condition', 'technical condition', 'noun', 'the condition of the property', 'stan techniczny', 'The technical condition is good.', 8),
    ('handover protocol', 'handover protocol', 'noun', 'a document for handover', 'protokol zdawczo-odbiorczy', 'The handover protocol is signed.', 9),
    ('additional charges', 'additional charges', 'noun', 'extra fees related to the rental', 'oplaty dodatkowe', 'Additional charges are listed.', 10),
    ('utilities', 'utilities', 'noun', 'services like water and electricity', 'media', 'Utilities are paid monthly.', 11),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a rental', 'wypowiedzenie umowy', 'The notice of termination was sent.', 12),
    ('lease extension', 'lease extension', 'noun', 'a longer rental period', 'przedluzenie najmu', 'The lease extension is approved.', 13)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('rental agreement', 'rental agreement', 'noun', 'a contract for renting property', 'umowa najmu', 'The rental agreement is signed.', 1),
    ('rent', 'rent', 'noun', 'money paid for using property', 'czynsz', 'The rent is due today.', 2),
    ('deposit', 'deposit', 'noun', 'money paid as security', 'kaucja', 'The deposit is refundable.', 3),
    ('rental period', 'rental period', 'noun', 'the time the rental lasts', 'okres najmu', 'The rental period is one year.', 4),
    ('premises', 'premises', 'noun', 'the property being rented', 'lokal', 'The premises are inspected.', 5),
    ('property', 'property', 'noun', 'real estate being rented', 'nieruchomosc', 'The property is new.', 6),
    ('fixtures', 'fixtures', 'noun', 'fixed equipment in a property', 'wyposazenie', 'The fixtures are included.', 7),
    ('technical condition', 'technical condition', 'noun', 'the condition of the property', 'stan techniczny', 'The technical condition is good.', 8),
    ('handover protocol', 'handover protocol', 'noun', 'a document for handover', 'protokol zdawczo-odbiorczy', 'The handover protocol is signed.', 9),
    ('additional charges', 'additional charges', 'noun', 'extra fees related to the rental', 'oplaty dodatkowe', 'Additional charges are listed.', 10),
    ('utilities', 'utilities', 'noun', 'services like water and electricity', 'media', 'Utilities are paid monthly.', 11),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a rental', 'wypowiedzenie umowy', 'The notice of termination was sent.', 12),
    ('lease extension', 'lease extension', 'noun', 'a longer rental period', 'przedluzenie najmu', 'The lease extension is approved.', 13)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('rental agreement', 'rental agreement', 'noun', 'a contract for renting property', 'umowa najmu', 'The rental agreement is signed.', 1),
    ('rent', 'rent', 'noun', 'money paid for using property', 'czynsz', 'The rent is due today.', 2),
    ('deposit', 'deposit', 'noun', 'money paid as security', 'kaucja', 'The deposit is refundable.', 3),
    ('rental period', 'rental period', 'noun', 'the time the rental lasts', 'okres najmu', 'The rental period is one year.', 4),
    ('premises', 'premises', 'noun', 'the property being rented', 'lokal', 'The premises are inspected.', 5),
    ('property', 'property', 'noun', 'real estate being rented', 'nieruchomosc', 'The property is new.', 6),
    ('fixtures', 'fixtures', 'noun', 'fixed equipment in a property', 'wyposazenie', 'The fixtures are included.', 7),
    ('technical condition', 'technical condition', 'noun', 'the condition of the property', 'stan techniczny', 'The technical condition is good.', 8),
    ('handover protocol', 'handover protocol', 'noun', 'a document for handover', 'protokol zdawczo-odbiorczy', 'The handover protocol is signed.', 9),
    ('additional charges', 'additional charges', 'noun', 'extra fees related to the rental', 'oplaty dodatkowe', 'Additional charges are listed.', 10),
    ('utilities', 'utilities', 'noun', 'services like water and electricity', 'media', 'Utilities are paid monthly.', 11),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a rental', 'wypowiedzenie umowy', 'The notice of termination was sent.', 12),
    ('lease extension', 'lease extension', 'noun', 'a longer rental period', 'przedluzenie najmu', 'The lease extension is approved.', 13)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('rental agreement', 'rental agreement', 'noun', 'a contract for renting property', 'umowa najmu', 'The rental agreement is signed.', 1),
    ('rent', 'rent', 'noun', 'money paid for using property', 'czynsz', 'The rent is due today.', 2),
    ('deposit', 'deposit', 'noun', 'money paid as security', 'kaucja', 'The deposit is refundable.', 3),
    ('rental period', 'rental period', 'noun', 'the time the rental lasts', 'okres najmu', 'The rental period is one year.', 4),
    ('premises', 'premises', 'noun', 'the property being rented', 'lokal', 'The premises are inspected.', 5),
    ('property', 'property', 'noun', 'real estate being rented', 'nieruchomosc', 'The property is new.', 6),
    ('fixtures', 'fixtures', 'noun', 'fixed equipment in a property', 'wyposazenie', 'The fixtures are included.', 7),
    ('technical condition', 'technical condition', 'noun', 'the condition of the property', 'stan techniczny', 'The technical condition is good.', 8),
    ('handover protocol', 'handover protocol', 'noun', 'a document for handover', 'protokol zdawczo-odbiorczy', 'The handover protocol is signed.', 9),
    ('additional charges', 'additional charges', 'noun', 'extra fees related to the rental', 'oplaty dodatkowe', 'Additional charges are listed.', 10),
    ('utilities', 'utilities', 'noun', 'services like water and electricity', 'media', 'Utilities are paid monthly.', 11),
    ('notice of termination', 'notice of termination', 'noun', 'a formal notice ending a rental', 'wypowiedzenie umowy', 'The notice of termination was sent.', 12),
    ('lease extension', 'lease extension', 'noun', 'a longer rental period', 'przedluzenie najmu', 'The lease extension is approved.', 13)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack E: UMOWY — Leasing
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('leasing', 'leasing', 'noun', 'a form of financing for assets', 'leasing', 'Leasing is common in business.', 1),
    ('lease agreement', 'lease agreement', 'noun', 'a contract for leasing', 'umowa leasingu', 'The lease agreement is signed.', 2),
    ('operating lease', 'operating lease', 'noun', 'a lease without transfer of ownership', 'leasing operacyjny', 'Operating lease is flexible.', 3),
    ('finance lease', 'finance lease', 'noun', 'a lease similar to financing', 'leasing finansowy', 'Finance lease is long term.', 4),
    ('consumer lease', 'consumer lease', 'noun', 'a lease for individuals', 'leasing konsumencki', 'Consumer lease is simple.', 5),
    ('leased asset', 'leased asset', 'noun', 'the item being leased', 'przedmiot leasingu', 'The leased asset is a car.', 6),
    ('lease term', 'lease term', 'noun', 'the length of the lease', 'okres leasingu', 'The lease term is three years.', 7),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 8),
    ('lessee', 'lessee', 'noun', 'the party who uses an asset', 'leasingobiorca', 'The lessee uses the asset.', 9),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party finances the asset.', 10),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user is responsible for use.', 11),
    ('lease installment', 'lease installment', 'noun', 'a regular lease payment', 'rata leasingowa', 'The lease installment is monthly.', 12),
    ('initial fee', 'initial fee', 'noun', 'the first payment for a lease', 'oplata wstepna', 'The initial fee is paid upfront.', 13),
    ('initial rent', 'initial rent', 'noun', 'an initial lease payment', 'czynsz inicjalny', 'The initial rent is agreed.', 14),
    ('total lease payments', 'total lease payments', 'noun', 'the sum of all lease payments', 'suma oplat leasingowych', 'Total lease payments are listed.', 15),
    ('repayment schedule', 'repayment schedule', 'noun', 'a plan of payments', 'harmonogram splat', 'The repayment schedule is attached.', 16),
    ('residual value', 'residual value', 'noun', 'the value at the end of the lease', 'wartosc rezydualna', 'The residual value is fixed.', 17),
    ('buyout', 'buyout', 'noun', 'the option to purchase the asset', 'wykup', 'Buyout is possible at the end.', 18),
    ('buyout price', 'buyout price', 'noun', 'the price for buyout', 'cena wykupu', 'The buyout price is low.', 19),
    ('payment', 'payment', 'noun', 'money paid under the lease', 'platnosc', 'Payment is due today.', 20),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 21),
    ('lease application', 'lease application', 'noun', 'a request for leasing', 'wniosek leasingowy', 'The lease application is ready.', 22),
    ('lease eligibility', 'lease eligibility', 'noun', 'ability to obtain leasing', 'zdolnosc leasingowa', 'Lease eligibility is assessed.', 23),
    ('lease decision', 'lease decision', 'noun', 'a decision on a lease request', 'decyzja leasingowa', 'The lease decision is positive.', 24),
    ('application approval', 'application approval', 'noun', 'approval of the lease application', 'akceptacja wniosku', 'Application approval is required.', 25),
    ('contract signing', 'contract signing', 'noun', 'the act of signing the contract', 'podpisanie umowy', 'Contract signing is tomorrow.', 26),
    ('lease activation', 'lease activation', 'noun', 'the start of the lease', 'uruchomienie leasingu', 'Lease activation is complete.', 27),
    ('asset handover', 'asset handover', 'noun', 'giving the asset to the lessee', 'wydanie przedmiotu', 'Asset handover is scheduled.', 28),
    ('acceptance', 'acceptance', 'noun', 'formal acceptance of an asset', 'odbior', 'Acceptance is confirmed.', 29),
    ('use', 'use', 'noun', 'using the leased asset', 'uzytkowanie', 'Use must follow the rules.', 30),
    ('operation', 'operation', 'noun', 'regular use of an asset', 'eksploatacja', 'Operation costs are covered.', 31),
    ('service', 'service', 'noun', 'maintenance work on an asset', 'serwis', 'Service is done yearly.', 32),
    ('inspection', 'inspection', 'noun', 'a technical check', 'przeglad', 'The inspection is required.', 33),
    ('repair', 'repair', 'noun', 'fixing a damaged asset', 'naprawa', 'Repair is handled quickly.', 34),
    ('insurance', 'insurance', 'noun', 'coverage for damage or loss', 'ubezpieczenie', 'Insurance is mandatory.', 35),
    ('liability', 'liability', 'noun', 'responsibility for damage', 'odpowiedzialnosc', 'Liability is defined.', 36),
    ('damage', 'damage', 'noun', 'harm to the asset', 'szkoda', 'Report any damage.', 37),
    ('loss', 'loss', 'noun', 'the asset is lost or missing', 'utrata', 'Loss must be reported.', 38),
    ('lease end', 'lease end', 'noun', 'the end of the lease term', 'zakonczenie leasingu', 'Lease end is next month.', 39),
    ('asset return', 'asset return', 'noun', 'return of the leased asset', 'zwrot przedmiotu', 'Asset return is scheduled.', 40),
    ('contract extension', 'contract extension', 'noun', 'extending the lease contract', 'przedluzenie umowy', 'Contract extension is possible.', 41),
    ('termination', 'termination', 'noun', 'ending the lease contract', 'rozwiazanie umowy', 'Termination is described in the contract.', 42),
    ('early termination', 'early termination', 'noun', 'ending the lease before the term', 'wczesniejsze zakonczenie', 'Early termination has a fee.', 43)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('leasing', 'leasing', 'noun', 'a form of financing for assets', 'leasing', 'Leasing is common in business.', 1),
    ('lease agreement', 'lease agreement', 'noun', 'a contract for leasing', 'umowa leasingu', 'The lease agreement is signed.', 2),
    ('operating lease', 'operating lease', 'noun', 'a lease without transfer of ownership', 'leasing operacyjny', 'Operating lease is flexible.', 3),
    ('finance lease', 'finance lease', 'noun', 'a lease similar to financing', 'leasing finansowy', 'Finance lease is long term.', 4),
    ('consumer lease', 'consumer lease', 'noun', 'a lease for individuals', 'leasing konsumencki', 'Consumer lease is simple.', 5),
    ('leased asset', 'leased asset', 'noun', 'the item being leased', 'przedmiot leasingu', 'The leased asset is a car.', 6),
    ('lease term', 'lease term', 'noun', 'the length of the lease', 'okres leasingu', 'The lease term is three years.', 7),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 8),
    ('lessee', 'lessee', 'noun', 'the party who uses an asset', 'leasingobiorca', 'The lessee uses the asset.', 9),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party finances the asset.', 10),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user is responsible for use.', 11),
    ('lease installment', 'lease installment', 'noun', 'a regular lease payment', 'rata leasingowa', 'The lease installment is monthly.', 12),
    ('initial fee', 'initial fee', 'noun', 'the first payment for a lease', 'oplata wstepna', 'The initial fee is paid upfront.', 13),
    ('initial rent', 'initial rent', 'noun', 'an initial lease payment', 'czynsz inicjalny', 'The initial rent is agreed.', 14),
    ('total lease payments', 'total lease payments', 'noun', 'the sum of all lease payments', 'suma oplat leasingowych', 'Total lease payments are listed.', 15),
    ('repayment schedule', 'repayment schedule', 'noun', 'a plan of payments', 'harmonogram splat', 'The repayment schedule is attached.', 16),
    ('residual value', 'residual value', 'noun', 'the value at the end of the lease', 'wartosc rezydualna', 'The residual value is fixed.', 17),
    ('buyout', 'buyout', 'noun', 'the option to purchase the asset', 'wykup', 'Buyout is possible at the end.', 18),
    ('buyout price', 'buyout price', 'noun', 'the price for buyout', 'cena wykupu', 'The buyout price is low.', 19),
    ('payment', 'payment', 'noun', 'money paid under the lease', 'platnosc', 'Payment is due today.', 20),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 21),
    ('lease application', 'lease application', 'noun', 'a request for leasing', 'wniosek leasingowy', 'The lease application is ready.', 22),
    ('lease eligibility', 'lease eligibility', 'noun', 'ability to obtain leasing', 'zdolnosc leasingowa', 'Lease eligibility is assessed.', 23),
    ('lease decision', 'lease decision', 'noun', 'a decision on a lease request', 'decyzja leasingowa', 'The lease decision is positive.', 24),
    ('application approval', 'application approval', 'noun', 'approval of the lease application', 'akceptacja wniosku', 'Application approval is required.', 25),
    ('contract signing', 'contract signing', 'noun', 'the act of signing the contract', 'podpisanie umowy', 'Contract signing is tomorrow.', 26),
    ('lease activation', 'lease activation', 'noun', 'the start of the lease', 'uruchomienie leasingu', 'Lease activation is complete.', 27),
    ('asset handover', 'asset handover', 'noun', 'giving the asset to the lessee', 'wydanie przedmiotu', 'Asset handover is scheduled.', 28),
    ('acceptance', 'acceptance', 'noun', 'formal acceptance of an asset', 'odbior', 'Acceptance is confirmed.', 29),
    ('use', 'use', 'noun', 'using the leased asset', 'uzytkowanie', 'Use must follow the rules.', 30),
    ('operation', 'operation', 'noun', 'regular use of an asset', 'eksploatacja', 'Operation costs are covered.', 31),
    ('service', 'service', 'noun', 'maintenance work on an asset', 'serwis', 'Service is done yearly.', 32),
    ('inspection', 'inspection', 'noun', 'a technical check', 'przeglad', 'The inspection is required.', 33),
    ('repair', 'repair', 'noun', 'fixing a damaged asset', 'naprawa', 'Repair is handled quickly.', 34),
    ('insurance', 'insurance', 'noun', 'coverage for damage or loss', 'ubezpieczenie', 'Insurance is mandatory.', 35),
    ('liability', 'liability', 'noun', 'responsibility for damage', 'odpowiedzialnosc', 'Liability is defined.', 36),
    ('damage', 'damage', 'noun', 'harm to the asset', 'szkoda', 'Report any damage.', 37),
    ('loss', 'loss', 'noun', 'the asset is lost or missing', 'utrata', 'Loss must be reported.', 38),
    ('lease end', 'lease end', 'noun', 'the end of the lease term', 'zakonczenie leasingu', 'Lease end is next month.', 39),
    ('asset return', 'asset return', 'noun', 'return of the leased asset', 'zwrot przedmiotu', 'Asset return is scheduled.', 40),
    ('contract extension', 'contract extension', 'noun', 'extending the lease contract', 'przedluzenie umowy', 'Contract extension is possible.', 41),
    ('termination', 'termination', 'noun', 'ending the lease contract', 'rozwiazanie umowy', 'Termination is described in the contract.', 42),
    ('early termination', 'early termination', 'noun', 'ending the lease before the term', 'wczesniejsze zakonczenie', 'Early termination has a fee.', 43)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('leasing', 'leasing', 'noun', 'a form of financing for assets', 'leasing', 'Leasing is common in business.', 1),
    ('lease agreement', 'lease agreement', 'noun', 'a contract for leasing', 'umowa leasingu', 'The lease agreement is signed.', 2),
    ('operating lease', 'operating lease', 'noun', 'a lease without transfer of ownership', 'leasing operacyjny', 'Operating lease is flexible.', 3),
    ('finance lease', 'finance lease', 'noun', 'a lease similar to financing', 'leasing finansowy', 'Finance lease is long term.', 4),
    ('consumer lease', 'consumer lease', 'noun', 'a lease for individuals', 'leasing konsumencki', 'Consumer lease is simple.', 5),
    ('leased asset', 'leased asset', 'noun', 'the item being leased', 'przedmiot leasingu', 'The leased asset is a car.', 6),
    ('lease term', 'lease term', 'noun', 'the length of the lease', 'okres leasingu', 'The lease term is three years.', 7),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 8),
    ('lessee', 'lessee', 'noun', 'the party who uses an asset', 'leasingobiorca', 'The lessee uses the asset.', 9),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party finances the asset.', 10),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user is responsible for use.', 11),
    ('lease installment', 'lease installment', 'noun', 'a regular lease payment', 'rata leasingowa', 'The lease installment is monthly.', 12),
    ('initial fee', 'initial fee', 'noun', 'the first payment for a lease', 'oplata wstepna', 'The initial fee is paid upfront.', 13),
    ('initial rent', 'initial rent', 'noun', 'an initial lease payment', 'czynsz inicjalny', 'The initial rent is agreed.', 14),
    ('total lease payments', 'total lease payments', 'noun', 'the sum of all lease payments', 'suma oplat leasingowych', 'Total lease payments are listed.', 15),
    ('repayment schedule', 'repayment schedule', 'noun', 'a plan of payments', 'harmonogram splat', 'The repayment schedule is attached.', 16),
    ('residual value', 'residual value', 'noun', 'the value at the end of the lease', 'wartosc rezydualna', 'The residual value is fixed.', 17),
    ('buyout', 'buyout', 'noun', 'the option to purchase the asset', 'wykup', 'Buyout is possible at the end.', 18),
    ('buyout price', 'buyout price', 'noun', 'the price for buyout', 'cena wykupu', 'The buyout price is low.', 19),
    ('payment', 'payment', 'noun', 'money paid under the lease', 'platnosc', 'Payment is due today.', 20),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 21),
    ('lease application', 'lease application', 'noun', 'a request for leasing', 'wniosek leasingowy', 'The lease application is ready.', 22),
    ('lease eligibility', 'lease eligibility', 'noun', 'ability to obtain leasing', 'zdolnosc leasingowa', 'Lease eligibility is assessed.', 23),
    ('lease decision', 'lease decision', 'noun', 'a decision on a lease request', 'decyzja leasingowa', 'The lease decision is positive.', 24),
    ('application approval', 'application approval', 'noun', 'approval of the lease application', 'akceptacja wniosku', 'Application approval is required.', 25),
    ('contract signing', 'contract signing', 'noun', 'the act of signing the contract', 'podpisanie umowy', 'Contract signing is tomorrow.', 26),
    ('lease activation', 'lease activation', 'noun', 'the start of the lease', 'uruchomienie leasingu', 'Lease activation is complete.', 27),
    ('asset handover', 'asset handover', 'noun', 'giving the asset to the lessee', 'wydanie przedmiotu', 'Asset handover is scheduled.', 28),
    ('acceptance', 'acceptance', 'noun', 'formal acceptance of an asset', 'odbior', 'Acceptance is confirmed.', 29),
    ('use', 'use', 'noun', 'using the leased asset', 'uzytkowanie', 'Use must follow the rules.', 30),
    ('operation', 'operation', 'noun', 'regular use of an asset', 'eksploatacja', 'Operation costs are covered.', 31),
    ('service', 'service', 'noun', 'maintenance work on an asset', 'serwis', 'Service is done yearly.', 32),
    ('inspection', 'inspection', 'noun', 'a technical check', 'przeglad', 'The inspection is required.', 33),
    ('repair', 'repair', 'noun', 'fixing a damaged asset', 'naprawa', 'Repair is handled quickly.', 34),
    ('insurance', 'insurance', 'noun', 'coverage for damage or loss', 'ubezpieczenie', 'Insurance is mandatory.', 35),
    ('liability', 'liability', 'noun', 'responsibility for damage', 'odpowiedzialnosc', 'Liability is defined.', 36),
    ('damage', 'damage', 'noun', 'harm to the asset', 'szkoda', 'Report any damage.', 37),
    ('loss', 'loss', 'noun', 'the asset is lost or missing', 'utrata', 'Loss must be reported.', 38),
    ('lease end', 'lease end', 'noun', 'the end of the lease term', 'zakonczenie leasingu', 'Lease end is next month.', 39),
    ('asset return', 'asset return', 'noun', 'return of the leased asset', 'zwrot przedmiotu', 'Asset return is scheduled.', 40),
    ('contract extension', 'contract extension', 'noun', 'extending the lease contract', 'przedluzenie umowy', 'Contract extension is possible.', 41),
    ('termination', 'termination', 'noun', 'ending the lease contract', 'rozwiazanie umowy', 'Termination is described in the contract.', 42),
    ('early termination', 'early termination', 'noun', 'ending the lease before the term', 'wczesniejsze zakonczenie', 'Early termination has a fee.', 43)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('leasing', 'leasing', 'noun', 'a form of financing for assets', 'leasing', 'Leasing is common in business.', 1),
    ('lease agreement', 'lease agreement', 'noun', 'a contract for leasing', 'umowa leasingu', 'The lease agreement is signed.', 2),
    ('operating lease', 'operating lease', 'noun', 'a lease without transfer of ownership', 'leasing operacyjny', 'Operating lease is flexible.', 3),
    ('finance lease', 'finance lease', 'noun', 'a lease similar to financing', 'leasing finansowy', 'Finance lease is long term.', 4),
    ('consumer lease', 'consumer lease', 'noun', 'a lease for individuals', 'leasing konsumencki', 'Consumer lease is simple.', 5),
    ('leased asset', 'leased asset', 'noun', 'the item being leased', 'przedmiot leasingu', 'The leased asset is a car.', 6),
    ('lease term', 'lease term', 'noun', 'the length of the lease', 'okres leasingu', 'The lease term is three years.', 7),
    ('lessor', 'lessor', 'noun', 'the party who leases an asset', 'leasingodawca', 'The lessor owns the asset.', 8),
    ('lessee', 'lessee', 'noun', 'the party who uses an asset', 'leasingobiorca', 'The lessee uses the asset.', 9),
    ('financing party', 'financing party', 'noun', 'the party providing financing', 'finansujacy', 'The financing party finances the asset.', 10),
    ('asset user', 'asset user', 'noun', 'the party using the leased asset', 'korzystajacy', 'The asset user is responsible for use.', 11),
    ('lease installment', 'lease installment', 'noun', 'a regular lease payment', 'rata leasingowa', 'The lease installment is monthly.', 12),
    ('initial fee', 'initial fee', 'noun', 'the first payment for a lease', 'oplata wstepna', 'The initial fee is paid upfront.', 13),
    ('initial rent', 'initial rent', 'noun', 'an initial lease payment', 'czynsz inicjalny', 'The initial rent is agreed.', 14),
    ('total lease payments', 'total lease payments', 'noun', 'the sum of all lease payments', 'suma oplat leasingowych', 'Total lease payments are listed.', 15),
    ('repayment schedule', 'repayment schedule', 'noun', 'a plan of payments', 'harmonogram splat', 'The repayment schedule is attached.', 16),
    ('residual value', 'residual value', 'noun', 'the value at the end of the lease', 'wartosc rezydualna', 'The residual value is fixed.', 17),
    ('buyout', 'buyout', 'noun', 'the option to purchase the asset', 'wykup', 'Buyout is possible at the end.', 18),
    ('buyout price', 'buyout price', 'noun', 'the price for buyout', 'cena wykupu', 'The buyout price is low.', 19),
    ('payment', 'payment', 'noun', 'money paid under the lease', 'platnosc', 'Payment is due today.', 20),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 21),
    ('lease application', 'lease application', 'noun', 'a request for leasing', 'wniosek leasingowy', 'The lease application is ready.', 22),
    ('lease eligibility', 'lease eligibility', 'noun', 'ability to obtain leasing', 'zdolnosc leasingowa', 'Lease eligibility is assessed.', 23),
    ('lease decision', 'lease decision', 'noun', 'a decision on a lease request', 'decyzja leasingowa', 'The lease decision is positive.', 24),
    ('application approval', 'application approval', 'noun', 'approval of the lease application', 'akceptacja wniosku', 'Application approval is required.', 25),
    ('contract signing', 'contract signing', 'noun', 'the act of signing the contract', 'podpisanie umowy', 'Contract signing is tomorrow.', 26),
    ('lease activation', 'lease activation', 'noun', 'the start of the lease', 'uruchomienie leasingu', 'Lease activation is complete.', 27),
    ('asset handover', 'asset handover', 'noun', 'giving the asset to the lessee', 'wydanie przedmiotu', 'Asset handover is scheduled.', 28),
    ('acceptance', 'acceptance', 'noun', 'formal acceptance of an asset', 'odbior', 'Acceptance is confirmed.', 29),
    ('use', 'use', 'noun', 'using the leased asset', 'uzytkowanie', 'Use must follow the rules.', 30),
    ('operation', 'operation', 'noun', 'regular use of an asset', 'eksploatacja', 'Operation costs are covered.', 31),
    ('service', 'service', 'noun', 'maintenance work on an asset', 'serwis', 'Service is done yearly.', 32),
    ('inspection', 'inspection', 'noun', 'a technical check', 'przeglad', 'The inspection is required.', 33),
    ('repair', 'repair', 'noun', 'fixing a damaged asset', 'naprawa', 'Repair is handled quickly.', 34),
    ('insurance', 'insurance', 'noun', 'coverage for damage or loss', 'ubezpieczenie', 'Insurance is mandatory.', 35),
    ('liability', 'liability', 'noun', 'responsibility for damage', 'odpowiedzialnosc', 'Liability is defined.', 36),
    ('damage', 'damage', 'noun', 'harm to the asset', 'szkoda', 'Report any damage.', 37),
    ('loss', 'loss', 'noun', 'the asset is lost or missing', 'utrata', 'Loss must be reported.', 38),
    ('lease end', 'lease end', 'noun', 'the end of the lease term', 'zakonczenie leasingu', 'Lease end is next month.', 39),
    ('asset return', 'asset return', 'noun', 'return of the leased asset', 'zwrot przedmiotu', 'Asset return is scheduled.', 40),
    ('contract extension', 'contract extension', 'noun', 'extending the lease contract', 'przedluzenie umowy', 'Contract extension is possible.', 41),
    ('termination', 'termination', 'noun', 'ending the lease contract', 'rozwiazanie umowy', 'Termination is described in the contract.', 42),
    ('early termination', 'early termination', 'noun', 'ending the lease before the term', 'wczesniejsze zakonczenie', 'Early termination has a fee.', 43)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack F: UMOWY — Umowy uslugowe
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('service agreement', 'service agreement', 'noun', 'a contract for services', 'umowa o swiadczenie uslug', 'The service agreement is signed.', 1),
    ('scope of services', 'scope of services', 'noun', 'the list of services covered', 'zakres uslug', 'The scope of services is clear.', 2),
    ('performance', 'performance', 'noun', 'carrying out the service', 'realizacja', 'Performance starts on Monday.', 3),
    ('completion date', 'completion date', 'noun', 'the date work must be finished', 'termin wykonania', 'The completion date is fixed.', 4),
    ('schedule', 'schedule', 'noun', 'a plan of tasks and dates', 'harmonogram', 'The schedule is attached.', 5),
    ('service standard', 'service standard', 'noun', 'the required level of service', 'standard uslug', 'The service standard is high.', 6),
    ('quality level', 'quality level', 'noun', 'the level of quality required', 'poziom jakosci', 'The quality level is agreed.', 7),
    ('reporting', 'reporting', 'noun', 'regular reports about work', 'raportowanie', 'Reporting is monthly.', 8),
    ('acceptance of work', 'acceptance of work', 'noun', 'formal acceptance of completed work', 'odbior prac', 'Acceptance of work is confirmed.', 9),
    ('complaint', 'complaint', 'noun', 'a formal claim about service', 'reklamacja', 'The complaint was accepted.', 10)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('service agreement', 'service agreement', 'noun', 'a contract for services', 'umowa o swiadczenie uslug', 'The service agreement is signed.', 1),
    ('scope of services', 'scope of services', 'noun', 'the list of services covered', 'zakres uslug', 'The scope of services is clear.', 2),
    ('performance', 'performance', 'noun', 'carrying out the service', 'realizacja', 'Performance starts on Monday.', 3),
    ('completion date', 'completion date', 'noun', 'the date work must be finished', 'termin wykonania', 'The completion date is fixed.', 4),
    ('schedule', 'schedule', 'noun', 'a plan of tasks and dates', 'harmonogram', 'The schedule is attached.', 5),
    ('service standard', 'service standard', 'noun', 'the required level of service', 'standard uslug', 'The service standard is high.', 6),
    ('quality level', 'quality level', 'noun', 'the level of quality required', 'poziom jakosci', 'The quality level is agreed.', 7),
    ('reporting', 'reporting', 'noun', 'regular reports about work', 'raportowanie', 'Reporting is monthly.', 8),
    ('acceptance of work', 'acceptance of work', 'noun', 'formal acceptance of completed work', 'odbior prac', 'Acceptance of work is confirmed.', 9),
    ('complaint', 'complaint', 'noun', 'a formal claim about service', 'reklamacja', 'The complaint was accepted.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('service agreement', 'service agreement', 'noun', 'a contract for services', 'umowa o swiadczenie uslug', 'The service agreement is signed.', 1),
    ('scope of services', 'scope of services', 'noun', 'the list of services covered', 'zakres uslug', 'The scope of services is clear.', 2),
    ('performance', 'performance', 'noun', 'carrying out the service', 'realizacja', 'Performance starts on Monday.', 3),
    ('completion date', 'completion date', 'noun', 'the date work must be finished', 'termin wykonania', 'The completion date is fixed.', 4),
    ('schedule', 'schedule', 'noun', 'a plan of tasks and dates', 'harmonogram', 'The schedule is attached.', 5),
    ('service standard', 'service standard', 'noun', 'the required level of service', 'standard uslug', 'The service standard is high.', 6),
    ('quality level', 'quality level', 'noun', 'the level of quality required', 'poziom jakosci', 'The quality level is agreed.', 7),
    ('reporting', 'reporting', 'noun', 'regular reports about work', 'raportowanie', 'Reporting is monthly.', 8),
    ('acceptance of work', 'acceptance of work', 'noun', 'formal acceptance of completed work', 'odbior prac', 'Acceptance of work is confirmed.', 9),
    ('complaint', 'complaint', 'noun', 'a formal claim about service', 'reklamacja', 'The complaint was accepted.', 10)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('service agreement', 'service agreement', 'noun', 'a contract for services', 'umowa o swiadczenie uslug', 'The service agreement is signed.', 1),
    ('scope of services', 'scope of services', 'noun', 'the list of services covered', 'zakres uslug', 'The scope of services is clear.', 2),
    ('performance', 'performance', 'noun', 'carrying out the service', 'realizacja', 'Performance starts on Monday.', 3),
    ('completion date', 'completion date', 'noun', 'the date work must be finished', 'termin wykonania', 'The completion date is fixed.', 4),
    ('schedule', 'schedule', 'noun', 'a plan of tasks and dates', 'harmonogram', 'The schedule is attached.', 5),
    ('service standard', 'service standard', 'noun', 'the required level of service', 'standard uslug', 'The service standard is high.', 6),
    ('quality level', 'quality level', 'noun', 'the level of quality required', 'poziom jakosci', 'The quality level is agreed.', 7),
    ('reporting', 'reporting', 'noun', 'regular reports about work', 'raportowanie', 'Reporting is monthly.', 8),
    ('acceptance of work', 'acceptance of work', 'noun', 'formal acceptance of completed work', 'odbior prac', 'Acceptance of work is confirmed.', 9),
    ('complaint', 'complaint', 'noun', 'a formal claim about service', 'reklamacja', 'The complaint was accepted.', 10)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack G: UMOWY — Umowy handlowe i wspolpraca
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('commercial agreement', 'commercial agreement', 'noun', 'a contract for business cooperation', 'umowa handlowa', 'The commercial agreement is signed.', 1),
    ('cooperation', 'cooperation', 'noun', 'working together', 'wspolpraca', 'The cooperation is effective.', 2),
    ('partnership', 'partnership', 'noun', 'a formal business relationship', 'partnerstwo', 'The partnership is long term.', 3),
    ('distribution', 'distribution', 'noun', 'the process of selling goods', 'dystrybucja', 'Distribution starts in May.', 4),
    ('exclusivity', 'exclusivity', 'noun', 'the right to be the only supplier', 'wylacznosc', 'Exclusivity applies here.', 5),
    ('territory', 'territory', 'noun', 'the area covered by a contract', 'terytorium', 'The territory is limited.', 6),
    ('volume', 'volume', 'noun', 'the amount of goods or services', 'wolumen', 'The volume is agreed.', 7),
    ('order', 'order', 'noun', 'a request for goods or services', 'zamowienie', 'The order is confirmed.', 8),
    ('order fulfillment', 'order fulfillment', 'noun', 'the process of completing an order', 'realizacja zamowienia', 'Order fulfillment is fast.', 9),
    ('delivery', 'delivery', 'noun', 'bringing goods to the buyer', 'dostawa', 'Delivery is tomorrow.', 10)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('commercial agreement', 'commercial agreement', 'noun', 'a contract for business cooperation', 'umowa handlowa', 'The commercial agreement is signed.', 1),
    ('cooperation', 'cooperation', 'noun', 'working together', 'wspolpraca', 'The cooperation is effective.', 2),
    ('partnership', 'partnership', 'noun', 'a formal business relationship', 'partnerstwo', 'The partnership is long term.', 3),
    ('distribution', 'distribution', 'noun', 'the process of selling goods', 'dystrybucja', 'Distribution starts in May.', 4),
    ('exclusivity', 'exclusivity', 'noun', 'the right to be the only supplier', 'wylacznosc', 'Exclusivity applies here.', 5),
    ('territory', 'territory', 'noun', 'the area covered by a contract', 'terytorium', 'The territory is limited.', 6),
    ('volume', 'volume', 'noun', 'the amount of goods or services', 'wolumen', 'The volume is agreed.', 7),
    ('order', 'order', 'noun', 'a request for goods or services', 'zamowienie', 'The order is confirmed.', 8),
    ('order fulfillment', 'order fulfillment', 'noun', 'the process of completing an order', 'realizacja zamowienia', 'Order fulfillment is fast.', 9),
    ('delivery', 'delivery', 'noun', 'bringing goods to the buyer', 'dostawa', 'Delivery is tomorrow.', 10)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('commercial agreement', 'commercial agreement', 'noun', 'a contract for business cooperation', 'umowa handlowa', 'The commercial agreement is signed.', 1),
    ('cooperation', 'cooperation', 'noun', 'working together', 'wspolpraca', 'The cooperation is effective.', 2),
    ('partnership', 'partnership', 'noun', 'a formal business relationship', 'partnerstwo', 'The partnership is long term.', 3),
    ('distribution', 'distribution', 'noun', 'the process of selling goods', 'dystrybucja', 'Distribution starts in May.', 4),
    ('exclusivity', 'exclusivity', 'noun', 'the right to be the only supplier', 'wylacznosc', 'Exclusivity applies here.', 5),
    ('territory', 'territory', 'noun', 'the area covered by a contract', 'terytorium', 'The territory is limited.', 6),
    ('volume', 'volume', 'noun', 'the amount of goods or services', 'wolumen', 'The volume is agreed.', 7),
    ('order', 'order', 'noun', 'a request for goods or services', 'zamowienie', 'The order is confirmed.', 8),
    ('order fulfillment', 'order fulfillment', 'noun', 'the process of completing an order', 'realizacja zamowienia', 'Order fulfillment is fast.', 9),
    ('delivery', 'delivery', 'noun', 'bringing goods to the buyer', 'dostawa', 'Delivery is tomorrow.', 10)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('commercial agreement', 'commercial agreement', 'noun', 'a contract for business cooperation', 'umowa handlowa', 'The commercial agreement is signed.', 1),
    ('cooperation', 'cooperation', 'noun', 'working together', 'wspolpraca', 'The cooperation is effective.', 2),
    ('partnership', 'partnership', 'noun', 'a formal business relationship', 'partnerstwo', 'The partnership is long term.', 3),
    ('distribution', 'distribution', 'noun', 'the process of selling goods', 'dystrybucja', 'Distribution starts in May.', 4),
    ('exclusivity', 'exclusivity', 'noun', 'the right to be the only supplier', 'wylacznosc', 'Exclusivity applies here.', 5),
    ('territory', 'territory', 'noun', 'the area covered by a contract', 'terytorium', 'The territory is limited.', 6),
    ('volume', 'volume', 'noun', 'the amount of goods or services', 'wolumen', 'The volume is agreed.', 7),
    ('order', 'order', 'noun', 'a request for goods or services', 'zamowienie', 'The order is confirmed.', 8),
    ('order fulfillment', 'order fulfillment', 'noun', 'the process of completing an order', 'realizacja zamowienia', 'Order fulfillment is fast.', 9),
    ('delivery', 'delivery', 'noun', 'bringing goods to the buyer', 'dostawa', 'Delivery is tomorrow.', 10)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack H: UMOWY — Wynagrodzenie i platnosci
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('remuneration', 'remuneration', 'noun', 'payment for work or services', 'wynagrodzenie', 'Remuneration is stated in the contract.', 1),
    ('payment', 'payment', 'noun', 'money paid for goods or services', 'platnosc', 'Payment is due today.', 2),
    ('amount', 'amount', 'noun', 'a sum of money', 'kwota', 'The amount is fixed.', 3),
    ('price', 'price', 'noun', 'the cost of something', 'cena', 'The price is final.', 4),
    ('rate', 'rate', 'noun', 'a price per unit', 'stawka', 'The rate is hourly.', 5),
    ('installment', 'installment', 'noun', 'a part of a total payment', 'rata', 'The installment is monthly.', 6),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 7),
    ('payment term', 'payment term', 'noun', 'the deadline for payment', 'termin platnosci', 'The payment term is 14 days.', 8),
    ('advance payment', 'advance payment', 'noun', 'money paid before delivery', 'zaliczka', 'Advance payment is required.', 9),
    ('final payment', 'final payment', 'noun', 'the last payment', 'platnosc koncowa', 'Final payment is after delivery.', 10),
    ('delay', 'delay', 'noun', 'a late action or payment', 'opoznienie', 'There is a delay in payment.', 11),
    ('interest', 'interest', 'noun', 'extra money for late payment', 'odsetki', 'Interest is added for delay.', 12),
    ('settlement', 'settlement', 'noun', 'final calculation of payments', 'rozliczenie', 'Settlement is complete.', 13)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('remuneration', 'remuneration', 'noun', 'payment for work or services', 'wynagrodzenie', 'Remuneration is stated in the contract.', 1),
    ('payment', 'payment', 'noun', 'money paid for goods or services', 'platnosc', 'Payment is due today.', 2),
    ('amount', 'amount', 'noun', 'a sum of money', 'kwota', 'The amount is fixed.', 3),
    ('price', 'price', 'noun', 'the cost of something', 'cena', 'The price is final.', 4),
    ('rate', 'rate', 'noun', 'a price per unit', 'stawka', 'The rate is hourly.', 5),
    ('installment', 'installment', 'noun', 'a part of a total payment', 'rata', 'The installment is monthly.', 6),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 7),
    ('payment term', 'payment term', 'noun', 'the deadline for payment', 'termin platnosci', 'The payment term is 14 days.', 8),
    ('advance payment', 'advance payment', 'noun', 'money paid before delivery', 'zaliczka', 'Advance payment is required.', 9),
    ('final payment', 'final payment', 'noun', 'the last payment', 'platnosc koncowa', 'Final payment is after delivery.', 10),
    ('delay', 'delay', 'noun', 'a late action or payment', 'opoznienie', 'There is a delay in payment.', 11),
    ('interest', 'interest', 'noun', 'extra money for late payment', 'odsetki', 'Interest is added for delay.', 12),
    ('settlement', 'settlement', 'noun', 'final calculation of payments', 'rozliczenie', 'Settlement is complete.', 13)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('remuneration', 'remuneration', 'noun', 'payment for work or services', 'wynagrodzenie', 'Remuneration is stated in the contract.', 1),
    ('payment', 'payment', 'noun', 'money paid for goods or services', 'platnosc', 'Payment is due today.', 2),
    ('amount', 'amount', 'noun', 'a sum of money', 'kwota', 'The amount is fixed.', 3),
    ('price', 'price', 'noun', 'the cost of something', 'cena', 'The price is final.', 4),
    ('rate', 'rate', 'noun', 'a price per unit', 'stawka', 'The rate is hourly.', 5),
    ('installment', 'installment', 'noun', 'a part of a total payment', 'rata', 'The installment is monthly.', 6),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 7),
    ('payment term', 'payment term', 'noun', 'the deadline for payment', 'termin platnosci', 'The payment term is 14 days.', 8),
    ('advance payment', 'advance payment', 'noun', 'money paid before delivery', 'zaliczka', 'Advance payment is required.', 9),
    ('final payment', 'final payment', 'noun', 'the last payment', 'platnosc koncowa', 'Final payment is after delivery.', 10),
    ('delay', 'delay', 'noun', 'a late action or payment', 'opoznienie', 'There is a delay in payment.', 11),
    ('interest', 'interest', 'noun', 'extra money for late payment', 'odsetki', 'Interest is added for delay.', 12),
    ('settlement', 'settlement', 'noun', 'final calculation of payments', 'rozliczenie', 'Settlement is complete.', 13)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('remuneration', 'remuneration', 'noun', 'payment for work or services', 'wynagrodzenie', 'Remuneration is stated in the contract.', 1),
    ('payment', 'payment', 'noun', 'money paid for goods or services', 'platnosc', 'Payment is due today.', 2),
    ('amount', 'amount', 'noun', 'a sum of money', 'kwota', 'The amount is fixed.', 3),
    ('price', 'price', 'noun', 'the cost of something', 'cena', 'The price is final.', 4),
    ('rate', 'rate', 'noun', 'a price per unit', 'stawka', 'The rate is hourly.', 5),
    ('installment', 'installment', 'noun', 'a part of a total payment', 'rata', 'The installment is monthly.', 6),
    ('invoice', 'invoice', 'noun', 'a document requesting payment', 'faktura', 'The invoice was sent.', 7),
    ('payment term', 'payment term', 'noun', 'the deadline for payment', 'termin platnosci', 'The payment term is 14 days.', 8),
    ('advance payment', 'advance payment', 'noun', 'money paid before delivery', 'zaliczka', 'Advance payment is required.', 9),
    ('final payment', 'final payment', 'noun', 'the last payment', 'platnosc koncowa', 'Final payment is after delivery.', 10),
    ('delay', 'delay', 'noun', 'a late action or payment', 'opoznienie', 'There is a delay in payment.', 11),
    ('interest', 'interest', 'noun', 'extra money for late payment', 'odsetki', 'Interest is added for delay.', 12),
    ('settlement', 'settlement', 'noun', 'final calculation of payments', 'rozliczenie', 'Settlement is complete.', 13)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack I: UMOWY — Odpowiedzialnosc i zabezpieczenia
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('contractual liability', 'contractual liability', 'noun', 'liability arising from a contract', 'odpowiedzialnosc umowna', 'Contractual liability is limited.', 1),
    ('financial liability', 'financial liability', 'noun', 'liability for financial loss', 'odpowiedzialnosc finansowa', 'Financial liability is capped.', 2),
    ('contractual penalty', 'contractual penalty', 'noun', 'a penalty for breach of contract', 'kara umowna', 'The contractual penalty is high.', 3),
    ('damages', 'damages', 'noun', 'money paid for harm or loss', 'odszkodowanie', 'Damages are payable.', 4),
    ('security', 'security', 'noun', 'protection or collateral', 'zabezpieczenie', 'Security is required.', 5),
    ('guarantee', 'guarantee', 'noun', 'a promise of performance', 'gwarancja', 'The guarantee lasts one year.', 6),
    ('statutory warranty', 'statutory warranty', 'noun', 'legal warranty for defects', 'rekojmia', 'The statutory warranty covers defects.', 7),
    ('insurance', 'insurance', 'noun', 'coverage against loss', 'ubezpieczenie', 'Insurance is mandatory.', 8),
    ('force majeure', 'force majeure', 'noun', 'events beyond control', 'sila wyzsza', 'Force majeure applies here.', 9)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('contractual liability', 'contractual liability', 'noun', 'liability arising from a contract', 'odpowiedzialnosc umowna', 'Contractual liability is limited.', 1),
    ('financial liability', 'financial liability', 'noun', 'liability for financial loss', 'odpowiedzialnosc finansowa', 'Financial liability is capped.', 2),
    ('contractual penalty', 'contractual penalty', 'noun', 'a penalty for breach of contract', 'kara umowna', 'The contractual penalty is high.', 3),
    ('damages', 'damages', 'noun', 'money paid for harm or loss', 'odszkodowanie', 'Damages are payable.', 4),
    ('security', 'security', 'noun', 'protection or collateral', 'zabezpieczenie', 'Security is required.', 5),
    ('guarantee', 'guarantee', 'noun', 'a promise of performance', 'gwarancja', 'The guarantee lasts one year.', 6),
    ('statutory warranty', 'statutory warranty', 'noun', 'legal warranty for defects', 'rekojmia', 'The statutory warranty covers defects.', 7),
    ('insurance', 'insurance', 'noun', 'coverage against loss', 'ubezpieczenie', 'Insurance is mandatory.', 8),
    ('force majeure', 'force majeure', 'noun', 'events beyond control', 'sila wyzsza', 'Force majeure applies here.', 9)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('contractual liability', 'contractual liability', 'noun', 'liability arising from a contract', 'odpowiedzialnosc umowna', 'Contractual liability is limited.', 1),
    ('financial liability', 'financial liability', 'noun', 'liability for financial loss', 'odpowiedzialnosc finansowa', 'Financial liability is capped.', 2),
    ('contractual penalty', 'contractual penalty', 'noun', 'a penalty for breach of contract', 'kara umowna', 'The contractual penalty is high.', 3),
    ('damages', 'damages', 'noun', 'money paid for harm or loss', 'odszkodowanie', 'Damages are payable.', 4),
    ('security', 'security', 'noun', 'protection or collateral', 'zabezpieczenie', 'Security is required.', 5),
    ('guarantee', 'guarantee', 'noun', 'a promise of performance', 'gwarancja', 'The guarantee lasts one year.', 6),
    ('statutory warranty', 'statutory warranty', 'noun', 'legal warranty for defects', 'rekojmia', 'The statutory warranty covers defects.', 7),
    ('insurance', 'insurance', 'noun', 'coverage against loss', 'ubezpieczenie', 'Insurance is mandatory.', 8),
    ('force majeure', 'force majeure', 'noun', 'events beyond control', 'sila wyzsza', 'Force majeure applies here.', 9)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('contractual liability', 'contractual liability', 'noun', 'liability arising from a contract', 'odpowiedzialnosc umowna', 'Contractual liability is limited.', 1),
    ('financial liability', 'financial liability', 'noun', 'liability for financial loss', 'odpowiedzialnosc finansowa', 'Financial liability is capped.', 2),
    ('contractual penalty', 'contractual penalty', 'noun', 'a penalty for breach of contract', 'kara umowna', 'The contractual penalty is high.', 3),
    ('damages', 'damages', 'noun', 'money paid for harm or loss', 'odszkodowanie', 'Damages are payable.', 4),
    ('security', 'security', 'noun', 'protection or collateral', 'zabezpieczenie', 'Security is required.', 5),
    ('guarantee', 'guarantee', 'noun', 'a promise of performance', 'gwarancja', 'The guarantee lasts one year.', 6),
    ('statutory warranty', 'statutory warranty', 'noun', 'legal warranty for defects', 'rekojmia', 'The statutory warranty covers defects.', 7),
    ('insurance', 'insurance', 'noun', 'coverage against loss', 'ubezpieczenie', 'Insurance is mandatory.', 8),
    ('force majeure', 'force majeure', 'noun', 'events beyond control', 'sila wyzsza', 'Force majeure applies here.', 9)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack J: UMOWY — Poufnosc i dane
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('confidentiality', 'confidentiality', 'noun', 'keeping information private', 'poufnosc', 'Confidentiality is required.', 1),
    ('trade secret', 'trade secret', 'noun', 'confidential business information', 'tajemnica handlowa', 'Trade secrets are protected.', 2),
    ('personal data', 'personal data', 'noun', 'information about a person', 'dane osobowe', 'Personal data must be secured.', 3),
    ('data protection', 'data protection', 'noun', 'safeguards for personal data', 'ochrona danych', 'Data protection is a priority.', 4),
    ('data processing', 'data processing', 'noun', 'handling of personal data', 'przetwarzanie danych', 'Data processing is limited.', 5),
    ('consent', 'consent', 'noun', 'permission to use data', 'zgoda', 'Consent is required.', 6),
    ('breach', 'breach', 'noun', 'a violation of rules or security', 'naruszenie', 'Report any breach.', 7),
    ('legal liability', 'legal liability', 'noun', 'responsibility under the law', 'odpowiedzialnosc prawna', 'Legal liability is defined.', 8)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('confidentiality', 'confidentiality', 'noun', 'keeping information private', 'poufnosc', 'Confidentiality is required.', 1),
    ('trade secret', 'trade secret', 'noun', 'confidential business information', 'tajemnica handlowa', 'Trade secrets are protected.', 2),
    ('personal data', 'personal data', 'noun', 'information about a person', 'dane osobowe', 'Personal data must be secured.', 3),
    ('data protection', 'data protection', 'noun', 'safeguards for personal data', 'ochrona danych', 'Data protection is a priority.', 4),
    ('data processing', 'data processing', 'noun', 'handling of personal data', 'przetwarzanie danych', 'Data processing is limited.', 5),
    ('consent', 'consent', 'noun', 'permission to use data', 'zgoda', 'Consent is required.', 6),
    ('breach', 'breach', 'noun', 'a violation of rules or security', 'naruszenie', 'Report any breach.', 7),
    ('legal liability', 'legal liability', 'noun', 'responsibility under the law', 'odpowiedzialnosc prawna', 'Legal liability is defined.', 8)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('confidentiality', 'confidentiality', 'noun', 'keeping information private', 'poufnosc', 'Confidentiality is required.', 1),
    ('trade secret', 'trade secret', 'noun', 'confidential business information', 'tajemnica handlowa', 'Trade secrets are protected.', 2),
    ('personal data', 'personal data', 'noun', 'information about a person', 'dane osobowe', 'Personal data must be secured.', 3),
    ('data protection', 'data protection', 'noun', 'safeguards for personal data', 'ochrona danych', 'Data protection is a priority.', 4),
    ('data processing', 'data processing', 'noun', 'handling of personal data', 'przetwarzanie danych', 'Data processing is limited.', 5),
    ('consent', 'consent', 'noun', 'permission to use data', 'zgoda', 'Consent is required.', 6),
    ('breach', 'breach', 'noun', 'a violation of rules or security', 'naruszenie', 'Report any breach.', 7),
    ('legal liability', 'legal liability', 'noun', 'responsibility under the law', 'odpowiedzialnosc prawna', 'Legal liability is defined.', 8)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('confidentiality', 'confidentiality', 'noun', 'keeping information private', 'poufnosc', 'Confidentiality is required.', 1),
    ('trade secret', 'trade secret', 'noun', 'confidential business information', 'tajemnica handlowa', 'Trade secrets are protected.', 2),
    ('personal data', 'personal data', 'noun', 'information about a person', 'dane osobowe', 'Personal data must be secured.', 3),
    ('data protection', 'data protection', 'noun', 'safeguards for personal data', 'ochrona danych', 'Data protection is a priority.', 4),
    ('data processing', 'data processing', 'noun', 'handling of personal data', 'przetwarzanie danych', 'Data processing is limited.', 5),
    ('consent', 'consent', 'noun', 'permission to use data', 'zgoda', 'Consent is required.', 6),
    ('breach', 'breach', 'noun', 'a violation of rules or security', 'naruszenie', 'Report any breach.', 7),
    ('legal liability', 'legal liability', 'noun', 'responsibility under the law', 'odpowiedzialnosc prawna', 'Legal liability is defined.', 8)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

-- ============================================
-- Pack K: UMOWY — Spory i zakonczenie wspolpracy
-- ============================================
with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('dispute', 'dispute', 'noun', 'a disagreement between parties', 'spor', 'The dispute is resolved.', 1),
    ('claim', 'claim', 'noun', 'a formal request for something', 'roszczenie', 'The claim is valid.', 2),
    ('negotiations', 'negotiations', 'noun', 'talks to reach an agreement', 'negocjacje', 'Negotiations are ongoing.', 3),
    ('mediation', 'mediation', 'noun', 'assisted negotiation by a neutral person', 'mediacja', 'Mediation helps resolve issues.', 4),
    ('arbitration', 'arbitration', 'noun', 'a private dispute process', 'arbitraz', 'Arbitration is confidential.', 5),
    ('court', 'court', 'noun', 'a legal institution for disputes', 'sad', 'The case went to court.', 6),
    ('dispute resolution', 'dispute resolution', 'noun', 'the process of resolving disputes', 'rozwiazanie sporu', 'Dispute resolution is required.', 7),
    ('end of cooperation', 'end of cooperation', 'noun', 'the end of a business relationship', 'zakonczenie wspolpracy', 'The end of cooperation is agreed.', 8)
)
insert into lexicon_entries (lemma, lemma_norm, pos)
select w.lemma, w.lemma_norm, w.pos
from words w
where not exists (
  select 1 from lexicon_entries e
  where e.lemma_norm = w.lemma_norm
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('dispute', 'dispute', 'noun', 'a disagreement between parties', 'spor', 'The dispute is resolved.', 1),
    ('claim', 'claim', 'noun', 'a formal request for something', 'roszczenie', 'The claim is valid.', 2),
    ('negotiations', 'negotiations', 'noun', 'talks to reach an agreement', 'negocjacje', 'Negotiations are ongoing.', 3),
    ('mediation', 'mediation', 'noun', 'assisted negotiation by a neutral person', 'mediacja', 'Mediation helps resolve issues.', 4),
    ('arbitration', 'arbitration', 'noun', 'a private dispute process', 'arbitraz', 'Arbitration is confidential.', 5),
    ('court', 'court', 'noun', 'a legal institution for disputes', 'sad', 'The case went to court.', 6),
    ('dispute resolution', 'dispute resolution', 'noun', 'the process of resolving disputes', 'rozwiazanie sporu', 'Dispute resolution is required.', 7),
    ('end of cooperation', 'end of cooperation', 'noun', 'the end of a business relationship', 'zakonczenie wspolpracy', 'The end of cooperation is agreed.', 8)
)
insert into lexicon_senses (entry_id, definition_en, domain, sense_order)
select e.id, w.definition_en, 'contracts', 0
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
where not exists (
  select 1 from lexicon_senses s
  where s.entry_id = e.id and s.sense_order = 0
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('dispute', 'dispute', 'noun', 'a disagreement between parties', 'spor', 'The dispute is resolved.', 1),
    ('claim', 'claim', 'noun', 'a formal request for something', 'roszczenie', 'The claim is valid.', 2),
    ('negotiations', 'negotiations', 'noun', 'talks to reach an agreement', 'negocjacje', 'Negotiations are ongoing.', 3),
    ('mediation', 'mediation', 'noun', 'assisted negotiation by a neutral person', 'mediacja', 'Mediation helps resolve issues.', 4),
    ('arbitration', 'arbitration', 'noun', 'a private dispute process', 'arbitraz', 'Arbitration is confidential.', 5),
    ('court', 'court', 'noun', 'a legal institution for disputes', 'sad', 'The case went to court.', 6),
    ('dispute resolution', 'dispute resolution', 'noun', 'the process of resolving disputes', 'rozwiazanie sporu', 'Dispute resolution is required.', 7),
    ('end of cooperation', 'end of cooperation', 'noun', 'the end of a business relationship', 'zakonczenie wspolpracy', 'The end of cooperation is agreed.', 8)
)
insert into lexicon_translations (sense_id, translation_pl)
select s.id, w.translation_pl
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_translations lt
  where lt.sense_id = s.id
);

with words(lemma, lemma_norm, pos, definition_en, translation_pl, example_en, order_index) as (
  values
    ('dispute', 'dispute', 'noun', 'a disagreement between parties', 'spor', 'The dispute is resolved.', 1),
    ('claim', 'claim', 'noun', 'a formal request for something', 'roszczenie', 'The claim is valid.', 2),
    ('negotiations', 'negotiations', 'noun', 'talks to reach an agreement', 'negocjacje', 'Negotiations are ongoing.', 3),
    ('mediation', 'mediation', 'noun', 'assisted negotiation by a neutral person', 'mediacja', 'Mediation helps resolve issues.', 4),
    ('arbitration', 'arbitration', 'noun', 'a private dispute process', 'arbitraz', 'Arbitration is confidential.', 5),
    ('court', 'court', 'noun', 'a legal institution for disputes', 'sad', 'The case went to court.', 6),
    ('dispute resolution', 'dispute resolution', 'noun', 'the process of resolving disputes', 'rozwiazanie sporu', 'Dispute resolution is required.', 7),
    ('end of cooperation', 'end of cooperation', 'noun', 'the end of a business relationship', 'zakonczenie wspolpracy', 'The end of cooperation is agreed.', 8)
)
insert into lexicon_examples (sense_id, example_en, source)
select s.id, w.example_en, 'manual'
from words w
join lexicon_entries e on e.lemma_norm = w.lemma_norm
join lexicon_senses s on s.entry_id = e.id and s.sense_order = 0
where not exists (
  select 1 from lexicon_examples le
  where le.sense_id = s.id
);

commit;
