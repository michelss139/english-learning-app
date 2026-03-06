import Link from "next/link";

export default async function SecondConditionalPage() {
  return (
    <main className="space-y-6">
      <header className="rounded-2xl border border-slate-900 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Second Conditional</h1>
        <p className="mt-2 text-sm text-slate-700">Temat w przygotowaniu.</p>
        <Link
          href="/app/grammar/conditionals"
          className="mt-4 inline-flex rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do Conditionals
        </Link>
      </header>
    </main>
  );
}
