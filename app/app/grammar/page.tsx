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
    eyebrow: "Reference",
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
    eyebrow: "Reference",
    title: "Conditionals",
    description: "Zdania warunkowe: Zero, First, Second, Third oraz Mixed.",
    href: "/app/grammar/conditionals",
  },
  {
    id: "modal",
    eyebrow: "Reference",
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
            <Link
              key={tile.id}
              href={tile.href}
              onMouseEnter={() => setHovered(tile.id)}
              className={`group relative flex h-full flex-col justify-between gap-5 rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out ${
                isActive
                  ? "-translate-y-px border-slate-800/35 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.07)]"
                  : "border-slate-800/20 bg-slate-50/90 shadow-none"
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
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {tile.title}
                </h2>
                <p className="text-sm leading-snug text-slate-600">
                  {tile.description}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 transition-colors duration-200 group-hover:text-slate-900">
                Otwórz →
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
