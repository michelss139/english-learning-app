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

  const shopPack = packs.find((pack) => pack.slug === "shop");
  const transportPacks = packs.filter((pack) => pack.slug.startsWith("transport-"));
  const contractsPacks = packs.filter((pack) => pack.slug.startsWith("contracts-"));
  const homePacks = packs.filter(
    (pack) =>
      pack.slug !== "shop" &&
      !pack.slug.startsWith("transport-") &&
      !pack.slug.startsWith("contracts-")
  );

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Fiszki</h2>
        <p className="text-sm text-white/75">Szybkie powtórki na podstawie fiszek.</p>
      </div>

      {packs.length === 0 ? (
        <div className="text-sm text-white/75">Brak dostępnych packów.</div>
      ) : (
        <>
          {shopPack ? (
            <details className="rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-white/80">
                W sklepie (1)
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  key={shopPack.id}
                  onClick={() => router.push(`/app/vocab/pack/${shopPack.slug}`)}
                  className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white">{shopPack.title}</h3>
                    <span className="text-xs text-white/60">{shopPack.item_count} fiszek</span>
                  </div>
                  <p className="text-xs text-white/60">{shopPack.description || "Szybka powtórka słówek."}</p>
                </button>
              </div>
            </details>
          ) : null}

          <details className="rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-white/80">
              Transport ({transportPacks.length})
            </summary>
            {transportPacks.length === 0 ? (
              <div className="mt-3 text-sm text-white/60">Brak packów w tej grupie.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {transportPacks.map((pack) => (
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
          </details>

          <details className="rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-white/80">
              Umowy ({contractsPacks.length})
            </summary>
            {contractsPacks.length === 0 ? (
              <div className="mt-3 text-sm text-white/60">Brak packów w tej grupie.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {contractsPacks.map((pack) => (
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
          </details>

          <details className="rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-white/80">
              W domu ({homePacks.length})
            </summary>
            {homePacks.length === 0 ? (
              <div className="mt-3 text-sm text-white/60">Brak packów w tej grupie.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {homePacks.map((pack) => (
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
          </details>
        </>
      )}
    </section>
  );
}
