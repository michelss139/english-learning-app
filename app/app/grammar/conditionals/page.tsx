import Link from "next/link";

const topics = [
  {
    title: "Zero Conditional",
    description: "Fakty i zasady, które są zawsze prawdziwe.",
    href: "/app/grammar/conditionals/zero",
  },
  {
    title: "First Conditional",
    description: "Realne sytuacje przyszłe i ich rezultat.",
    href: "/app/grammar/conditionals/first",
  },
  {
    title: "Second Conditional",
    description: "Hipotetyczne sytuacje i wyobrażone skutki.",
    href: "/app/grammar/conditionals/second",
  },
  {
    title: "Third Conditional",
    description: "Przeszłe sytuacje, które mogły wydarzyć się inaczej.",
    href: "/app/grammar/conditionals/third",
  },
  {
    title: "Mixed Conditionals",
    description: "Połączenia różnych typów zdań warunkowych.",
    href: "/app/grammar/conditionals/mixed",
  },
];

export default async function ConditionalsPage() {
  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Conditionals</h1>
            <p className="max-w-3xl text-base text-slate-600">
              Zdania warunkowe opisują sytuacje, w których jedno zdarzenie zależy od innego.
              Pierwsza część zdania wprowadza warunek, a druga pokazuje rezultat.
            </p>
          </div>

          <Link className="tile-frame" href="/app/grammar">
            <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
              ← Wróć do gramatyki
            </span>
          </Link>
        </div>
      </header>

      <section className="tile-frame">
        <div className="tile-core p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Wybierz temat</h2>
          <p className="mt-1 text-sm text-slate-600">Rozpocznij od Zero Conditional, a potem przejdź dalej.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link key={topic.title} href={topic.href} className="tile-frame group">
              <div className="tile-core p-4">
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-slate-900">{topic.title}</div>
                  <div className="text-sm text-slate-600">{topic.description}</div>
                  <div className="pt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition group-hover:text-slate-900">
                    Otwórz <span className="translate-x-0 transition group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        </div>
      </section>
    </main>
  );
}
