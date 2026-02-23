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
      <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
        <div className="text-sm text-slate-600">Ładuję clustery…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
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
    <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Clusters</h2>
        <p className="text-sm text-slate-600">Ćwicz wybór właściwego słowa w kontekście.</p>
      </div>

      {hasNewUnlock && (
        <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-sm text-slate-700 font-medium">✨ Nowe ćwiczenie dostępne!</p>
        </div>
      )}

      {clusters.length === 0 ? (
        <div className="text-sm text-slate-600">Brak dostępnych clusterów.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Recommended clusters - always unlocked (unlocked=true from API) */}
          {recommendedClusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => router.push(`/app/vocab/cluster/${cluster.slug}`)}
              className="rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition"
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">Zalecane</p>
                <span className="px-2 py-0.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-700">
                  Odblokowane
                </span>
              </div>
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
              className="rounded-2xl border-2 border-slate-900 bg-white p-4 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!cluster.unlocked}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <h3 className="font-semibold text-slate-900">{cluster.title}</h3>
                <p className="text-xs text-slate-600">
                  {cluster.unlocked ? "Dostępne" : "Dodaj wszystkie słowa z tego clustera do puli, aby odblokować"}
                </p>
                {cluster.unlocked ? (
                  <span className="px-2 py-0.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-700">
                    Odblokowane
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg border border-amber-400 bg-amber-50 text-xs text-amber-800">
                    Zablokowane
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
