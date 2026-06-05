"use client";

import LessonCalendar from "@/components/lessons/LessonCalendar";

export default function LessonsHubPage() {
  return (
    <main className="flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] flex-col gap-3 min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-300 shadow-[0_4px_24px_rgba(251,146,60,0.28)]">

        {/* Nagłówek na gradiencie */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-4">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#fff" }}>Kalendarz</h1>
          <a
            href="/app/lessons/list"
            className="rounded-full px-6 py-2 text-base font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid white" }}
          >
            Lista lekcji
          </a>
        </div>

        <LessonCalendar />
      </div>
    </main>
  );
}
