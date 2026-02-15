import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePinnedClusterSlugs } from "@/lib/vocab/pinnedClusters";
import ClustersClient, { type ClusterDto } from "./ClustersClient";

type DbCluster = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
};

type UnlockedRow = {
  cluster_id: string;
  unlocked_at: string | null;
};

export default async function VocabClustersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clustersRaw, error: clustersErr } = await supabase
    .from("vocab_clusters")
    .select("id, slug, title, is_recommended, is_unlockable")
    .order("is_recommended", { ascending: false })
    .order("title");

  if (clustersErr) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
            Nie udało się wczytać clusterów.
          </div>
        </section>
      </main>
    );
  }

  const clusters = (clustersRaw ?? []) as DbCluster[];

  const { data: unlockedRows, error: unlockedErr } = await supabase
    .from("user_unlocked_vocab_clusters")
    .select("cluster_id, unlocked_at")
    .eq("student_id", user.id);

  if (unlockedErr) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
            Nie udało się wczytać statusu odblokowania.
          </div>
        </section>
      </main>
    );
  }

  const unlockedSet = new Set((unlockedRows ?? []).map((r: UnlockedRow) => r.cluster_id));
  const unlockedAtMap = new Map((unlockedRows ?? []).map((r: UnlockedRow) => [r.cluster_id, r.unlocked_at]));

  // One-time user vocab entry_id set (used for auto-unlock checks)
  const { data: userVocabRows } = await supabase
    .from("user_vocab_items")
    .select(
      `
      sense_id,
      lexicon_senses(entry_id)
    `,
    )
    .eq("student_id", user.id)
    .eq("source", "lexicon");

  const userEntryIds = new Set<string>();
  for (const item of (userVocabRows ?? []) as any[]) {
    const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
    if (sense?.entry_id) userEntryIds.add(sense.entry_id);
  }

  const newlyUnlockedSlugs: string[] = [];
  const clustersUnlockedNow = new Set<string>();

  for (const cluster of clusters) {
    if (cluster.is_recommended) continue;
    if (!cluster.is_unlockable) continue;
    if (unlockedSet.has(cluster.id)) continue;

    const { data: clusterEntries, error: entriesErr } = await supabase
      .from("vocab_cluster_entries")
      .select("entry_id")
      .eq("cluster_id", cluster.id);

    if (entriesErr) continue;
    if (!clusterEntries || clusterEntries.length === 0) continue;

    const requiredEntryIds = (clusterEntries as any[]).map((e) => e.entry_id).filter(Boolean);
    const hasAll = requiredEntryIds.every((entryId) => userEntryIds.has(entryId));
    if (!hasAll) continue;

    const { error: insertErr } = await supabase.from("user_unlocked_vocab_clusters").insert({
      student_id: user.id,
      cluster_id: cluster.id,
    });

    if (insertErr && !String(insertErr.message).toLowerCase().includes("duplicate")) {
      continue;
    }

    clustersUnlockedNow.add(cluster.id);
    newlyUnlockedSlugs.push(cluster.slug);
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("notes")
    .eq("id", user.id)
    .maybeSingle();

  const pinnedSlugs = new Set(parsePinnedClusterSlugs(profileRow?.notes ?? null));

  const payload: ClusterDto[] = clusters.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    is_recommended: c.is_recommended,
    is_unlockable: c.is_unlockable,
    unlocked: c.is_recommended ? true : unlockedSet.has(c.id) || clustersUnlockedNow.has(c.id),
    unlocked_at: c.is_recommended
      ? null
      : unlockedAtMap.get(c.id) ?? (clustersUnlockedNow.has(c.id) ? new Date().toISOString() : null),
    pinned: pinnedSlugs.has(c.slug),
  }));

  return (
    <main className="space-y-6">
      <ClustersClient clusters={payload} newlyUnlockedSlugs={newlyUnlockedSlugs} />
    </main>
  );
}

