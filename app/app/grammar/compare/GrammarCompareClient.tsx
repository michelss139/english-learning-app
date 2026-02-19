"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { getComparison, getComparisonCacheKey } from "@/lib/grammar/compare";
import { GlossaryTooltip } from "@/lib/grammar/components";
import Link from "next/link";
import type { GrammarTenseSlug } from "@/lib/grammar/types";

export default function GrammarCompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tense1Slug = (searchParams.get("tense1") || "") as GrammarTenseSlug;
  const tense2Slug = (searchParams.get("tense2") || "") as GrammarTenseSlug;

  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialog, setAiDialog] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

  const comparison = tense1Slug && tense2Slug ? getComparison(tense1Slug, tense2Slug) : null;

  const handleGenerateAIDialog = async () => {
    if (!tense1Slug || !tense2Slug) return;

    setAiDialogLoading(true);
    setAiError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setAiError("Musisz być zalogowany");
        setAiDialogLoading(false);
        return;
      }

      const cacheKey = getComparisonCacheKey(tense1Slug, tense2Slug);

      // First, try to get from cache
      const cacheRes = await fetch(`/api/grammar/ai-dialog?key=${encodeURIComponent(cacheKey)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.ok && cacheData.cached && cacheData.dialog) {
          setAiDialog(cacheData.dialog);
          setAiDialogLoading(false);
          return;
        }
      }

      // If not cached, generate new
      const genRes = await fetch("/api/grammar/ai-dialog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tense1: tense1Slug,
          tense2: tense2Slug,
        }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Błąd generowania dialogu");
      }

      const genData = await genRes.json();
      if (genData.ok && genData.dialog) {
        setAiDialog(genData.dialog);
      } else {
        throw new Error("Nie udało się wygenerować dialogu");
      }
    } catch (e: any) {
      setAiError(e?.message || "Błąd generowania dialogu AI");
    } finally {
      setAiDialogLoading(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  if (!tense1Slug || !tense2Slug) {
    return (
      <main className="space-y-6">
        <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Porównywarka czasów</h1>
              <p className="text-sm text-white/75">Brak parametrów porównania</p>
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
          <p className="text-white/75">Wybierz czasy do porównania z kart czasów gramatycznych.</p>
        </section>
      </main>
    );
  }

  if (!comparison) {
    return (
      <main className="space-y-6">
        <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Porównywarka czasów</h1>
              <p className="text-sm text-white/75">Nie znaleziono porównania</p>
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
          <p className="text-white/75">
            Porównanie między "{tense1Slug}" a "{tense2Slug}" nie jest dostępne.
          </p>
        </section>
      </main>
    );
  }

  const { tense1, tense2, title, description } = comparison;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {description && <p className="text-sm text-white/75">{description}</p>}
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

      {/* Side-by-side comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tense 1 */}
        <div className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">{tense1.title}</h2>
            <Link
              href={`/app/grammar/${tense1.slug}`}
              className="text-sm text-white/60 hover:text-white transition"
            >
              Zobacz pełną teorię →
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Po co używamy</h3>
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line text-sm">
                {tense1.content.usage.split("\n").slice(0, 3).join("\n")}...
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Charakterystyczne słowa</h3>
              <div className="flex flex-wrap gap-2">
                {tense1.content.chips?.slice(0, 5).map((chip, index) => (
                  <span
                    key={index}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                    title={chip.description}
                  >
                    {chip.text}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Struktura</h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-xs">
                  {tense1.content.structure.affirmative.split("\n").slice(0, 2).join("\n")}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Przykład</h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/90 text-sm">
                  {tense1.content.examples.split("\n").filter((l) => l.trim())[0]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tense 2 */}
        <div className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">{tense2.title}</h2>
            <Link
              href={`/app/grammar/${tense2.slug}`}
              className="text-sm text-white/60 hover:text-white transition"
            >
              Zobacz pełną teorię →
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Po co używamy</h3>
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line text-sm">
                {tense2.content.usage.split("\n").slice(0, 3).join("\n")}...
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Charakterystyczne słowa</h3>
              <div className="flex flex-wrap gap-2">
                {tense2.content.chips?.slice(0, 5).map((chip, index) => (
                  <span
                    key={index}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                    title={chip.description}
                  >
                    {chip.text}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Struktura</h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-xs">
                  {tense2.content.structure.affirmative.split("\n").slice(0, 2).join("\n")}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-white/80 mb-2">Przykład</h3>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/90 text-sm">
                  {tense2.content.examples.split("\n").filter((l) => l.trim())[0]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed comparison section */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Różnice i podobieństwa</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">{tense1.title}</h3>
            <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line text-sm">
              <div className="space-y-2">
                <div>
                  <strong className="text-emerald-300">Intencja:</strong>
                  <div className="mt-1">{tense1.content.usage.split("\n").slice(0, 2).join("\n")}</div>
                </div>
                <div>
                  <strong className="text-emerald-300">Uwaga:</strong>
                  <div className="mt-1 text-amber-200">{tense1.content.confusionWarnings.split("\n").slice(0, 2).join("\n")}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white">{tense2.title}</h3>
            <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line text-sm">
              <div className="space-y-2">
                <div>
                  <strong className="text-emerald-300">Intencja:</strong>
                  <div className="mt-1">{tense2.content.usage.split("\n").slice(0, 2).join("\n")}</div>
                </div>
                <div>
                  <strong className="text-emerald-300">Uwaga:</strong>
                  <div className="mt-1 text-amber-200">{tense2.content.confusionWarnings.split("\n").slice(0, 2).join("\n")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Dialog section */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Dialog kontrastowy (AI)</h2>
          <button
            className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
            onClick={handleGenerateAIDialog}
            disabled={aiDialogLoading}
          >
            {aiDialogLoading ? "Generuję…" : "Wygeneruj dialog AI (zapis do cache)"}
          </button>
        </div>

        {aiError && (
          <div className="mt-3 rounded-xl border-2 border-rose-400/30 bg-rose-400/10 p-3 text-rose-100 text-sm">
            {aiError}
          </div>
        )}
        {aiDialog && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
              {aiDialog.split("\n").map((line, index) => {
                // Highlight bold text (verb forms)
                const highlighted = line.replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-emerald-300">$1</span>');
                return (
                  <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
                );
              })}
            </div>
          </div>
        )}

        {!aiDialog && !aiError && (
          <div className="text-white/60 text-sm">
            Kliknij przycisk powyżej, aby wygenerować dialog kontrastowy pokazujący różnice między tymi czasami.
            Dialog będzie zapisany w cache i dostępny przy następnych odwiedzinach.
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/app/grammar/${tense1.slug}`}
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
          >
            Pełna teoria: {tense1.title} →
          </Link>
          <Link
            href={`/app/grammar/${tense2.slug}`}
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
          >
            Pełna teoria: {tense2.title} →
          </Link>
        </div>
      </section>
    </main>
  );
}
