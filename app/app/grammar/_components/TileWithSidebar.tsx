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

  const activeItem = items.find((i) => i.id === activeId) ?? items[0];
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
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-slate-700">{description}</p>}
        </div>
        <Link
          href={backHref}
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {backLabel}
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-4">
          <div className={`transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderContent(renderedItem)}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-900 bg-white p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.14em] text-slate-500">Tematy</div>
          <div className="mb-3 h-px w-full bg-slate-200" />
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeItem(item.id as T)}
                className={`w-full rounded-2xl border border-black/15 px-4 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:bg-black/5 ${
                  activeId === item.id
                    ? "scale-[1.01] border-l-4 border-l-black bg-black/5 font-semibold text-slate-900"
                    : "font-medium"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
