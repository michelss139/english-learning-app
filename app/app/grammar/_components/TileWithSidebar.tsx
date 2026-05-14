"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  /** Optional slot rendered inside the header next to the title (e.g. toggles). */
  headerAccessory?: React.ReactNode;
  /** Optional label rendered above the sidebar list. */
  asideLabel?: string;
};

const FADE_DURATION = 180;

export function TileWithSidebar<T extends string>({
  title,
  description,
  backHref,
  backLabel,
  items,
  renderContent,
  defaultItemId,
  headerAccessory,
  asideLabel,
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
        <Link
          href={backHref}
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          {backLabel}
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr] lg:gap-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div
            className={`transition-opacity duration-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {renderContent(renderedItem)}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {asideLabel ?? "Tematy"}
          </div>
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeItem(item.id as T)}
                  data-active={isActive ? "true" : "false"}
                  className={`grammar-aside-item w-full px-3.5 py-2 text-left text-sm ${
                    isActive
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}
