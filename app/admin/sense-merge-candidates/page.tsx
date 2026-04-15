"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { HighConfidenceDuplicateGroup } from "@/lib/lexicon/senseMergeCandidates";

export default function AdminSenseMergeCandidatesPage() {
  const [rows, setRows] = useState<HighConfidenceDuplicateGroup[]>([]);
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
        const res = await fetch("/api/admin/sense-merge-candidates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as HighConfidenceDuplicateGroup[];
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Duplikaty sensów (wysoka pewność)</h1>
            <p className="text-sm text-neutral-600">
              To samo PL pod jednym hasłem + definicje zgodne (zawieranie lub podobieństwo Levenshtein ≥ 0,8). Tylko
              podgląd.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/duplicate-senses" className="text-neutral-700 underline">
              Duplikaty (same PL, stary)
            </Link>
            <Link href="/admin" className="text-neutral-700 underline">
              ← Admin
            </Link>
          </div>
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {!error && rows.length === 0 ? (
          <p className="text-sm text-neutral-600">Brak wykrytych duplikatów wysokiej pewności.</p>
        ) : null}

        <ul className="space-y-8">
          {rows.map((g) => (
            <li key={`${g.entry_id}-${g.translation_pl}`} className="border-b border-neutral-200 pb-8 last:border-0">
              <div className="mb-3 space-y-1">
                <div className="text-lg font-semibold">{g.lemma}</div>
                <div className="text-neutral-800">PL: {g.translation_pl}</div>
                <div className="font-mono text-xs text-neutral-500">{g.entry_id}</div>
              </div>
              <ul className="space-y-4">
                {g.senses.map((s) => (
                  <li key={s.sense_id} className="text-sm">
                    <div className="break-all font-mono text-xs text-neutral-500">{s.sense_id}</div>
                    <p className="whitespace-pre-wrap text-neutral-800">{s.definition_en || "—"}</p>
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
