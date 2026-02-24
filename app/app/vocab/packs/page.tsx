import { createSupabaseServerClient } from "@/lib/supabase/server";
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
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
            Nie udało się wczytać packów.
          </div>
        </section>
      </main>
    );
  }

  const packIds = (packs ?? []).map((p: any) => p.id).filter(Boolean);
  let counts = new Map<string, number>();

  if (packIds.length > 0) {
    const { data: items, error: itemsErr } = await supabase.from("vocab_pack_items").select("pack_id").in("pack_id", packIds);
    if (!itemsErr) {
      counts = new Map<string, number>();
      for (const item of items ?? []) {
        const current = counts.get((item as any).pack_id) ?? 0;
        counts.set((item as any).pack_id, current + 1);
      }
    }
  }

  const initialPacks: PackDto[] = (packs ?? []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description ?? null,
    order_index: p.order_index ?? 0,
    vocab_mode: (p.vocab_mode ?? "mixed") as PackDto["vocab_mode"],
    category: p.category ?? "general",
    item_count: counts.get(p.id) ?? 0,
  }));

  return (
    <main className="space-y-6">
      <PacksClient initialPacks={initialPacks} />
    </main>
  );
}
