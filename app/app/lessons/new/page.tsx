"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import { supabase } from "@/lib/supabase/client";
import { LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/lessons/constants";

const topicInputClass =
  "w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

const selectClass =
  "w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

type RosterRow = {
  relation_id: string;
  student_id: string;
  email: string | null;
  username: string | null;
};

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const t = Date.parse(s.trim());
  return Number.isFinite(t);
}

function personDisplayName(row: { username: string | null; email: string | null } | null | undefined): string {
  if (!row) return "Użytkownik";
  const u = (row.username ?? "").trim();
  if (u) return u;
  const e = (row.email ?? "").trim();
  if (e) return e.includes("@") ? e.split("@")[0]! : e;
  return "Użytkownik";
}

function NewLessonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = (searchParams.get("date") ?? "").trim();
  const studentIdParam = (searchParams.get("student_id") ?? "").trim();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createdRef = useRef(false);
  const inflightRef = useRef(false);

  useEffect(() => {
    void getOrCreateProfile().then(setProfile);
  }, []);

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  };

  useEffect(() => {
    if (!profile || profile.role === "admin") {
      setRosterLoaded(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setRosterLoaded(true);
          return;
        }
        const res = await fetch("/api/teacher/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; students?: RosterRow[] } | null;
        if (!cancelled && data?.ok && Array.isArray(data.students)) {
          setRoster(data.students);
        }
      } finally {
        if (!cancelled) setRosterLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const needsRosterPicker = Boolean(profile && profile.role !== "admin" && roster.length > 0);

  useEffect(() => {
    if (!profile || profile.role === "admin") return;
    if (!rosterLoaded) return;

    if (roster.length === 0) {
      setSelectedStudentId(profile.id);
      return;
    }

    if (studentIdParam) {
      if (studentIdParam === profile.id || roster.some((r) => r.student_id === studentIdParam)) {
        setSelectedStudentId(studentIdParam);
        return;
      }
    }

    setSelectedStudentId("");
  }, [profile, roster, rosterLoaded, studentIdParam]);

  useEffect(() => {
    if (!profile || profile.role === "admin") return;
    if (roster.length > 0 && !selectedStudentId) {
      setTopicDraft("");
    }
  }, [profile, roster.length, selectedStudentId]);

  const commitCreate = useCallback(
    async (rawTopic: string) => {
      if (createdRef.current || inflightRef.current || !isValidIsoDate(dateParam)) return;
      const topic = rawTopic.trim();
      if (!topic) return;
      if (!profile) return;
      if (profile.role !== "admin" && !rosterLoaded) return;

      inflightRef.current = true;
      setCreating(true);
      setError("");
      try {
        const token = await getToken();
        if (!token) {
          setError("Musisz być zalogowany.");
          return;
        }
        if (profile.role === "admin" && !studentIdParam) {
          setError("Dla konta administratora w adresie URL musi być podany student_id (UUID ucznia).");
          return;
        }

        let studentIdForLesson: string;
        if (profile.role === "admin") {
          studentIdForLesson = studentIdParam;
        } else if (roster.length > 0) {
          if (!selectedStudentId) {
            setError("Najpierw wybierz ucznia");
            return;
          }
          studentIdForLesson = selectedStudentId;
        } else {
          studentIdForLesson = profile.id;
        }

        const body: Record<string, unknown> = {
          lesson_date: dateParam,
          topic,
          student_id: studentIdForLesson,
        };

        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          setError((errBody as { error?: string }).error || "Nie udało się utworzyć lekcji.");
          return;
        }
        const data = await res.json().catch(() => null);
        const id = data?.lesson?.id as string | undefined;
        if (!data?.ok || !id) {
          setError("Nieprawidłowa odpowiedź serwera.");
          return;
        }
        createdRef.current = true;
        router.replace(`/app/lessons/${id}`);
      } catch {
        setError("Nie udało się utworzyć lekcji.");
      } finally {
        inflightRef.current = false;
        setCreating(false);
      }
    },
    [
      dateParam,
      router,
      profile,
      studentIdParam,
      roster.length,
      rosterLoaded,
      selectedStudentId,
    ],
  );

  const submitAddStudent = useCallback(async () => {
    const email = newStudentEmail.trim();
    if (!email || !profile) return;
    setAddBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        setError("Musisz być zalogowany.");
        return;
      }
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        email?: string | null;
        username?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Nie udało się dodać ucznia.");
        return;
      }
      if (!data.ok || !data.id) {
        setError("Nieprawidłowa odpowiedź serwera.");
        return;
      }
      const row: RosterRow = {
        relation_id: "",
        student_id: data.id,
        email: data.email ?? null,
        username: data.username ?? null,
      };
      setRoster((prev) => {
        if (prev.some((p) => p.student_id === row.student_id)) return prev;
        return [...prev, row];
      });
      setSelectedStudentId(data.id);
      setNewStudentEmail("");
      setAddOpen(false);
    } catch {
      setError("Nie udało się dodać ucznia.");
    } finally {
      setAddBusy(false);
    }
  }, [newStudentEmail, profile]);

  useEffect(() => {
    if (!isValidIsoDate(dateParam)) {
      router.replace("/app/lessons");
    }
  }, [dateParam, router]);

  const canShowTopicField = useMemo(() => {
    if (!profile) return false;
    if (profile.role === "admin") return studentIdParam.length > 0;
    if (!rosterLoaded) return false;
    if (roster.length > 0) return selectedStudentId.length > 0;
    return true;
  }, [profile, rosterLoaded, roster.length, selectedStudentId, studentIdParam]);

  useEffect(() => {
    if (!isValidIsoDate(dateParam) || createdRef.current) return;
    if (!canShowTopicField) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = topicDraft.trim();
    if (!trimmed) return;

    const snapshot = topicDraft;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void commitCreate(snapshot);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [topicDraft, dateParam, commitCreate, canShowTopicField]);

  const pickerBlocked = Boolean(profile && profile.role !== "admin" && !rosterLoaded);

  const selectOptions = useMemo(() => {
    if (!profile || roster.length === 0) return [];
    const selfLabel = "Ty (lekcja osobista)";
    const opts: { value: string; primary: string; secondary: string }[] = [
      { value: profile.id, primary: selfLabel, secondary: profile.email ?? "" },
      ...roster.map((r) => ({
        value: r.student_id,
        primary: personDisplayName(r),
        secondary: (r.email ?? "").trim(),
      })),
    ];
    return opts;
  }, [profile, roster]);

  if (!isValidIsoDate(dateParam)) {
    return null;
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
      <header className="shrink-0">
        <Link
          href="/app/lessons"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Wróć do kalendarza
        </Link>
        <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Nowa lekcja</h1>
      </header>

      {error ? (
        <div className="shrink-0 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3 py-2">
          <p className="text-xs leading-snug text-rose-700">{error}</p>
        </div>
      ) : null}

      {(() => {
        if (!profile) {
          return <p className="shrink-0 text-xs text-slate-400">Wczytywanie profilu…</p>;
        }
        if (profile.role === "admin") {
          return null;
        }
        return (
          <div className="shrink-0 space-y-2">
            <p className="text-sm font-medium text-slate-800">Dla kogo jest ta lekcja?</p>
            {pickerBlocked ? (
              <p className="text-xs text-slate-400">Wczytywanie listy uczniów…</p>
            ) : needsRosterPicker ? (
              <>
                <select
                  id="new-lesson-student"
                  className={selectClass}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={creating}
                  aria-label="Wybierz ucznia"
                >
                  <option value="">Wybierz ucznia</option>
                  {selectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.primary}
                      {o.secondary ? ` — ${o.secondary}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddOpen((v) => !v)}
                  className="text-left text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                >
                  {addOpen ? "− Anuluj dodawanie" : "+ Dodaj nowego ucznia"}
                </button>
                {addOpen ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                    <label htmlFor="new-student-email" className="text-[11px] font-medium text-slate-500">
                      Email ucznia
                    </label>
                    <input
                      id="new-student-email"
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
                ) : null}
              </>
            ) : (
              <>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{personDisplayName(profile)}</p>
                  {profile.email ? (
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-slate-500">Lekcja osobista</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen((v) => !v)}
                  className="text-left text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                >
                  {addOpen ? "− Anuluj dodawanie" : "+ Dodaj nowego ucznia"}
                </button>
                {addOpen ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                    <label htmlFor="new-student-email-solo" className="text-[11px] font-medium text-slate-500">
                      Email ucznia
                    </label>
                    <input
                      id="new-student-email-solo"
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
                ) : null}
              </>
            )}
          </div>
        );
      })()}

      {profile?.role === "admin" && !studentIdParam ? (
        <p className="shrink-0 text-xs text-slate-500">
          Podaj <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">student_id</code> w adresie URL
          (np. z listy lekcji), żeby móc wpisać temat.
        </p>
      ) : null}

      {canShowTopicField ? (
        <div className="shrink-0 space-y-1">
          <label htmlFor="new-lesson-topic" className="text-[11px] font-medium text-slate-400">
            Temat lekcji
          </label>
          <input
            id="new-lesson-topic"
            type="text"
            className={topicInputClass}
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            placeholder="Wpisz temat, aby utworzyć lekcję"
            autoComplete="off"
            disabled={creating}
            aria-busy={creating}
          />
        </div>
      ) : profile && profile.role !== "admin" && rosterLoaded && needsRosterPicker && !selectedStudentId ? (
        <p className="shrink-0 text-xs text-slate-500">Wybierz ucznia — potem wpiszesz temat lekcji.</p>
      ) : null}
    </main>
  );
}

export default function NewLessonPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
        </main>
      }
    >
      <NewLessonInner />
    </Suspense>
  );
}
