"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { getGrammarTenseBySlug } from "./content";
import type { GrammarTenseSlug } from "./types";
import { TensePageContent } from "./TensePageContent";
import Link from "next/link";

type TensePageWrapperProps = {
  slug: GrammarTenseSlug;
};

export function TensePageWrapper({ slug }: TensePageWrapperProps) {
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

  const tense = getGrammarTenseBySlug(slug);

  if (loading) return <main>Ładuję…</main>;

  if (!tense) {
    return (
      <main className="space-y-6">
        <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Czas nie znaleziony</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
                href="/app/grammar"
              >
                ← Spis treści
              </Link>
            </div>
          </div>
        </header>
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <p className="text-white/75">Czas gramatyczny o slug "{slug}" nie został znaleziony.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{tense.title}</h1>
            {tense.description && <p className="text-sm text-white/75">{tense.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/grammar"
            >
              ← Spis treści
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-6">
        <TensePageContent tense={tense} />
      </section>
    </main>
  );
}
