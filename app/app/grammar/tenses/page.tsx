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
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Czasy</h1>
            <p className="text-base text-emerald-100/80">
              Teoria czasów gramatycznych, przykłady, porównania.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/grammar"
            >
              ← Gramatyka
            </a>
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app"
            >
              ← Panel ucznia
            </a>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Spis treści</h2>
          <p className="text-sm text-white/75 mb-6">
            Wybierz czas gramatyczny, aby zobaczyć teorię, przykłady i ćwiczenia.
          </p>
        </div>

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
      </section>
    </main>
  );
}
