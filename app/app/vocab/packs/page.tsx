import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aggregatePackItemCounts } from "@/lib/vocab/aggregatePackItemCounts";
import { computePackCompletionBadges, type PackCompletionBadge } from "@/lib/vocab/packCompletionBadge";
import { comparePacksForCatalog } from "@/lib/vocab/packCatalogOrder";
import PacksClient, { type PackDto } from "./PacksClient";

export const dynamic = "force-dynamic";

function presentationTitle(row: { display_title: string | null; title: string }): string {
  const d = row.display_title?.trim();
  if (d) return d;
  return row.title?.trim() || "";
}

export default async function VocabPacksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  let packsQuery = supabase
    .from("vocab_packs")
    .select(
      "id, slug, title, display_title, display_section, display_subsection, order_index, vocab_mode, category, is_archived, featured_rank",
    )
    .eq("is_published", true);

  if (!isAdmin) {
    packsQuery = packsQuery.eq("is_archived", false);
  }

  const { data: packs, error: packsErr } = await packsQuery;

  if (packsErr) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
        <p className="text-sm text-rose-700">Nie udało się wczytać fiszek.</p>
      </div>
    );
  }

  const rows = [...(packs ?? [])];
  rows.sort((a: any, b: any) =>
    comparePacksForCatalog(
      {
        featured_rank: a.featured_rank ?? null,
        order_index: a.order_index ?? 0,
        presentation_title: presentationTitle(a),
      },
      {
        featured_rank: b.featured_rank ?? null,
        order_index: b.order_index ?? 0,
        presentation_title: presentationTitle(b),
      },
    ),
  );

  const packIds = rows.map((p: any) => p.id).filter(Boolean);
  const counts = packIds.length > 0 ? await aggregatePackItemCounts(supabase, packIds) : new Map<string, number>();

  const badgeMap =
    user?.id && packIds.length > 0
      ? await computePackCompletionBadges(supabase, user.id, packIds, counts)
      : new Map<string, PackCompletionBadge>();

  const initialPacks: PackDto[] = rows.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    presentation_title: presentationTitle(p),
    order_index: p.order_index ?? 0,
    vocab_mode: (p.vocab_mode ?? "daily") as PackDto["vocab_mode"],
    category: p.category ?? "general",
    display_section: p.display_section ?? null,
    display_subsection: p.display_subsection ?? null,
    featured_rank: p.featured_rank ?? null,
    is_archived: Boolean(p.is_archived),
    item_count: counts.get(p.id) ?? 0,
    completion_badge: badgeMap.get(p.id) ?? "none",
  }));

  return <PacksClient initialPacks={initialPacks} isAdmin={isAdmin} />;
}
