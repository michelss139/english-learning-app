import { getAllGrammarTenses } from "@/lib/grammar/content";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GrammarTensesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenses = getAllGrammarTenses();

  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Czasy</h1>
            <p className="text-base text-slate-600">
              Teoria czasów gramatycznych, przykłady, porównania.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="tile-frame"
              href="/app/grammar"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Gramatyka
              </span>
            </a>
            <a
              className="tile-frame"
              href="/app"
            >
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Panel ucznia
              </span>
            </a>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Spis treści</h2>
            <Link
              href="/app/story-generator"
              className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              AI Story Generator
            </Link>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Wybierz czas gramatyczny, aby zobaczyć teorię, przykłady i ćwiczenia.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Czasy gramatyczne</h3>
          {tenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Treści będą dostępne wkrótce. Moduł jest w trakcie przygotowania.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tenses.map((tense) => (
                <Link
                  key={tense.slug}
                  href={`/app/grammar/${tense.slug}`}
                  className="tile-frame group"
                >
                  <div className="tile-core p-4">
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-slate-900 transition">
                        {tense.title}
                      </div>
                      {tense.description && (
                        <div className="text-sm text-slate-600">{tense.description}</div>
                      )}
                      <div className="pt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition group-hover:text-slate-900">
                        Czytaj <span className="translate-x-0 transition group-hover:translate-x-0.5">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
