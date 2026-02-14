"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Lesson = {
  id: string;
  lesson_date: string;
  topic: string;
  summary: string | null;
};

type LessonNote = {
  id: string;
  author_role: "student" | "admin";
  content: string;
  created_at: string;
};

type LessonAssignment = {
  id: string;
  exercise_type: "pack" | "cluster" | "irregular";
  context_slug: string;
  status: "assigned" | "done" | "skipped";
  due_date: string | null;
  params: Record<string, any>;
};

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [assignments, setAssignments] = useState<LessonAssignment[]>([]);

  const [topic, setTopic] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [summary, setSummary] = useState("");

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [assignmentType, setAssignmentType] = useState<LessonAssignment["exercise_type"]>("pack");
  const [assignmentSlug, setAssignmentSlug] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentParams, setAssignmentParams] = useState("{}");
  const [addingAssignment, setAddingAssignment] = useState(false);

  const assignedCount = useMemo(
    () => assignments.filter((a) => a.status === "assigned").length,
    [assignments]
  );
  const doneCount = useMemo(() => assignments.filter((a) => a.status === "done").length, [assignments]);
  const buildAssignmentHref = (assignment: LessonAssignment) => {
    const params = new URLSearchParams();
    params.set("autostart", "1");
    params.set("assignmentId", assignment.id);

    Object.entries(assignment.params ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params.set(String(key), String(value));
    });

    if (assignment.exercise_type === "pack") {
      return `/app/vocab/pack/${assignment.context_slug}?${params.toString()}`;
    }
    if (assignment.exercise_type === "cluster") {
      return `/app/vocab/clusters/${assignment.context_slug}?${params.toString()}`;
    }
    return `/app/irregular-verbs/train?${params.toString()}`;
  };

  const loadLesson = async () => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      router.push("/login");
      return;
    }
    const token = session.data.session.access_token;

    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errorData.error || "Nie udało się wczytać lekcji.");
    }
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Nie udało się wczytać lekcji.");

    setLesson(data.lesson);
    setNotes(data.notes ?? []);
    setAssignments(data.assignments ?? []);
    setTopic(data.lesson.topic ?? "");
    setLessonDate(data.lesson.lesson_date ?? "");
    setSummary(data.lesson.summary ?? "");
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await loadLesson();
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać lekcji.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [lessonId]);

  useEffect(() => {
    const refresh = async () => {
      if (!lessonId) return;
      try {
        setRefreshing(true);
        setError("");
        await loadLesson();
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się odświeżyć lekcji.");
      } finally {
        setTimeout(() => setRefreshing(false), 250);
      }
    };

    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lessonId]);

  const saveLesson = async () => {
    if (!lesson) return;
    if (!topic.trim()) {
      setError("Temat lekcji jest wymagany.");
      return;
    }
    if (!lessonDate) {
      setError("Data lekcji jest wymagana.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }
      const token = session.data.session.access_token;

      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          lesson_date: lessonDate,
          summary: summary.trim() || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się zapisać lekcji.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się zapisać lekcji.");

      setLesson(data.lesson);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zapisać lekcji.");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);
      setError("");
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }
      const token = session.data.session.access_token;

      const res = await fetch(`/api/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się dodać notatki.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się dodać notatki.");

      setNoteText("");
      setNotes((prev) => [...prev, data.note]);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać notatki.");
    } finally {
      setAddingNote(false);
    }
  };

  const addAssignment = async () => {
    if (!assignmentSlug.trim()) {
      setError("Podaj slug ćwiczenia.");
      return;
    }
    let parsedParams: Record<string, any> = {};
    try {
      parsedParams = assignmentParams.trim() ? JSON.parse(assignmentParams) : {};
    } catch {
      setError("Parametry muszą być poprawnym JSON.");
      return;
    }

    try {
      setAddingAssignment(true);
      setError("");
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }
      const token = session.data.session.access_token;

      const res = await fetch(`/api/lessons/${lessonId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercise_type: assignmentType,
          context_slug: assignmentSlug.trim(),
          params: parsedParams,
          due_date: assignmentDueDate || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się dodać zadania.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się dodać zadania.");

      setAssignments((prev) => [...prev, data.assignment]);
      setAssignmentSlug("");
      setAssignmentParams("{}");
      setAssignmentDueDate("");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać zadania.");
    } finally {
      setAddingAssignment(false);
    }
  };

  const markSkipped = async (assignmentId: string) => {
    try {
      setError("");
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }
      const token = session.data.session.access_token;

      const res = await fetch(`/api/lessons/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "skipped" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się zaktualizować zadania.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się zaktualizować zadania.");

      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? data.assignment : a)));
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zaktualizować zadania.");
    }
  };


  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
          <div className="text-sm text-white/70">Ładuję lekcję…</div>
        </section>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-rose-400/30 bg-rose-400/10 p-5">
          <div className="text-sm text-rose-100">Nie znaleziono lekcji.</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Lekcja</h1>
            <div className="text-sm text-white/70">
              Zadania: {doneCount}/{assignedCount}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveLesson}
              className="rounded-xl border border-emerald-200/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              disabled={saving}
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/lessons/list")}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
            >
              ← Wróć do listy
            </button>
          </div>
        </div>
      </header>

      {refreshing ? (
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-3 text-sm text-white/70">
          Odświeżam…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}


      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/85">Data</label>
            <input
              className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/85">Temat</label>
            <input
              className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Temat lekcji"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-white/85">Podsumowanie</label>
          <textarea
            className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Co było na lekcji, co zadane..."
          />
        </div>
      </section>

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">Notatki</h2>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
          <textarea
            className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Dodaj notatkę..."
          />
          <button
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
            onClick={addNote}
            disabled={addingNote || !noteText.trim()}
          >
            {addingNote ? "Dodaję…" : "Dodaj notatkę"}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-white/70">Brak notatek.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60 mb-2">
                  {note.author_role === "admin" ? "Nauczyciel" : "Uczeń"} •{" "}
                  {new Date(note.created_at).toLocaleString()}
                </div>
                <div className="text-sm text-white/85 whitespace-pre-wrap">{note.content}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">Zadania</h2>
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/85">Typ</label>
              <select
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white"
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as LessonAssignment["exercise_type"])}
              >
                <option value="pack">Pack</option>
                <option value="cluster">Cluster</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-white/85">Slug</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={assignmentSlug}
                onChange={(e) => setAssignmentSlug(e.target.value)}
                placeholder="np. shop"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-white/85">Termin</label>
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                type="date"
                value={assignmentDueDate}
                onChange={(e) => setAssignmentDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/85">Parametry (JSON)</label>
            <textarea
              className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              rows={2}
              value={assignmentParams}
              onChange={(e) => setAssignmentParams(e.target.value)}
            />
          </div>
          <button
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
            onClick={addAssignment}
            disabled={addingAssignment}
          >
            {addingAssignment ? "Dodaję…" : "Dodaj zadanie"}
          </button>
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-white/70">Brak zadań.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {assignment.exercise_type} • {assignment.context_slug}
                    </div>
                    <div className="text-xs text-white/60">
                      Status: {assignment.status}
                      {assignment.due_date ? ` • termin: ${assignment.due_date}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="rounded-xl border-2 border-emerald-200/30 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
                      href={buildAssignmentHref(assignment)}
                    >
                      Start →
                    </a>
                    <button
                      className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-400/20 transition"
                      onClick={() => markSkipped(assignment.id)}
                    >
                      Oznacz jako pominięte
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
