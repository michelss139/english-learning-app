"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PoolOverviewItem } from "@/lib/vocab/poolOverviewUtils";
import { poolKnowledgeBadge } from "@/lib/vocab/poolKnowledgeBadge";
import PoolTrainingRunner, { type PoolTrainingCard } from "./PoolTrainingRunner";

type OverviewPayload = {
  segments: {
    review: PoolOverviewItem[];
    learning: PoolOverviewItem[];
    new: PoolOverviewItem[];
    mastered: PoolOverviewItem[];
  };
  counts: {
    review: number;
    learning: number;
    new: number;
    mastered: number;
  };
  cta_sense_ids: string[];
  mastered_sense_ids: string[];
};

type TrainingMode = "quick" | "errors" | "new";
type StartModeForApi = "quick" | "errors" | "new" | "mastered";

/** 1 → „rzecz”, inaczej „rzeczy”. */
function rzeczPowtorkiForm(count: number): "rzecz" | "rzeczy" {
  return count === 1 ? "rzecz" : "rzeczy";
}

function takeSenseIds(items: PoolOverviewItem[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const id = it.sense_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

function senseIdsForMode(overview: OverviewPayload, mode: TrainingMode): string[] {
  if (mode === "errors") return takeSenseIds(overview.segments.review);
  if (mode === "new") return takeSenseIds(overview.segments.new);
  const raw = overview.cta_sense_ids.filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 8);
}

function itemBySenseMap(overview: OverviewPayload): Map<string, PoolOverviewItem> {
  const m = new Map<string, PoolOverviewItem>();
  for (const it of [
    ...overview.segments.review,
    ...overview.segments.learning,
    ...overview.segments.new,
    ...overview.segments.mastered,
  ]) {
    if (it.sense_id) m.set(it.sense_id, it);
  }
  return m;
}

function previewItemsForMode(overview: OverviewPayload, mode: TrainingMode, limit = 3): PoolOverviewItem[] {
  if (mode === "errors") return overview.segments.review.slice(0, limit);
  if (mode === "new") return overview.segments.new.slice(0, limit);
  const byId = itemBySenseMap(overview);
  const out: PoolOverviewItem[] = [];
  for (const id of overview.cta_sense_ids) {
    const it = byId.get(id);
    if (it) out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

function canUseMode(overview: OverviewPayload, mode: TrainingMode): boolean {
  if (mode === "errors") return overview.segments.review.some((i) => i.sense_id);
  if (mode === "new") return overview.segments.new.some((i) => i.sense_id);
  return overview.cta_sense_ids.length > 0;
}

/** Non-clickable cue — start happens only from mode cards. */
function HeroSessionCue() {
  return (
    <div className="inline-flex shrink-0 select-none items-center gap-0.5 px-0.5 py-0.5 text-base font-bold leading-none tracking-tight text-neutral-900 sm:mr-3 sm:text-xl">
      <span>Zacznij sesję (5 min)</span>
      <span>→</span>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-28 rounded-2xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:grid-rows-2">
        <div className="h-40 rounded-xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse md:row-span-2" />
        <div className="h-24 rounded-xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse" />
        <div className="h-24 rounded-xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse" />
      </div>
      <div className="h-28 rounded-xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse" />
    </div>
  );
}

function ModeOptionCard(props: {
  title: string;
  description: string;
  variant: "primary" | "secondary";
  disabled: boolean;
  isLoading: boolean;
  onStart: () => void;
  onHoverChange?: (active: boolean) => void;
}) {
  const { title, description, variant, disabled, isLoading, onStart, onHoverChange } = props;
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={() => !(disabled || isLoading) && onStart()}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={`group w-full rounded-xl border text-left transition-all duration-200 ease-out ${
        disabled
          ? "cursor-not-allowed border-neutral-100 bg-neutral-50/60 opacity-50"
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(15,23,42,0.09)] active:translate-y-0 active:shadow-md"
      } ${
        isPrimary
          ? disabled
            ? ""
            : "border-sky-400/55 bg-gradient-to-b from-sky-50/95 to-white shadow-[0_3px_14px_rgba(14,116,144,0.12)] hover:border-sky-500/60 hover:shadow-[0_10px_28px_rgba(14,116,144,0.14)] md:min-h-[min(100%,11.5rem)]"
          : disabled
            ? ""
            : "border-neutral-200/95 bg-white hover:border-neutral-400/95"
      } ${isPrimary ? "px-4 py-4 sm:px-5 sm:py-5" : "px-3 py-3 sm:px-4 sm:py-3.5"}`}
    >
      <div className={`font-semibold tracking-tight text-neutral-900 ${isPrimary ? "text-[15px] sm:text-base" : "text-sm"}`}>
        {title}
      </div>
      <p className={`mt-1.5 leading-snug text-neutral-600 ${isPrimary ? "text-[13px] sm:text-sm" : "text-xs"}`}>{description}</p>
    </button>
  );
}

function PreviewStrip(props: { items: PoolOverviewItem[] }) {
  const { items } = props;
  if (items.length === 0) {
    return <p className="text-xs text-neutral-400">Brak pozycji do podglądu w tym trybie.</p>;
  }
  return (
    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {items.map((it) => {
        const badge = poolKnowledgeBadge(it.knowledge_state);
        const tr = it.translation?.trim() || "—";
        return (
          <li key={it.sense_id ?? it.lemma} className="flex items-start gap-3 px-3 py-2.5 first:rounded-t-xl last:rounded-b-xl sm:px-3.5 sm:py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-neutral-900">{it.lemma}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-neutral-600">{tr}</div>
            </div>
            <span className={`shrink-0 self-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PoolTrainTab(props: { onNavigateAddWords: () => void; onNavigateWords: () => void }) {
  const { onNavigateAddWords, onNavigateWords } = props;

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trainError, setTrainError] = useState("");
  const [startLoading, setStartLoading] = useState(false);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("quick");
  /** Preview follows hovered mode card (desktop UX); clears when not hovering a card. */
  const [previewModeOverride, setPreviewModeOverride] = useState<TrainingMode | null>(null);

  const [session, setSession] = useState<{ sessionId: string; cards: PoolTrainingCard[] } | null>(null);

  const previewMode = previewModeOverride ?? trainingMode;

  const loadOverview = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Musisz być zalogowany.");
      setLoading(false);
      return;
    }

    setError("");
    const res = await fetch("/api/vocab/pool/overview", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const body = (await res.json().catch(() => null)) as OverviewPayload | { error?: string } | null;
    if (!res.ok || !body || "error" in body) {
      setError((body as { error?: string })?.error ?? `HTTP ${res.status}`);
      setOverview(null);
      setLoading(false);
      return;
    }

    setOverview(body as OverviewPayload);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const totalWords =
    overview == null
      ? 0
      : overview.counts.review + overview.counts.learning + overview.counts.new + overview.counts.mastered;

  const onlyMastered =
    overview != null &&
    totalWords > 0 &&
    overview.counts.review === 0 &&
    overview.counts.learning === 0 &&
    overview.counts.new === 0;

  useEffect(() => {
    if (!overview || onlyMastered) return;
    if (!canUseMode(overview, trainingMode)) {
      if (canUseMode(overview, "quick")) setTrainingMode("quick");
      else if (canUseMode(overview, "errors")) setTrainingMode("errors");
      else if (canUseMode(overview, "new")) setTrainingMode("new");
    }
  }, [overview, onlyMastered, trainingMode]);

  const startWithSenseIds = async (
    senseIds: string[],
    apiMode: StartModeForApi,
    opts?: { quiet?: boolean }
  ) => {
    setTrainError("");
    const uniq = Array.from(new Set(senseIds.filter(Boolean)));
    if (uniq.length === 0) {
      setTrainError("Brak słów z leksykonem do treningu.");
      return;
    }
    if (!opts?.quiet) setStartLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setTrainError("Musisz być zalogowany.");
        return;
      }
      const res = await fetch("/api/vocab/training/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sense_ids: uniq.slice(0, 8), mode: apiMode }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { session_id?: string; cards?: PoolTrainingCard[]; error?: string }
        | null;
      if (!res.ok || !payload?.session_id || !Array.isArray(payload.cards)) {
        setTrainError(payload?.error ?? `HTTP ${res.status}`);
        return;
      }
      setSession({ sessionId: payload.session_id, cards: payload.cards });
    } catch (e: unknown) {
      setTrainError(e instanceof Error ? e.message : "Nie udało się rozpocząć treningu.");
    } finally {
      if (!opts?.quiet) setStartLoading(false);
    }
  };

  const startMode = (mode: TrainingMode) => {
    if (!overview || onlyMastered) return;
    setTrainingMode(mode);
    setPreviewModeOverride(null);
    const ids = senseIdsForMode(overview, mode);
    void startWithSenseIds(ids, mode);
  };

  const onRepeatMastered = () => {
    if (!overview) return;
    void startWithSenseIds(overview.mastered_sense_ids, "mastered");
  };

  const previews = useMemo(
    () => (overview && !onlyMastered ? previewItemsForMode(overview, previewMode, 3) : []),
    [overview, onlyMastered, previewMode]
  );

  if (session) {
    return (
      <PoolTrainingRunner
        sessionId={session.sessionId}
        cards={session.cards}
        onClose={() => {
          setSession(null);
          void loadOverview();
        }}
        onFinish={() => void loadOverview()}
      />
    );
  }

  const modesQuickOk = overview != null && canUseMode(overview, "quick");
  const modesErrorsOk = overview != null && canUseMode(overview, "errors");
  const modesNewOk = overview != null && canUseMode(overview, "new");

  const feedbackLine =
    overview != null && !onlyMastered
      ? overview.counts.review > 0
        ? "Skupimy się na Twoich błędach — najpierw to, co było trudne."
        : "Kilka minut skupienia, bez przeglądania długich list."
      : null;

  return (
    <div className="space-y-6">
      {loading ? <SectionSkeleton /> : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">{error}</div>
      ) : null}

      {trainError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">{trainError}</div>
      ) : null}

      {!loading && overview && totalWords === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-semibold text-neutral-900">Dodaj pierwsze słowo</p>
          <p className="mt-1 text-xs text-neutral-600 sm:text-sm">Zakładka „Dodaj”.</p>
          <button
            type="button"
            className="mt-4 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
            onClick={onNavigateAddWords}
          >
            Dodaj słówko
          </button>
        </div>
      ) : null}

      {!loading && overview && totalWords > 0 ? (
        <>
          <div className="rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-neutral-50/95 to-white px-5 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="min-w-0 space-y-2 sm:space-y-2.5">
                <p className="text-[11px] font-medium tracking-tight text-neutral-500">Masz dziś:</p>
                <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                  {onlyMastered ? (
                    <>
                      <p className="min-w-0 text-base font-bold leading-snug text-neutral-900 sm:text-[17px]">Wszystko opanowane</p>
                      <HeroSessionCue />
                    </>
                  ) : overview.counts.review > 0 ? (
                    <>
                      <p className="min-w-0 text-base font-bold leading-snug text-neutral-900 sm:text-[17px]">
                        <span className="tabular-nums">{overview.counts.review}</span> {rzeczPowtorkiForm(overview.counts.review)} do
                        powtórki
                      </p>
                      <HeroSessionCue />
                    </>
                  ) : (
                    <>
                      <p className="min-w-0 text-base font-bold leading-snug text-neutral-900 sm:text-[17px]">
                        Na dziś nie masz powtórek z błędów.
                      </p>
                      <HeroSessionCue />
                    </>
                  )}
                </div>
                {!onlyMastered && overview.counts.review > 0 ? (
                  <p className="text-xs leading-relaxed text-neutral-500">Najważniejsze słowa z Twoich błędów</p>
                ) : !onlyMastered && overview.counts.review === 0 ? (
                  <p className="text-xs leading-relaxed text-neutral-500">Wybierz tryb poniżej — start jest jednym kliknięciem.</p>
                ) : onlyMastered ? (
                  <p className="text-xs leading-relaxed text-neutral-500">Możesz zrobić krótką powtórkę utrwalającą poniżej.</p>
                ) : null}
                {feedbackLine ? (
                  <p className="text-[13px] font-medium leading-snug text-neutral-700 sm:text-sm">{feedbackLine}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200/80 pt-3 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Powtórki">
                  <span aria-hidden>🔴</span>
                  <strong className="tabular-nums font-semibold text-neutral-900">{overview.counts.review}</strong>
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap" title="W trakcie">
                  <span aria-hidden>🟡</span>
                  <strong className="tabular-nums font-semibold text-neutral-900">{overview.counts.learning}</strong>
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Nowe">
                  <span aria-hidden>⚪</span>
                  <strong className="tabular-nums font-semibold text-neutral-900">{overview.counts.new}</strong>
                </span>
              </div>
            </div>
          </div>

          {onlyMastered ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-800 sm:text-base">Jak chcesz trenować?</h2>
              <ModeOptionCard
                variant="primary"
                title="Powtórka opanowanych"
                description="Krótkie odświeżenie — bez presji, żeby nie zapomnieć."
                disabled={overview.mastered_sense_ids.length === 0}
                isLoading={startLoading}
                onStart={onRepeatMastered}
              />
            </section>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight text-neutral-800 sm:text-base">Jak chcesz trenować?</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] md:grid-rows-2">
                  <div className="md:row-span-2">
                    <ModeOptionCard
                      variant="primary"
                      title="Szybka sesja"
                      description="Miks z Twojej puli — szybko, bez wybierania."
                      disabled={!modesQuickOk}
                      isLoading={startLoading}
                      onStart={() => modesQuickOk && startMode("quick")}
                      onHoverChange={(on) => setPreviewModeOverride(on ? "quick" : null)}
                    />
                  </div>
                  <ModeOptionCard
                    variant="secondary"
                    title="Powtórz błędy"
                    description="Tylko to, co ostatnio szwankowało."
                    disabled={!modesErrorsOk}
                    isLoading={startLoading}
                    onStart={() => modesErrorsOk && startMode("errors")}
                    onHoverChange={(on) => setPreviewModeOverride(on ? "errors" : null)}
                  />
                  <ModeOptionCard
                    variant="secondary"
                    title="Nowe słowa"
                    description="Świeże słówka z puli, jedno po drugim."
                    disabled={!modesNewOk}
                    isLoading={startLoading}
                    onStart={() => modesNewOk && startMode("new")}
                    onHoverChange={(on) => setPreviewModeOverride(on ? "new" : null)}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-xs font-semibold tracking-tight text-neutral-800 sm:text-sm">Dzisiaj ćwiczysz</h3>
                  <button
                    type="button"
                    onClick={onNavigateWords}
                    className="text-xs font-medium text-neutral-400 underline-offset-2 transition hover:text-neutral-600 hover:underline"
                  >
                    Wszystkie słowa →
                  </button>
                </div>
                <PreviewStrip items={previews} />
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
