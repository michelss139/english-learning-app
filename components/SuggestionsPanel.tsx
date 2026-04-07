"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { appendSuggestionContext } from "@/lib/suggestions/suggestionContext";

type Suggestion = {
  unitType: string;
  unitId: string;
  accuracy: number;
  form?: "past_simple" | "past_participle";
  label?: string;
  href?: string;
  displayName?: string;
  description?: string;
};

/** Subtitle for aggregated sense card (Polish plural rules). */
function senseReviewSubtitle(distinctCount: number): string {
  const n = distinctCount;
  if (n === 1) return "1 słowo wymaga powtórki";
  const n100 = n % 100;
  const n10 = n % 10;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) {
    return `${n} słowa wymagają powtórki`;
  }
  return `${n} słów wymaga powtórki`;
}

/** One dashboard row for multiple sense suggestions (same title was duplicated before). */
function prepareItemsForDisplay(items: Suggestion[]): Suggestion[] {
  const senseItems = items.filter((i) => i.unitType === "sense");
  const otherItems = items.filter((i) => i.unitType !== "sense");
  if (senseItems.length === 0) return items;

  const uniqueIds = [...new Set(senseItems.map((i) => i.unitId))];
  const distinctCount = uniqueIds.length;
  const idsForHref = uniqueIds.slice(0, 8);
  const href = appendSuggestionContext(
    `/app/vocab/practice?senseIds=${encodeURIComponent(idsForHref.join(","))}&autostart=1`,
  );

  const aggregated: Suggestion = {
    unitType: "sense",
    unitId: "sense-aggregated",
    accuracy: 0,
    href,
    displayName: "Słowa do powtórki",
    description: senseReviewSubtitle(distinctCount),
  };

  return [aggregated, ...otherItems];
}

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
    return appendSuggestionContext("/app/irregular-verbs/train");
  }

  const targets = targetItems.map((item) => `${item.unitId}:${item.form}`).join(",");
  return appendSuggestionContext(
    `/app/irregular-verbs/train?mode=targeted&targets=${encodeURIComponent(targets)}`,
  );
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
  const otherItems = items.filter((i) => {
    if (i.unitType !== "irregular") return true;
    return i.form !== "past_simple" && i.form !== "past_participle";
  });

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
      s.href ??
      (s.unitType === "grammar"
        ? appendSuggestionContext(`/app/grammar/${s.unitId}/practice`)
        : s.unitType === "cluster"
          ? appendSuggestionContext(`/app/vocab/cluster/${s.unitId}?autostart=1`)
          : s.unitType === "sense"
            ? appendSuggestionContext(
                `/app/vocab/practice?senseIds=${encodeURIComponent(s.unitId)}&autostart=1`,
              )
            : appendSuggestionContext("/app"));
    rows.push({ type: "other", suggestion: s, href });
  }

  return rows;
}

export function SuggestionsPanel() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const displayRows = useMemo(() => buildDisplayRows(prepareItemsForDisplay(items)), [items]);

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
                {(() => {
                  const title =
                    row.suggestion.displayName?.trim() || formatNonIrregularTitle(row.suggestion);
                  const sub = row.suggestion.description?.trim();
                  return sub ? (
                    <>
                      <div className="font-medium">{title}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{sub}</div>
                    </>
                  ) : (
                    title
                  );
                })()}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
