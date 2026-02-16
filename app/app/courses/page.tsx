"use client";

export default function CoursesHubPage() {
  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Kursy</h1>
            <p className="text-base text-slate-600">Materiały wideo i kursy tematyczne.</p>
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
        <div className="tile-frame">
          <div className="tile-core aspect-[2/1] p-5 text-slate-700">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="text-3xl font-semibold tracking-tight text-slate-900">Materiały wideo</div>
              <div className="text-base text-slate-600">Wkrótce</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
