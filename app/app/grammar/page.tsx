"use client";

import Link from "next/link";
import { useState } from "react";

type TileId = "irregular" | "tenses" | "stative" | "conditionals" | "modal";

type Tile = {
  id: TileId;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
};

const TILES: Tile[] = [
  {
    id: "irregular",
    eyebrow: "Trening",
    title: "Czasowniki nieregularne",
    description: "Past simple i past participle — trenuj formy i wzorce użycia.",
    href: "/app/irregular-verbs",
  },
  {
    id: "tenses",
    eyebrow: "Teoria",
    title: "Czasy",
    description: "Teoria i schemat każdego czasu: present, past, future.",
    href: "/app/grammar/tenses",
  },
  {
    id: "stative",
    eyebrow: "Pułapka",
    title: "Czasowniki statyczne",
    description: "Kiedy NIE używać formy -ing — stany kontra czynności.",
    href: "/app/grammar/stative-verbs",
  },
  {
    id: "conditionals",
    eyebrow: "Teoria",
    title: "Conditionals",
    description: "Zdania warunkowe: Zero, First, Second, Third oraz Mixed.",
    href: "/app/grammar/conditionals",
  },
  {
    id: "modal",
    eyebrow: "Teoria",
    title: "Modal Verbs",
    description: "Can, could, must, should — modalność według funkcji i słowa.",
    href: "/app/grammar/modal-verbs",
  },
];

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GrammarHubPage() {
  const [hovered, setHovered] = useState<TileId | null>(null);

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Gramatyka
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Od czego chcesz zacząć?
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Panel ucznia
        </Link>
      </header>

      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5"
        onMouseLeave={() => setHovered(null)}
      >
        {TILES.map((tile) => {
          const isActive = hovered === tile.id;
          return (
            <div
              key={tile.id}
              onMouseEnter={() => setHovered(tile.id)}
              className={`rounded-[18px] bg-gradient-to-br from-emerald-400 to-teal-700 p-[2px] transition-[box-shadow,transform] duration-200 ease-out ${
                isActive ? "-translate-y-px shadow-[0_6px_24px_rgba(15,23,42,0.10)]" : "shadow-none"
              }`}
            >
            <Link
              href={tile.href}
              className={`group relative flex h-full flex-col justify-between gap-5 rounded-2xl p-5 transition-[background-color] duration-200 ease-out ${
                isActive ? "bg-white" : "bg-slate-50"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {tile.eyebrow}
                  </span>
                  <ChevronRight
                    className={`text-slate-300 transition-[color,transform] duration-200 ease-out ${
                      isActive ? "translate-x-1 text-slate-700" : ""
                    }`}
                  />
                </div>
                <div className="relative inline-block overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 px-3.5 py-2 ring-1 ring-inset ring-white/20">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                  <h2 className="relative text-xl font-black tracking-tight drop-shadow-sm" style={{ color: "#fff" }}>
                    {tile.title}
                  </h2>
                </div>
                <p className="text-sm leading-snug text-slate-600">
                  {tile.description}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 transition-colors duration-200 group-hover:text-slate-900">
                Otwórz →
              </span>
            </Link>
            </div>
          );
        })}
      </section>
    </main>
  );
}
