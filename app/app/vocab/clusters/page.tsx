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
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
        <p className="text-sm text-rose-700">Nie udało się wczytać zestawów.</p>
      </div>
    );
  }

  return <ClustersClient clusters={payload} />;
}

