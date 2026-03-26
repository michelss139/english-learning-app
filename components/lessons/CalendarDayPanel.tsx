"use client";

import Link from "next/link";
import { useEffect } from "react";

const MONTHS_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

export type DayPanelLesson = {
  id: string;
  topic: string;
  student_display: string;
};

type CalendarDayPanelProps = {
  open: boolean;
  dateIso: string;
  lessons: DayPanelLesson[];
  showAddButton: boolean;
  onClose: () => void;
  onAddLesson: (dateIso: string) => void;
};

function formatPanelHeader(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso.trim())) return dateIso;
  const [y, m, d] = dateIso.trim().split("-").map((x) => parseInt(x, 10));
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}

export default function CalendarDayPanel({
  open,
  dateIso,
  lessons,
  showAddButton,
  onClose,
  onAddLesson,
}: CalendarDayPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const header = formatPanelHeader(dateIso);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true"
      aria-labelledby="calendar-day-panel-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(85dvh,32rem)] w-full max-w-md flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:shadow-xl"
      >
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <h2 id="calendar-day-panel-title" className="text-base font-semibold tracking-tight text-slate-900">
            {header}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {lessons.length > 0 && showAddButton ? (
            <div className="mb-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onAddLesson(dateIso);
                  onClose();
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
              >
                + Dodaj lekcję
              </button>
            </div>
          ) : null}

          {lessons.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">Brak lekcji tego dnia</p>
              {showAddButton ? (
                <button
                  type="button"
                  onClick={() => {
                    onAddLesson(dateIso);
                    onClose();
                  }}
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  + Dodaj pierwszą lekcję
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1 pb-2" role="list">
              {lessons.map((l) => {
                const topic = (l.topic ?? "").trim();
                return (
                  <li key={l.id}>
                    <Link
                      href={`/app/lessons/${l.id}`}
                      onClick={onClose}
                      className="block rounded-xl border border-slate-100 bg-white px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">{l.student_display}</p>
                      {topic ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{topic}</p>
                      ) : (
                        <p className="mt-0.5 text-xs italic text-slate-400">Bez tematu</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
