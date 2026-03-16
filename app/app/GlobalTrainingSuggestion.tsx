"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeTrainingCompleted } from "@/lib/events/trainingEvents";

type Recommendation = {
  type: string;
  unitId: string;
  priority: number;
  href: string;
};

type TrainingOption = {
  title: string;
  description: string;
  href: string;
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

function getLabelForType(type: string): string {
  switch (type) {
    case "cluster":
      return "Typowe błędy";
    case "irregular":
      return "Nieregularne czasowniki";
    case "sense":
      return "Powtórz słówka";
    default:
      return "Trening";
  }
}

function getDescriptionForType(type: string): string {
  switch (type) {
    case "cluster":
      return "Najczęstsze pułapki językowe.";
    case "irregular":
      return "Formy czasowników nieregularnych.";
    case "sense":
      return "Słówka z puli.";
    default:
      return "Szybka sesja na rozgrzewkę.";
  }
}

export default function GlobalTrainingSuggestion() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/app/recommendations");
      const json = (await res.json().catch(() => null)) as { recommendations?: Recommendation[] } | null;
      if (res.ok && json?.recommendations && Array.isArray(json.recommendations)) {
        setRecommendations(json.recommendations.slice(0, 2));
      } else {
        setRecommendations([]);
      }
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecommendations();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTrainingCompleted(() => {
      void fetchRecommendations();
    });
    return unsubscribe;
  }, []);

  const useFallback = recommendations !== null && recommendations.length === 0;
  const rawOptions: TrainingOption[] = useFallback
    ? FALLBACK_OPTIONS
    : (recommendations ?? []).map((r) => ({
        title: getLabelForType(r.type),
        description: getDescriptionForType(r.type),
        href: r.href,
      }));

  const seenOptionKeys = new Set<string>();
  const options = rawOptions.filter((item) => {
    const optionKey = `${item.title}-${item.href}`;
    if (seenOptionKeys.has(optionKey)) return false;
    seenOptionKeys.add(optionKey);
    return true;
  });

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
          options.map((item) => (
            <div key={item.href} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
              <div className="text-sm font-semibold leading-tight text-slate-900">{item.title}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-600">{item.description}</div>
              <button
                type="button"
                onClick={() => router.push(item.href)}
                className="mt-2 inline-flex rounded-xl border border-slate-900 bg-white px-3 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Start
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

