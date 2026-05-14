begin;

update public.vocab_clusters
set theory_md = E'Najprościej zapamiętać to tak: jeśli coś powstaje albo pojawia się efekt, zwykle używamy make. Jeśli mówimy o wykonywaniu czynności, obowiązku albo zadania, zwykle używamy do.

Polskie tłumaczenie:
- make -> robić, zrobić, tworzyć, przygotować
- do -> robić, wykonywać, zajmować się

Verb forms:
- make -> make / makes / made / made
- do -> do / does / did / done'
where slug = 'make-do';

update public.vocab_cluster_patterns p
set title = v.new_title
from public.vocab_clusters c
cross join (
  values
    (10, 'Tworzenie i wywoływanie efektu'),
    (20, 'Czynności i obowiązki'),
    (30, 'Częste kolokacje z make'),
    (40, 'Częste kolokacje z do')
) as v(sort_order, new_title)
where p.cluster_id = c.id
  and c.slug = 'make-do'
  and p.sort_order = v.sort_order;

commit;
