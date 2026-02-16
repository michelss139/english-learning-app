"use client";

export default function VocabHubPage() {
  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Słownictwo</h1>
            <p className="text-base text-slate-600">Wybierz moduł słownictwa.</p>
          </div>
          <a
            className="tile-frame"
            href="/app"
          >
            <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
              ← Panel ucznia
            </span>
          </a>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          {
            title: "Moja pula",
            description: "Twoje słówka i treningi.",
            href: "/app/vocab/pool",
          },
          {
            title: "Fiszki",
            description: "Paczki słówek tematycznych.",
            href: "/app/vocab/packs",
          },
          {
            title: "Typowe błędy",
            description: "Clustery z najczęstszymi pułapkami.",
            href: "/app/vocab/clusters",
          },
        ].map((tile) => (
          <a
            key={tile.title}
            href={tile.href}
            className="tile-frame"
          >
            <div className="tile-core aspect-[2/1] p-5">
              <div className="flex h-full flex-col justify-between">
                <div className="text-3xl font-semibold tracking-tight text-slate-900">{tile.title}</div>
                <div className="text-base text-slate-600">{tile.description}</div>
              </div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
