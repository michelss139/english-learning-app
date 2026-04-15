"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import PoolTrainingRunner, { type PoolTrainingCard } from "../pool/PoolTrainingRunner";

function parseSenseIds(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

export default function VocabSensePracticeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const senseIdsKey = searchParams.get("senseIds") ?? "";
  const autostart = searchParams.get("autostart") === "1";

  const [session, setSession] = useState<{ sessionId: string; cards: PoolTrainingCard[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const senseIds = parseSenseIds(senseIdsKey);

  const startTraining = useCallback(async (overrideSenseIds?: string[], overrideMode?: "quick" | "errors" | "new" | "mastered") => {
    const uniq = (overrideSenseIds ?? parseSenseIds(senseIdsKey)).slice(0, 8);
    if (uniq.length === 0) {
      setError("Brak wybranych słów (parametr senseIds).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany.");
        return;
      }
      const res = await fetch("/api/vocab/training/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sense_ids: uniq, mode: overrideMode ?? "quick" }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { session_id?: string; cards?: PoolTrainingCard[]; error?: string; code?: string }
        | null;
      if (!res.ok || !payload?.session_id || !Array.isArray(payload.cards)) {
        setError(payload?.error ?? `Nie udało się rozpocząć treningu (${res.status}).`);
        return;
      }
      setSession({ sessionId: payload.session_id, cards: payload.cards });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć treningu.");
    } finally {
      setLoading(false);
    }
  }, [senseIdsKey]);

  useEffect(() => {
    if (senseIds.length === 0) {
      setError("Brak wybranych słów. Użyj linku z sugestii lub dodaj parametr senseIds w adresie URL.");
      return;
    }
    setError("");
    if (!autostart) return;
    void startTraining();
  }, [autostart, senseIdsKey, startTraining, senseIds.length]);

  if (session) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950">
          Trenujesz słowa wymagające powtórki
        </div>
        <PoolTrainingRunner
          sessionId={session.sessionId}
          cards={session.cards}
          initialOverview={null}
          onClose={() => router.push("/app/vocab/pool")}
          onFinish={() => {}}
          onStartNextSession={(nextSenseIds, mode) => void startTraining(nextSenseIds, mode)}
          isStartingNextSession={loading}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Trening słówek</h1>
          <p className="mt-1 text-sm text-slate-600">Krótka sesja z wybranymi znaczeniami z puli.</p>
        </div>
        <Link
          href="/app/vocab/pool"
          className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          ← Moja pula
        </Link>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {!autostart && senseIds.length > 0 && !loading ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Trenujesz słowa wymagające powtórki
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Przygotowuję sesję…</p>
      ) : !autostart && senseIds.length > 0 ? (
        <button
          type="button"
          onClick={() => void startTraining()}
          className="rounded-xl border border-slate-900 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          Rozpocznij trening
        </button>
      ) : null}
    </main>
  );
}
