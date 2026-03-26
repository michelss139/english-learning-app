"use client";

import LessonCalendar from "@/components/lessons/LessonCalendar";

export default function LessonsHubPage() {
  return (
    <main className="flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] flex-col gap-3 min-h-0 w-full">
      <header className="shrink-0 px-0.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lekcje</h1>
            <p className="text-sm text-slate-600">Kalendarz zajęć tutoringowych.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="tile-frame" href="/app/lessons/list">
              <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-1.5 text-sm font-medium text-slate-700">
                Lista lekcji
              </span>
            </a>
            <a className="tile-frame" href="/app">
              <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-1.5 text-sm font-medium text-slate-700">
                ← Panel ucznia
              </span>
            </a>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <LessonCalendar />
      </div>
    </main>
  );
}
