"use client";

import Link from "next/link";

export type ArticleDto = {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  published_at: string | null;
  levels: string[];
};

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B1: "bg-sky-50 text-sky-700 border-sky-200",
  C1: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ArticleCard({ article }: { article: ArticleDto }) {
  return (
    <Link href={`/app/vocab/articles/${article.slug}`} className="group block">
      <article className="tile-frame flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-220">
        {article.cover_image_url ? (
          <div className="aspect-[16/7] w-full overflow-hidden rounded-t-[calc(1rem-1px)]">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="aspect-[16/7] w-full rounded-t-[calc(1rem-1px)] bg-gradient-to-br from-slate-100 to-slate-200/60" />
        )}

        <div className="tile-core flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {article.category}
            </span>
          </div>

          <h2 className="text-lg font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-slate-700">
            {article.title}
          </h2>

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              {article.levels.map((lvl) => (
                <span
                  key={lvl}
                  className={`inline-block rounded border px-2 py-0.5 text-[11px] font-bold tracking-wide ${LEVEL_COLORS[lvl] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
                >
                  {lvl}
                </span>
              ))}
            </div>
            {article.published_at && (
              <span className="text-[11px] text-slate-400">{formatDate(article.published_at)}</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function ArticlesClient({
  articles,
  isAdmin,
}: {
  articles: ArticleDto[];
  isAdmin: boolean;
}) {
  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="mb-1">
              <Link
                href="/app/vocab"
                className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
              >
                ← Słownictwo
              </Link>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Artykuły</h1>
            <p className="text-base font-medium text-slate-600">
              Teksty do czytania i dyskusji — dostępne na trzech poziomach językowych.
            </p>
          </div>
        </div>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-10 text-center">
          <p className="text-sm text-slate-400">
            {isAdmin ? "Brak artykułów. Dodaj pierwszy artykuł do bazy danych." : "Brak dostępnych artykułów."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  );
}
