import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePinnedClusterSlugs } from "@/lib/vocab/pinnedClusters";
import { loadClusterCatalog } from "@/lib/vocab/clusterLoader";
import ClustersClient, { type ClusterDto } from "./ClustersClient";

export default async function VocabClustersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("notes")
    .eq("id", user!.id)
    .maybeSingle();

  const pinnedSlugs = new Set(parsePinnedClusterSlugs(profileRow?.notes ?? null));
  let payload: ClusterDto[] = [];

  try {
    const catalog = await loadClusterCatalog({
      supabase,
      studentId: user!.id,
      pinnedSlugs,
    });
    payload = catalog.clusters;
  } catch {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
            Nie udało się wczytać clusterów.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <ClustersClient clusters={payload} />
    </main>
  );
}

