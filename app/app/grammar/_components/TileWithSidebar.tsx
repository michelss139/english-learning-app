"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/app/_components/BackButton";

export type SidebarItem<T = string> = {
  id: T;
  title: string;
  description?: string;
  href?: string;
};

type TileWithSidebarProps<T extends string> = {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  items: SidebarItem<T>[];
  renderContent: (item: SidebarItem<T>) => React.ReactNode;
  defaultItemId?: T;
  /** Optional slot rendered inside the page header next to the title (e.g. toggles). */
  headerAccessory?: React.ReactNode;
  /** Optional slot rendered as a fixed top bar inside the main tile (e.g. practice button). */
  tileHeader?: React.ReactNode;
  /** Optional label rendered above the sidebar list. */
  asideLabel?: string;
  /** Active-item gradient pill (defaults to grammar green). */
  accentGradient?: string;
};

const FADE_DURATION = 180;

export function TileWithSidebar<T extends string>({
  title,
  description,
  backHref,
  items,
  renderContent,
  defaultItemId,
  headerAccessory,
  tileHeader,
  asideLabel,
  accentGradient = "from-emerald-400 to-teal-600",
}: TileWithSidebarProps<T>) {
  const defaultId = defaultItemId ?? (items[0]?.id as T);
  const [activeId, setActiveId] = useState<T>(defaultId);
  const [renderedId, setRenderedId] = useState<T>(defaultId);
  const [isVisible, setIsVisible] = useState(true);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  const renderedItem = items.find((i) => i.id === renderedId) ?? items[0];

  const changeItem = (nextId: T) => {
    if (nextId === activeId) return;
    if (transitionRef.current) clearTimeout(transitionRef.current);

    setActiveId(nextId);
    setIsVisible(false);
    transitionRef.current = setTimeout(() => {
      setRenderedId(nextId);
      requestAnimationFrame(() => setIsVisible(true));
    }, FADE_DURATION);
  };

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm text-slate-600">{description}</p>
          )}
          {headerAccessory && <div className="pt-1">{headerAccessory}</div>}
        </div>
        <BackButton href={backHref} />
      </header>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2.4fr_1fr] lg:gap-5">
        {/* Main tile — stała wysokość, scroll wewnątrz, przycisk przypięty w rogu */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6 lg:h-[560px]">
          {tileHeader && (
            <div className="absolute right-5 top-5 z-10 md:right-6 md:top-6">{tileHeader}</div>
          )}
          <div
            className={`min-h-0 flex-1 overflow-y-auto pr-1 transition-all duration-200 ${
              isVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
            }`}
          >
            {renderContent(renderedItem)}
          </div>
        </div>

        {/* Sidebar — ta sama wysokość, scroll wewnątrz, aktywna pozycja = gradient pill */}
        <aside className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:h-[560px] lg:sticky lg:top-28">
          <div className="mb-2 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {asideLabel ?? "Tematy"}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeItem(item.id as T)}
                  data-active={isActive ? "true" : "false"}
                  className={`relative w-full overflow-hidden rounded-lg px-3.5 py-2 text-left text-sm transition-all duration-150 ${
                    isActive
                      ? `bg-gradient-to-br ${accentGradient} ring-1 ring-inset ring-white/20`
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {isActive ? (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                  ) : null}
                  <span className="relative font-semibold" style={isActive ? { color: "#fff" } : undefined}>
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}
