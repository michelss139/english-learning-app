"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Cluster = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
  unlocked: boolean;
  unlocked_at: string | null;
};

export default function ClustersSection() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasNewUnlock, setHasNewUnlock] = useState(false);

  useEffect(() => {
    const loadClusters = async () => {
      try {
        setLoading(true);
        setError("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          return;
        }

        const token = session.data.session.access_token;

        const res = await fetch("/api/vocab/clusters", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          console.error("[ClustersSection] API error:", errorData);
          throw new Error(errorData.error || "Nie udało się wczytać clusterów.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.clusters)) {
          console.error("[ClustersSection] Invalid response:", data);
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        console.log("[ClustersSection] Loaded clusters:", data.clusters.length);
        setClusters(data.clusters);

        // Check if any cluster was just unlocked (use newlyUnlockedSlugs from API)
        const newlyUnlockedSlugs = data.newlyUnlockedSlugs || [];
        if (newlyUnlockedSlugs.length > 0) {
          console.log("[ClustersSection] Newly unlocked clusters:", newlyUnlockedSlugs);
          setHasNewUnlock(true);
          // Hide banner after 10 seconds
          setTimeout(() => setHasNewUnlock(false), 10000);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać clusterów.");
      } finally {
        setLoading(false);
      }
    };

    loadClusters();
  }, []);

  if (loading) {
    return (
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="text-sm text-white/75">Ładuję clustery…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      </section>
    );
  }

  const recommendedClusters = clusters.filter((c) => c.is_recommended);
  const unlockableClusters = clusters.filter((c) => c.is_unlockable);

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Clusters</h2>
        <p className="text-sm text-white/75">Ćwicz wybór właściwego słowa w kontekście.</p>
      </div>

      {hasNewUnlock && (
        <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-100 font-medium">✨ Nowe ćwiczenie dostępne!</p>
        </div>
      )}

      {clusters.length === 0 ? (
        <div className="text-sm text-white/75">Brak dostępnych clusterów.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Recommended clusters - always unlocked (unlocked=true from API) */}
          {recommendedClusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => router.push(`/app/vocab/cluster/${cluster.slug}`)}
              className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{cluster.title}</h3>
                <span className="px-2 py-0.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-200">
                  Odblokowane
                </span>
              </div>
              <p className="text-xs text-white/60">Zalecane</p>
            </button>
          ))}

          {/* Unlockable clusters */}
          {unlockableClusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => {
                if (cluster.unlocked) {
                  router.push(`/app/vocab/cluster/${cluster.slug}`);
                }
              }}
              className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!cluster.unlocked}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{cluster.title}</h3>
                {cluster.unlocked ? (
                  <span className="px-2 py-0.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xs text-emerald-200">
                    Odblokowane
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg border border-amber-400/30 bg-amber-400/10 text-xs text-amber-200">
                    Zablokowane
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60">
                {cluster.unlocked ? "Dostępne" : "Dodaj wszystkie słowa z tego clustera do puli, aby odblokować"}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
