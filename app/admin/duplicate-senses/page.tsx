"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { DuplicateSenseGroup } from "@/lib/lexicon/duplicateSenseDetection";

export default function AdminDuplicateSensesPage() {
  const [rows, setRows] = useState<DuplicateSenseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) {
          setError("Brak sesji.");
          return;
        }
        const res = await fetch("/api/admin/duplicate-senses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as DuplicateSenseGroup[];
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Błąd");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-6 text-neutral-900 [color-scheme:light]">
        <p className="text-sm text-neutral-600">Ładuję…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-6 text-neutral-900 [color-scheme:light]">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Duplikaty sensów (lexicon)</h1>
            <p className="text-sm text-neutral-600">
              Grupy z tym samym lematem i tłumaczeniem PL, ≥2 sensy. Tylko podgląd — bez akcji.
            </p>
          </div>
          <Link href="/admin" className="text-sm text-neutral-700 underline">
            ← Admin
          </Link>
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {!error && rows.length === 0 ? (
          <p className="text-sm text-neutral-600">Brak grup do wyświetlenia.</p>
        ) : null}

        <ul className="space-y-8">
          {rows.map((g) => (
            <li key={`${g.entry_id}-${g.translation_pl}`} className="border-b border-neutral-200 pb-8 last:border-0">
              <div className="mb-3 space-y-1">
                <div className="text-lg font-semibold text-neutral-900">{g.lemma}</div>
                <div className="text-neutral-800">{g.translation_pl}</div>
                {g.likely_duplicate ? (
                  <span className="inline-block text-xs text-amber-800">likely duplicate</span>
                ) : null}
              </div>
              <ul className="space-y-3 pl-0">
                {g.senses.map((s) => (
                  <li key={s.sense_id} className="flex gap-3 text-sm">
                    <input type="checkbox" disabled className="mt-1 h-4 w-4 shrink-0 cursor-not-allowed" title="(na razie bez akcji)" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="break-all font-mono text-xs text-neutral-500">{s.sense_id}</div>
                      <p className="whitespace-pre-wrap text-neutral-800">{s.definition_en || "—"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
