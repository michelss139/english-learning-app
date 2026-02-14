"use client";

export default function VocabHubPage() {
  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Słownictwo</h1>
            <p className="text-base text-emerald-100/80">Wybierz moduł słownictwa.</p>
          </div>
          <a
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
            href="/app"
          >
            ← Panel ucznia
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
            className="rounded-2xl border border-emerald-100/10 bg-emerald-950/40 p-5 transition hover:bg-emerald-900/40"
          >
            <div className="aspect-[2/1] flex flex-col justify-between">
              <div className="text-3xl font-semibold tracking-tight text-white">{tile.title}</div>
              <div className="text-base text-emerald-100/80">{tile.description}</div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
