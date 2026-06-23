"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import PoolTrainingRunner, { type PoolTrainingCard } from "../pool/PoolTrainingRunner";

const cardBase =
  "rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm";

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
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950">
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
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      {/* Header */}
      <header className="mb-5">
        <Link
          href="/app/vocab/pool"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Moja pula
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Trening słówek</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!autostart && senseIds.length > 0 && !loading ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Trenujesz słowa wymagające powtórki
        </div>
      ) : null}

      {loading ? (
        <div className={`${cardBase} animate-pulse`}>
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-3 h-8 w-3/4 rounded bg-slate-100" />
          <div className="mt-4 h-10 rounded bg-slate-100" />
        </div>
      ) : !autostart && senseIds.length > 0 ? (
        <button
          type="button"
          onClick={() => void startTraining()}
          className="relative w-full inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-sm font-bold transition hover:brightness-110"
          style={{ color: "#fff" }}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
          <span className="relative">Rozpocznij trening →</span>
        </button>
      ) : null}
    </main>
  );
}
