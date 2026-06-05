"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import { supabase } from "@/lib/supabase/client";
import { LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/lessons/constants";

// ── helpers ────────────────────────────────────────────────────────────────────

const MONTHS_PL = [
  "stycznia","lutego","marca","kwietnia","maja","czerwca",
  "lipca","sierpnia","września","października","listopada","grudnia",
];

function formatModalDate(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso.trim())) return dateIso;
  const [y, m, d] = dateIso.trim().split("-").map((x) => parseInt(x, 10));
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  return Number.isFinite(Date.parse(s.trim()));
}

function personDisplayName(row: { username: string | null; email: string | null } | null | undefined): string {
  if (!row) return "Użytkownik";
  const u = (row.username ?? "").trim();
  if (u) return u;
  const e = (row.email ?? "").trim();
  if (e) return e.includes("@") ? e.split("@")[0]! : e;
  return "Użytkownik";
}

type RosterRow = {
  relation_id: string;
  student_id: string;
  email: string | null;
  username: string | null;
};

// ── shared input styles ────────────────────────────────────────────────────────

const topicInputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

// ── props ──────────────────────────────────────────────────────────────────────

type NewLessonModalProps = {
  open: boolean;
  dateIso: string;
  onClose: () => void;
};

// ── component ─────────────────────────────────────────────────────────────────

