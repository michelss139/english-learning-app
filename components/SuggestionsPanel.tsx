"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Suggestion = {
  unitType: string;
  unitId: string;
  accuracy: number;
  form?: "past_simple" | "past_participle";
  label?: string;
};

function formatNonIrregularTitle(s: Suggestion): string {
  if (s.unitType === "cluster") return s.unitId.replace(/-/g, " / ");
  if (s.unitType === "grammar") {
    return s.unitId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s.unitId;
}

function buildIrregularTargetLink(items: Suggestion[]): string {
  const targetItems = items
    .filter(
      (item): item is Suggestion & { form: "past_simple" | "past_participle" } =>
        item.unitType === "irregular" &&
        (item.form === "past_simple" || item.form === "past_participle"),
    )
    .slice(0, 5);

  if (targetItems.length === 0) {
    return "/app/irregular-verbs/train";
  }

  const targets = targetItems.map((item) => `${item.unitId}:${item.form}`).join(",");
  return `/app/irregular-verbs/train?mode=targeted&targets=${encodeURIComponent(targets)}`;
}

function formatIrregularItemLabel(s: Suggestion): string {
  const label = s.label ?? s.unitId;
  const formLabel =
    s.form === "past_simple" ? "past simple" : s.form === "past_participle" ? "past participle" : "";
  return formLabel ? `${label} (${formLabel})` : label;
}

type DisplayRow =
  | { type: "irregular"; count: number; href: string; items: Suggestion[] }
  | { type: "other"; suggestion: Suggestion; href: string };

function buildDisplayRows(items: Suggestion[]): DisplayRow[] {
  const irregularItems = items
    .filter(
      (i): i is Suggestion & { form: "past_simple" | "past_participle" } =>
        i.unitType === "irregular" && (i.form === "past_simple" || i.form === "past_participle"),
    )
    .slice(0, 5);

  const irregularHref = buildIrregularTargetLink(irregularItems);
  const otherItems = items.filter((i) => i.unitType !== "irregular");

  const rows: DisplayRow[] = [];

  if (irregularItems.length > 0) {
    rows.push({
      type: "irregular",
      count: irregularItems.length,
      href: irregularHref,
      items: irregularItems,
    });
  }

  for (const s of otherItems) {
    const href =
      s.unitType === "grammar"
        ? `/app/grammar/${s.unitId}/practice`
        : s.unitType === "cluster"
          ? `/app/vocab/cluster/${s.unitId}`
          : "/";
    rows.push({ type: "other", suggestion: s, href });
  }

  return rows;
}

export function SuggestionsPanel() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const displayRows = useMemo(() => buildDisplayRows(items), [items]);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (data?.list && Array.isArray(data.list)) {
          setItems(data.list);
        } else {
          setItems([]);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Twój plan na teraz</h2>
        <div className="text-sm text-slate-500">Ładowanie…</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Twój plan na teraz</h2>
      <ul className="space-y-2">
        {displayRows.map((row, i) =>
          row.type === "irregular" ? (
            <li key="irregular-bundle">
              <Link
                href={row.href}
                className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50 hover:border-slate-300"
              >
                <div className="font-medium">Nieregularne czasowniki ({row.count})</div>
                <ul className="mt-1.5 space-y-0.5 pl-4 text-xs text-slate-600">
                  {row.items.map((s, j) => (
                    <li key={`${s.unitId}:${s.form}:${j}`}>• {formatIrregularItemLabel(s)}</li>
                  ))}
                </ul>
              </Link>
            </li>
          ) : (
            <li key={`${row.suggestion.unitType}:${row.suggestion.unitId}:${i}`}>
              <Link
                href={row.href}
                className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50 hover:border-slate-300"
              >
                {formatNonIrregularTitle(row.suggestion)}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
