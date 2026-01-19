-- Migration: Seed vocab_cluster_entries with entry_id from lexicon_entries
-- Date: 2025-02-24
--
-- This script populates vocab_cluster_entries by looking up entry_id
-- from lexicon_entries based on lemma_norm

-- Cluster B: make/do/take/get
do $$
declare
  cluster_b_id uuid;
  entry_ids uuid[];
begin
  -- Get cluster ID
  select id into cluster_b_id from vocab_clusters where slug = 'make-do-take-get';
  
  if cluster_b_id is null then
    raise exception 'Cluster make-do-take-get not found';
  end if;

  -- Get entry_ids for make, do, take, get
  select array_agg(id) into entry_ids
  from lexicon_entries
  where lemma_norm in ('make', 'do', 'take', 'get');

  -- Insert cluster entries
  if entry_ids is not null then
    insert into vocab_cluster_entries (cluster_id, entry_id)
    select cluster_b_id, unnest(entry_ids)
    on conflict (cluster_id, entry_id) do nothing;
  end if;
end
$$;

-- Cluster C: say/tell
do $$
declare
  cluster_c_id uuid;
  entry_ids uuid[];
begin
  select id into cluster_c_id from vocab_clusters where slug = 'say-tell';
  
  if cluster_c_id is null then
    raise exception 'Cluster say-tell not found';
  end if;

  select array_agg(id) into entry_ids
  from lexicon_entries
  where lemma_norm in ('say', 'tell');

  if entry_ids is not null then
    insert into vocab_cluster_entries (cluster_id, entry_id)
    select cluster_c_id, unnest(entry_ids)
    on conflict (cluster_id, entry_id) do nothing;
  end if;
end
$$;

-- Cluster A: lend/borrow/rent/hire
do $$
declare
  cluster_a_id uuid;
  entry_ids uuid[];
begin
  select id into cluster_a_id from vocab_clusters where slug = 'lend-borrow-rent-hire';
  
  if cluster_a_id is null then
    raise exception 'Cluster lend-borrow-rent-hire not found';
  end if;

  select array_agg(id) into entry_ids
  from lexicon_entries
  where lemma_norm in ('lend', 'borrow', 'rent', 'hire');

  if entry_ids is not null then
    insert into vocab_cluster_entries (cluster_id, entry_id)
    select cluster_a_id, unnest(entry_ids)
    on conflict (cluster_id, entry_id) do nothing;
  end if;
end
$$;
