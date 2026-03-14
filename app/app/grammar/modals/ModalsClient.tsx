"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../_components/TileWithSidebar";

const topics: SidebarItem<string>[] = [
  { id: "ability", title: "Ability", description: "Can, could i be able to – umiejętności i możliwości.", href: "/app/grammar/modals/ability" },
];

export function ModalsClient() {
  return (
    <TileWithSidebar
      title="Modal Verbs"
      description="Czasowniki modalne wyrażają możliwość, konieczność, pozwolenie lub zdolność. Używamy ich z bezokolicznikiem, aby zmodyfikować znaczenie głównego czasownika."
      backHref="/app/grammar"
      backLabel="← Wróć do gramatyki"
      items={topics}
      renderContent={(item) => (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h2>
            {item.description && <p className="text-slate-700">{item.description}</p>}
          </div>
          {item.href && (
            <Link
              href={item.href}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Otwórz pełną teorię <span className="translate-x-0 transition group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </div>
      )}
    />
  );
}
