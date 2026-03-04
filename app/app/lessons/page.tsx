"use client";

import LessonCalendar from "@/components/lessons/LessonCalendar";

export default function LessonsHubPage() {
  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Lekcje</h1>
            <p className="text-base text-slate-600">Kalendarz zajęć tutoringowych.</p>
          </div>
          <div className="flex gap-2">
            <a className="tile-frame" href="/app/lessons/list">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                Lista lekcji
              </span>
            </a>
            <a className="tile-frame" href="/app">
              <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                ← Panel ucznia
              </span>
            </a>
          </div>
        </div>
      </header>

      <LessonCalendar />
    </main>
  );
}
