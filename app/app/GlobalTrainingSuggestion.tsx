"use client";

import { useState } from "react";

type TrainingOption = {
  title: string;
  description: string;
  href: string;
};

export default function GlobalTrainingSuggestion() {
  const [visible, setVisible] = useState(true);

  const options: TrainingOption[] = [
    {
      title: "Fiszki (5 pytań)",
      description: "Szybka sesja na rozgrzewkę.",
      href: "/app/vocab/pack/shop?limit=5&direction=pl-en&autostart=1",
    },
    {
      title: "Typowe błędy",
      description: "Najczęstsze pułapki językowe.",
      href: "/app/vocab/clusters",
    },
    {
      title: "Nieregularne czasowniki (min 5)",
      description: "Formy czasowników nieregularnych.",
      href: "/app/irregular-verbs/train",
    },
  ];

  if (!visible) return null;

  return (
    <aside className="fixed bottom-6 right-4 z-40 w-64 rounded-2xl border border-slate-300 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Co trenować</div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Ukryj podpowiedź treningu"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2.5">
        {options.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
            <div className="text-sm font-semibold leading-tight text-slate-900">{item.title}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{item.description}</div>
            <a
              href={item.href}
              className="mt-2 inline-flex rounded-xl border border-slate-900 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Start
            </a>
          </div>
        ))}
      </div>
    </aside>
  );
}

