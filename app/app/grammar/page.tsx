"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { getAllGrammarTenses } from "@/lib/grammar/content";
import Link from "next/link";

export default function GrammarPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session?.data?.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        setProfile(prof);
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const tenses = getAllGrammarTenses();

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Gramatyka</h1>
            <p className="text-sm text-white/75">
              Teoria czasów gramatycznych, przykłady, porównania.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app"
            >
              ← Panel ucznia
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Spis treści</h2>
          <p className="text-sm text-white/75 mb-6">
            Wybierz czas gramatyczny, aby zobaczyć teorię, przykłady i ćwiczenia.
          </p>
        </div>

        <div className="space-y-6">
          {/* Special section: Stative Verbs */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Rozdziały specjalne</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/app/grammar/stative-verbs"
                className="group rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/10 p-4 hover:bg-emerald-400/20 hover:border-emerald-400/40 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white group-hover:text-white transition">
                      Stative Verbs
                    </div>
                    <span className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                      Killer Feature
                    </span>
                  </div>
                  <div className="text-sm text-white/75">
                    Czasowniki stanu - klucz do naturalnego angielskiego
                  </div>
                  <div className="pt-2 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
                    Czytaj <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Regular tenses */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Czasy gramatyczne</h3>
            {tenses.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                Treści będą dostępne wkrótce. Moduł jest w trakcie przygotowania.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tenses.map((tense) => (
                  <Link
                    key={tense.slug}
                    href={`/app/grammar/${tense.slug}`}
                    className="group rounded-2xl border-2 border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition"
                  >
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-white group-hover:text-white transition">
                        {tense.title}
                      </div>
                      {tense.description && (
                        <div className="text-sm text-white/75">{tense.description}</div>
                      )}
                      <div className="pt-2 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
                        Czytaj <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
