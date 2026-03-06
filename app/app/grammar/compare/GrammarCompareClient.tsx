"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { getComparison, getComparisonCacheKey } from "@/lib/grammar/compare";
import Link from "next/link";
import type { GrammarTenseSlug } from "@/lib/grammar/types";

function ContentTile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tile-frame">
      <div className="tile-core p-4">
        <h3 className="mb-2 text-sm font-medium text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function GrammarCompareClient() {
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
        const prof = await getOrCreateProfile();
        setProfile(prof);
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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
        <header className="px-1 py-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Porównywarka czasów</h1>
              <p className="text-base text-slate-600">Brak parametrów porównania</p>
            </div>
            <Link className="tile-frame" href="/app/grammar">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Spis treści
              </span>
            </Link>
          </div>
        </header>
        <section className="tile-frame">
          <div className="tile-core p-5">
            <p className="text-slate-700">Wybierz czasy do porównania z kart czasów gramatycznych.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!comparison) {
    return (
      <main className="space-y-6">
        <header className="px-1 py-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Porównywarka czasów</h1>
              <p className="text-base text-slate-600">Nie znaleziono porównania</p>
            </div>
            <Link className="tile-frame" href="/app/grammar">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Spis treści
              </span>
            </Link>
          </div>
        </header>
        <section className="tile-frame">
          <div className="tile-core p-5">
            <p className="text-slate-700">
              Porównanie między &quot;{tense1Slug}&quot; a &quot;{tense2Slug}&quot; nie jest dostępne.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const { tense1, tense2, title, description } = comparison;
  const chips1 = tense1.content.chips ?? [];
  const chips2 = tense2.content.chips ?? [];
  const example1 = tense1.content.examples.split("\n").filter((l) => l.trim())[0] ?? "";
  const example2 = tense2.content.examples.split("\n").filter((l) => l.trim())[0] ?? "";

  const theoryLink1 = tense1.theoryLink ?? `/app/grammar/${tense1.slug}`;
  const theoryLink2 = tense2.theoryLink ?? `/app/grammar/${tense2.slug}`;
  const backHref =
    tense1Slug === "zero-conditional" && tense2Slug === "first-conditional"
      ? "/app/grammar/conditionals"
      : "/app/grammar";

  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="text-base text-slate-600">{description}</p>}
          </div>
          <Link className="tile-frame" href={backHref}>
            <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
              ← Spis treści
            </span>
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      ) : null}

      {/* Side-by-side comparison */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tense 1 */}
        <div className="tile-frame">
          <div className="tile-core p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{tense1.title}</h2>
              <Link
                href={theoryLink1}
                className="text-sm text-slate-600 underline hover:text-slate-900"
              >
                Zobacz pełną teorię →
              </Link>
            </div>

            <div className="space-y-4">
              <ContentTile title="Po co używamy">
                <div className="whitespace-pre-line text-sm text-slate-700">
                  {tense1.content.usage.split("\n").slice(0, 3).join("\n")}...
                </div>
              </ContentTile>

              {chips1.length > 0 && (
                <ContentTile title="Charakterystyczne słowa">
                  <div className="flex flex-wrap gap-2">
                    {chips1.slice(0, 5).map((chip, index) => (
                      <span
                        key={index}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        title={chip.description}
                      >
                        {chip.text}
                      </span>
                    ))}
                  </div>
                </ContentTile>
              )}

              <ContentTile title="Struktura">
                <div className="whitespace-pre-line font-mono text-xs text-slate-800">
                  {tense1.content.structure.affirmative.split("\n").slice(0, 2).join("\n")}
                </div>
              </ContentTile>

              <ContentTile title="Przykład">
                <div className="text-sm text-slate-800">{example1}</div>
              </ContentTile>
            </div>
          </div>
        </div>

        {/* Tense 2 */}
        <div className="tile-frame">
          <div className="tile-core p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{tense2.title}</h2>
              <Link
                href={theoryLink2}
                className="text-sm text-slate-600 underline hover:text-slate-900"
              >
                Zobacz pełną teorię →
              </Link>
            </div>

            <div className="space-y-4">
              <ContentTile title="Po co używamy">
                <div className="whitespace-pre-line text-sm text-slate-700">
                  {tense2.content.usage.split("\n").slice(0, 3).join("\n")}...
                </div>
              </ContentTile>

              {chips2.length > 0 && (
                <ContentTile title="Charakterystyczne słowa">
                  <div className="flex flex-wrap gap-2">
                    {chips2.slice(0, 5).map((chip, index) => (
                      <span
                        key={index}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        title={chip.description}
                      >
                        {chip.text}
                      </span>
                    ))}
                  </div>
                </ContentTile>
              )}

              <ContentTile title="Struktura">
                <div className="whitespace-pre-line font-mono text-xs text-slate-800">
                  {tense2.content.structure.affirmative.split("\n").slice(0, 2).join("\n")}
                </div>
              </ContentTile>

              <ContentTile title="Przykład">
                <div className="text-sm text-slate-800">{example2}</div>
              </ContentTile>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed comparison section */}
      <section className="tile-frame">
        <div className="tile-core p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Różnice i podobieństwa</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-slate-900">{tense1.title}</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Intencja</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {(tense1.content.intention ?? tense1.content.usage).split("\n").slice(0, 2).join("\n")}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Uwaga</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-amber-900">
                    {tense1.content.confusionWarnings.split("\n").slice(0, 2).join("\n")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-slate-900">{tense2.title}</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Intencja</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {(tense2.content.intention ?? tense2.content.usage).split("\n").slice(0, 2).join("\n")}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Uwaga</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-amber-900">
                    {tense2.content.confusionWarnings.split("\n").slice(0, 2).join("\n")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Dialog section */}
      <section className="tile-frame">
        <div className="tile-core p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Dialog kontrastowy (AI)</h2>
            <button
              className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              onClick={handleGenerateAIDialog}
              disabled={aiDialogLoading}
            >
              {aiDialogLoading ? "Generuję…" : "Wygeneruj dialog AI (zapis do cache)"}
            </button>
          </div>

          {aiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {aiError}
            </div>
          )}
          {aiDialog && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-1 font-mono text-sm text-slate-800">
                {aiDialog.split("\n").map((line, index) => {
                  const highlighted = line.replace(
                    /\*\*(.+?)\*\*/g,
                    '<span class="font-semibold text-slate-900">$1</span>'
                  );
                  return (
                    <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
                  );
                })}
              </div>
            </div>
          )}

          {!aiDialog && !aiError && (
            <p className="text-sm text-slate-600">
              Kliknij przycisk powyżej, aby wygenerować dialog kontrastowy pokazujący różnice między
              tymi czasami. Dialog będzie zapisany w cache i dostępny przy następnych odwiedzinach.
            </p>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="tile-frame">
        <div className="tile-core p-5">
          <div className="flex flex-wrap gap-3">
            <Link
              href={theoryLink1}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Pełna teoria: {tense1.title} →
            </Link>
            <Link
              href={theoryLink2}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Pełna teoria: {tense2.title} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
