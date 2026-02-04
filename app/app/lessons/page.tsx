"use client";

import { useRouter } from "next/navigation";

export default function LessonsPlaceholderPage() {
  const router = useRouter();

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Moje lekcje</h1>
            <p className="text-sm text-emerald-100/70">Moduł w przygotowaniu.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
          >
            ← Wróć do strony głównej
          </button>
        </div>
      </header>

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6">
        <div className="text-white">Wkrótce.</div>
      </section>
    </main>
  );
}
