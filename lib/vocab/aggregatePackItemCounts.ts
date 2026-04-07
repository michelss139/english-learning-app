import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * Liczy pozycje `vocab_pack_items` per pack_id. Paginuje po stronie klienta API,
 * żeby nie uderzyć w domyślny limit ~1000 wierszy jednego zapytania PostgREST.
 */
export async function aggregatePackItemCounts(
  client: SupabaseClient,
  packIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (packIds.length === 0) return counts;

  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("vocab_pack_items")
      .select("pack_id")
      .in("pack_id", packIds)
      .order("pack_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`aggregatePackItemCounts: ${error.message}`);
    }

    const rows = data ?? [];
    for (const row of rows) {
      const pid = row.pack_id as string;
      if (!pid) continue;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return counts;
}
