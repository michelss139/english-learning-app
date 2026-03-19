"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeTrainingCompleted } from "@/lib/events/trainingEvents";

type TopSuggestion = {
  unitType: string;
  unitId: string;
  href: string;
  displayName: string;
  form?: "past_simple" | "past_participle";
  label?: string;
};

type ListSuggestion = TopSuggestion & {
  accuracy: number;
  priority: number;
};

type TrainingOption = {
  title: string;
  description: string;
  href: string;
  irregularItems?: ListSuggestion[];
};

const FALLBACK_OPTIONS: TrainingOption[] = [
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

function getDescriptionForType(type: string): string {
  switch (type) {
    case "cluster":
      return "Najczęstsze pułapki językowe.";
    case "irregular":
      return "Formy czasowników nieregularnych.";
    case "sense":
      return "Słówka z puli.";
    case "grammar":
      return "Ćwiczenie z gramatyki.";
    default:
      return "Szybka sesja na rozgrzewkę.";
  }
}

function buildIrregularTargetLink(items: ListSuggestion[]): string {
  const targetItems = items
    .filter(
      (i): i is ListSuggestion & { form: "past_simple" | "past_participle" } =>
        i.unitType === "irregular" && (i.form === "past_simple" || i.form === "past_participle"),
    )
    .slice(0, 5);

  if (targetItems.length === 0) return "/app/irregular-verbs/train";
  const targets = targetItems.map((i) => `${i.unitId}:${i.form}`).join(",");
  return `/app/irregular-verbs/train?mode=targeted&targets=${encodeURIComponent(targets)}`;
}

function formatIrregularItemLabel(s: ListSuggestion): string {
  const label = s.label ?? s.unitId;
  const formLabel =
    s.form === "past_simple" ? "past simple" : s.form === "past_participle" ? "past participle" : "";
  return formLabel ? `${label} (${formLabel})` : label;
}

function buildOptions(top: TopSuggestion[], list: ListSuggestion[]): TrainingOption[] {
  const irregularFromList = list
    .filter(
      (i): i is ListSuggestion & { form: "past_simple" | "past_participle" } =>
        i.unitType === "irregular" && (i.form === "past_simple" || i.form === "past_participle"),
    )
    .slice(0, 5);

  const hasIrregularInTop = top.some((t) => t.unitType === "irregular");
  const nonIrregularTop = top.filter((t) => t.unitType !== "irregular");

  const options: TrainingOption[] = [];

  if (hasIrregularInTop && irregularFromList.length > 0) {
    options.push({
      title: `Nieregularne czasowniki (${irregularFromList.length})`,
      description: getDescriptionForType("irregular"),
      href: buildIrregularTargetLink(irregularFromList),
      irregularItems: irregularFromList,
    });
  }

  for (const r of nonIrregularTop) {
    options.push({
      title: r.displayName,
      description: getDescriptionForType(r.unitType),
      href: r.href,
    });
  }

  return options;
}

export default function GlobalTrainingSuggestion() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [top, setTop] = useState<TopSuggestion[]>([]);
  const [list, setList] = useState<ListSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionHref, setActiveSessionHref] = useState<string | null>(null);
  const [lockedOptions, setLockedOptions] = useState<TrainingOption[] | null>(null);

  const fetchSuggestions = async (force?: boolean) => {
    if (activeSessionHref && !force) return;
    try {
      const res = await fetch("/api/suggestions");
      const json = (await res.json().catch(() => null)) as {
        top?: TopSuggestion[];
        list?: ListSuggestion[];
      } | null;
      if (res.ok && json?.top && Array.isArray(json.top)) {
        setTop(json.top.slice(0, 2));
        setList(Array.isArray(json.list) ? json.list : []);
      } else {
        setTop([]);
        setList([]);
      }
    } catch {
      setTop([]);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuggestions();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted(() => {
      setActiveSessionHref(null);
      setLockedOptions(null);
      void fetchSuggestions(true);
    });
    return unsubscribe;
  }, []);

  const useFallback = top.length === 0 && !loading;
  const rawOptions = useFallback ? FALLBACK_OPTIONS : buildOptions(top, list);

  const seenHrefs = new Set<string>();
  const computedOptions = rawOptions.filter((item) => {
    if (seenHrefs.has(item.href)) return false;
    seenHrefs.add(item.href);
    return true;
  });

  const options = lockedOptions ?? computedOptions;

  const handleStart = (item: TrainingOption) => {
    setActiveSessionHref(item.href);
    setLockedOptions(
      options.map((o) => ({
        ...o,
        irregularItems: o.irregularItems ? [...o.irregularItems] : undefined,
      })),
    );
    router.push(item.href);
  };

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
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
            <div className="text-sm text-slate-500">Ładowanie…</div>
          </div>
        ) : (
          options.map((item) => {
            const isActive = item.href === activeSessionHref;
            return (
              <div
                key={item.href}
                className={`rounded-xl border px-2.5 py-2 ${
                  isActive ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/20" : "border-slate-200 bg-white"
                }`}
              >
                <div className="text-sm font-semibold leading-tight text-slate-900">{item.title}</div>
                {item.irregularItems && item.irregularItems.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-3 text-[11px] leading-snug text-slate-600">
                    {item.irregularItems.map((s, i) => (
                      <li key={`${s.unitId}:${s.form}:${i}`}>• {formatIrregularItemLabel(s)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{item.description}</div>
                )}
                <button
                  type="button"
                  onClick={() => handleStart(item)}
                  className="mt-2 inline-flex rounded-xl border border-slate-900 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Start
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
