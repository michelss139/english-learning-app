import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aggregatePackItemCounts } from "@/lib/vocab/aggregatePackItemCounts";
import PacksClient, { type PackDto } from "./PacksClient";

export const dynamic = "force-dynamic";

export default async function VocabPacksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: packs, error: packsErr } = await supabase
    .from("vocab_packs")
    .select("id, slug, title, description, order_index, vocab_mode, category")
    .eq("is_published", true)
    .order("order_index", { ascending: true })
    .order("title", { ascending: true });

  if (packsErr) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
        <p className="text-sm text-rose-700">Nie udało się wczytać fiszek.</p>
      </div>
    );
  }

  const packIds = (packs ?? []).map((p: any) => p.id).filter(Boolean);
  const counts = packIds.length > 0 ? await aggregatePackItemCounts(supabase, packIds) : new Map<string, number>();

  const initialPacks: PackDto[] = (packs ?? []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description ?? null,
    order_index: p.order_index ?? 0,
    vocab_mode: (p.vocab_mode ?? "daily") as PackDto["vocab_mode"],
    category: p.category ?? "general",
    item_count: counts.get(p.id) ?? 0,
  }));

  return <PacksClient initialPacks={initialPacks} />;
}
