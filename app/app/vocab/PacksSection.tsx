"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Pack = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  item_count: number;
};

export default function PacksSection() {
  const router = useRouter();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPacks = async () => {
      try {
        setLoading(true);
        setError("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          return;
        }

        const token = session.data.session.access_token;
        const res = await fetch("/api/vocab/packs", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się wczytać packów.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.packs)) {
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        setPacks(data.packs);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać packów.");
      } finally {
        setLoading(false);
      }
    };

    loadPacks();
  }, []);

  if (loading) {
    return (
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="text-sm text-white/75">Ładuję packi…</div>
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

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Fiszki</h2>
        <p className="text-sm text-white/75">Szybkie powtórki na podstawie fiszek.</p>
      </div>

      {packs.length === 0 ? (
        <div className="text-sm text-white/75">Brak dostępnych packów.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => router.push(`/app/vocab/pack/${pack.slug}`)}
              className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{pack.title}</h3>
                <span className="text-xs text-white/60">{pack.item_count} fiszek</span>
              </div>
              <p className="text-xs text-white/60">{pack.description || "Szybka powtórka słówek."}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