export default function NewLessonModal({ open, dateIso, onClose }: NewLessonModalProps) {
  const router = useRouter();

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [roster, setRoster]             = useState<RosterRow[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [addOpen, setAddOpen]           = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [addBusy, setAddBusy]           = useState(false);
  const [topicDraft, setTopicDraft]     = useState("");
  const [error, setError]               = useState("");
  const [creating, setCreating]         = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createdRef   = useRef(false);
  const inflightRef  = useRef(false);

  // Reset state each time the modal opens for a new date
  useEffect(() => {
    if (!open) return;
    setTopicDraft("");
    setError("");
    setAddOpen(false);
    setNewStudentEmail("");
    createdRef.current  = false;
    inflightRef.current = false;
  }, [open, dateIso]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load profile once
  useEffect(() => {
    void getOrCreateProfile().then(setProfile);
  }, []);

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  };

  // Load roster once profile is ready
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setRosterLoaded(false);
    void (async () => {
      try {
        const token = await getToken();
        if (!token) { if (!cancelled) setRosterLoaded(true); return; }
        const res = await fetch("/api/teacher/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; students?: RosterRow[] } | null;
        if (!cancelled && data?.ok && Array.isArray(data.students)) setRoster(data.students);
      } finally {
        if (!cancelled) setRosterLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  // Auto-select student when roster is loaded
  useEffect(() => {
    if (!profile || !rosterLoaded) return;
    if (roster.length === 0) { setSelectedStudentId(profile.id); return; }
    if (roster.length === 1) { setSelectedStudentId(roster[0].student_id); return; }
    setSelectedStudentId("");
  }, [profile, roster, rosterLoaded]);

  const isTeacher     = roster.length > 0;
  const canShowTopic  = useMemo(() => !!(profile && rosterLoaded && selectedStudentId), [profile, rosterLoaded, selectedStudentId]);

  // Create lesson logic
  const commitCreate = useCallback(async (rawTopic: string) => {
    if (createdRef.current || inflightRef.current || !isValidIsoDate(dateIso)) return;
    const topic = rawTopic.trim();
    if (!topic || !profile || !rosterLoaded || !selectedStudentId.trim()) return;

    inflightRef.current = true;
    setCreating(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) { setError("Musisz być zalogowany."); return; }

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lesson_date: dateIso, topic, student_id: selectedStudentId.trim() }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError((errBody as { error?: string }).error || "Nie udało się utworzyć lekcji.");
        return;
      }
      const data = await res.json().catch(() => null);
      const id = data?.lesson?.id as string | undefined;
      if (!data?.ok || !id) { setError("Nieprawidłowa odpowiedź serwera."); return; }
      createdRef.current = true;
      onClose();
      router.push(`/app/lessons/${id}`);
    } catch {
      setError("Nie udało się utworzyć lekcji.");
    } finally {
      inflightRef.current = false;
      setCreating(false);
    }
  }, [dateIso, profile, rosterLoaded, selectedStudentId, router, onClose]);

  // Debounced auto-create on topic typing
  useEffect(() => {
    if (!isValidIsoDate(dateIso) || createdRef.current || !canShowTopic) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = topicDraft.trim();
    if (!trimmed) return;
    const snapshot = topicDraft;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void commitCreate(snapshot);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [topicDraft, dateIso, commitCreate, canShowTopic]);

  // Add student handler
  const submitAddStudent = useCallback(async () => {
    const email = newStudentEmail.trim();
    if (!email || !profile) return;
    setAddBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) { setError("Musisz być zalogowany."); return; }
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; id?: string; email?: string | null; username?: string | null; error?: string;
      };
      if (!res.ok) { setError(data.error || "Nie udało się dodać ucznia."); return; }
      if (!data.ok || !data.id) { setError("Nieprawidłowa odpowiedź serwera."); return; }
      const row: RosterRow = { relation_id: "", student_id: data.id, email: data.email ?? null, username: data.username ?? null };
      setRoster((prev) => prev.some((p) => p.student_id === row.student_id) ? prev : [...prev, row]);
      setSelectedStudentId(data.id);
      setNewStudentEmail("");
      setAddOpen(false);
    } catch {
      setError("Nie udało się dodać ucznia.");
    } finally {
      setAddBusy(false);
    }
  }, [newStudentEmail, profile]);

  const selectOptions = useMemo(() => {
    if (!profile || roster.length < 2) return [];
    return [
      { value: profile.id, primary: "Ty (lekcja osobista)", secondary: profile.email ?? "" },
      ...roster.map((r) => ({
        value: r.student_id,
        primary: personDisplayName(r),
        secondary: (r.email ?? "").trim(),
      })),
    ];
  }, [profile, roster]);

  if (!open) return null;

  const addStudentControls = (
    <>
      <button
        type="button"
        onClick={() => setAddOpen((v) => !v)}
        className="text-left text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
      >
        {addOpen ? "− Anuluj" : "+ Dodaj nowego ucznia"}
      </button>
      {addOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <label htmlFor="new-student-email-modal" className="text-[11px] font-medium text-slate-500">
            Email ucznia
          </label>
          <input
            id="new-student-email-modal"
            type="email"
            autoComplete="email"
            value={newStudentEmail}
            onChange={(e) => setNewStudentEmail(e.target.value)}
            placeholder="jan@example.com"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900/10"
            disabled={addBusy}
          />
          <button
            type="button"
            onClick={() => void submitAddStudent()}
            disabled={addBusy || !newStudentEmail.trim()}
            className="self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {addBusy ? "…" : "Dodaj"}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-lesson-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Zamknij"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex w-full max-w-md flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-[11px] font-medium text-slate-400">{formatModalDate(dateIso)}</p>
            <h2 id="new-lesson-modal-title" className="text-base font-semibold tracking-tight text-slate-900">
              Nowa lekcja
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Zamknij"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-4 py-4">
          {error && (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2">
              <p className="text-xs leading-snug text-rose-700">{error}</p>
            </div>
          )}

          {/* ── Teacher: student selection ── */}
          {isTeacher && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">Dla kogo?</p>
              {roster.length === 1 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <p className="text-[11px] font-medium text-slate-500">Uczeń</p>
                  <p className="text-sm font-semibold text-slate-900">{personDisplayName(roster[0])}</p>
                  {(roster[0].email ?? "").trim() && (
                    <p className="text-xs text-slate-500">{roster[0].email}</p>
                  )}
                </div>
              ) : (
                <select
                  className={selectClass}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={creating}
                  aria-label="Wybierz ucznia"
                >
                  <option value="">Wybierz ucznia</option>
                  {selectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.primary}{o.secondary ? ` — ${o.secondary}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {addStudentControls}
            </div>
          )}

          {/* ── Topic input ── */}
          {canShowTopic ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-lesson-topic-modal" className="text-xs font-semibold text-slate-500 uppercase tracking-[0.06em]">
                Temat lekcji
              </label>
              <input
                id="new-lesson-topic-modal"
                type="text"
                autoFocus
                className={topicInputClass}
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                placeholder="Wpisz temat, aby utworzyć lekcję…"
                autoComplete="off"
                disabled={creating}
                aria-busy={creating}
              />
              {creating && (
                <p className="text-[11px] text-slate-400">Tworzę lekcję…</p>
              )}
            </div>
          ) : !rosterLoaded ? (
            <p className="text-xs text-slate-400">Wczytywanie…</p>
          ) : isTeacher && !selectedStudentId ? (
            <p className="text-xs text-slate-500">Wybierz ucznia, aby wpisać temat lekcji.</p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
