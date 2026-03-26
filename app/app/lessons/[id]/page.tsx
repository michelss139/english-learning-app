"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import type { Lesson } from "@/lib/lessons/types";
import {
  LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS,
  STUDENT_LESSON_POLL_INTERVAL_MS,
  TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS,
} from "@/lib/lessons/constants";

type LessonNoteSaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

const NOTE_STATUS_SAVED_CLEAR_MS = 2000;
const NOTE_STATUS_CONFLICT_CLEAR_MS = 4000;

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

const cardBase =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[box-shadow] duration-200 ease-out hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]";

const cardNote =
  "flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[box-shadow] duration-200 ease-out hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]";

const topicInputClass =
  "w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

function lessonNoteStatusText(status: LessonNoteSaveStatus): string | null {
  switch (status) {
    case "idle":
      return null;
    case "saving":
      return "Zapisywanie…";
    case "saved":
      return "Zapisano";
    case "conflict":
      return "Zapisano (zsynchronizowano)";
    case "error":
      return "Nie udało się zapisać — spróbuj ponownie";
    default:
      return null;
  }
}

const NOTE_FIELD_PLACEHOLDER = "Notatka z lekcji";

type LessonAssignmentRow = {
  id: string;
  exercise_type: "pack" | "cluster" | "irregular";
  context_slug: string;
  status: string;
};

const assignmentLinkMotion =
  "block rounded-lg py-1.5 pl-0.5 text-sm font-medium text-slate-700 transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-slate-900";

function assignmentTrainingHref(a: LessonAssignmentRow): string {
  const q = `assignmentId=${encodeURIComponent(a.id)}`;
  if (a.exercise_type === "pack") {
    return `/app/vocab/pack/${encodeURIComponent(a.context_slug)}?${q}`;
  }
  if (a.exercise_type === "cluster") {
    return `/app/vocab/cluster/${encodeURIComponent(a.context_slug)}?${q}`;
  }
  return `/app/irregular?${q}`;
}

function assignmentDisplayLabel(a: LessonAssignmentRow): string {
  const s = (a.context_slug ?? "").trim();
  if (s) return s;
  if (a.exercise_type === "irregular") return "Czasowniki nieregularne";
  if (a.exercise_type === "pack") return "Pakiet";
  if (a.exercise_type === "cluster") return "Klaster";
  return "Ćwiczenie";
}

function formatPolishDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) return isoDate || "—";
  const [y, m, d] = isoDate.trim().split("-");
  return `${parseInt(d, 10)} ${MONTHS_PL[parseInt(m, 10) - 1]} ${y}`;
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = (params?.id as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [assignments, setAssignments] = useState<LessonAssignmentRow[]>([]);
  const [assignmentsFetchDone, setAssignmentsFetchDone] = useState(false);
  const [assignmentAddKind, setAssignmentAddKind] = useState<"pack" | "cluster" | null>(null);
  const [assignmentAddSlug, setAssignmentAddSlug] = useState("");
  const [assignmentAddBusy, setAssignmentAddBusy] = useState(false);
  const [topicField, setTopicField] = useState("");
  const [irregularVerbsField, setIrregularVerbsField] = useState("");
  const [irregularVerbsSaveFeedback, setIrregularVerbsSaveFeedback] = useState<{
    saved: string[];
    ignored: string[];
  } | null>(null);
  const [teacherNote, setTeacherNote] = useState("");
  const [studentNote, setStudentNote] = useState("");

  const topicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicSaveInflightRef = useRef(0);
  const irregularVerbsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const irregularVerbsSaveInflightRef = useRef(0);
  const initialTopicSaveSkippedRef = useRef(false);
  const initialIrregularVerbsSaveSkippedRef = useRef(false);

  const teacherNoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teacherNoteSaveInflightRef = useRef(0);
  const studentNoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentNoteSaveInflightRef = useRef(0);
  const initialTeacherNoteSaveSkippedRef = useRef(false);
  const initialStudentNoteSaveSkippedRef = useRef(false);
  const lessonSyncVersionRef = useRef<string | null>(null);

  const [lessonDateField, setLessonDateField] = useState("");
  const lessonDateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonDateSaveInflightRef = useRef(0);

  const [teacherNoteStatus, setTeacherNoteStatus] = useState<LessonNoteSaveStatus>("idle");
  const [studentNoteStatus, setStudentNoteStatus] = useState<LessonNoteSaveStatus>("idle");
  const [topicStatus, setTopicStatus] = useState<LessonNoteSaveStatus>("idle");
  const [irregularVerbsStatus, setIrregularVerbsStatus] = useState<LessonNoteSaveStatus>("idle");
  const teacherNoteStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentNoteStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const irregularVerbsStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  };

  const fetchJsonWithAuth = async (input: string, init?: RequestInit) => {
    const token = await getToken();
    if (!token) throw new Error("Musisz być zalogowany.");

    const res = await fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return res.json();
  };

  const loadLesson = async () => {
    const lessonData = (await fetchJsonWithAuth(`/api/lessons/${lessonId}`)) as {
      lesson: Lesson;
    };

    initialTeacherNoteSaveSkippedRef.current = false;
    initialStudentNoteSaveSkippedRef.current = false;
    initialTopicSaveSkippedRef.current = false;
    initialIrregularVerbsSaveSkippedRef.current = false;

    setLesson(lessonData.lesson);
    setTopicField(lessonData.lesson.topic ?? "");
    setIrregularVerbsField(lessonData.lesson.irregular_verbs ?? "");
    setLessonDateField(lessonData.lesson.lesson_date ?? "");
    setTeacherNote(lessonData.lesson.teacher_note ?? "");
    setStudentNote(lessonData.lesson.student_note ?? "");
    lessonSyncVersionRef.current = lessonData.lesson.updated_at ?? null;
  };

  const loadAssignments = useCallback(async () => {
    if (!lessonId) {
      setAssignmentsFetchDone(false);
      return;
    }
    setAssignmentsFetchDone(false);
    try {
      const data = (await fetchJsonWithAuth(`/api/lessons/${lessonId}/assignments`)) as {
        ok?: boolean;
        assignments?: LessonAssignmentRow[];
      };
      const list = Array.isArray(data.assignments) ? data.assignments : [];
      setAssignments(list);
      if (process.env.NODE_ENV === "development") {
        console.log("[lesson assignments]", { lessonId, response: data, assignments: list });
      }
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsFetchDone(true);
    }
  }, [lessonId]);

  const submitNewAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!lessonId || !assignmentAddKind || assignmentAddBusy) return;
    const slug = assignmentAddSlug.trim();
    if (!slug) return;

    setAssignmentAddBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Musisz być zalogowany.");
      const res = await fetch(`/api/lessons/${lessonId}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          exercise_type: assignmentAddKind,
          context_slug: slug,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAssignmentAddSlug("");
      setAssignmentAddKind(null);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać przypisania.");
    } finally {
      setAssignmentAddBusy(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const p = await getOrCreateProfile();
        setProfile(p);
        await loadLesson();
        await loadAssignments();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nie udało się wczytać lekcji.");
        setAssignments([]);
        setAssignmentsFetchDone(true);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [lessonId, loadAssignments]);

  useEffect(() => {
    const refresh = async () => {
      if (!lessonId) return;
      try {
        setError("");
        await loadLesson();
        await loadAssignments();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nie udało się odświeżyć lekcji.");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lessonId, loadAssignments]);

  const isAdminOverride = profile?.role === "admin";
  const isLessonTeacher = Boolean(
    profile?.id && lesson?.created_by && profile.id === lesson.created_by,
  );
  const isLessonStudent = Boolean(
    profile?.id && lesson?.student_id && profile.id === lesson.student_id,
  );

  const canEditTeacherNote = isAdminOverride || isLessonTeacher;
  const canEditStudentNote = isAdminOverride || isLessonStudent;
  const canEditTopic = isAdminOverride || isLessonTeacher;
  const canCreateLessonAssignments = isAdminOverride || isLessonTeacher;
  const canManageLesson = isAdminOverride || isLessonTeacher || isLessonStudent;

  const applyLessonConflict = useCallback(
    (row: Lesson, opts: { syncTeacherText?: boolean; syncStudentText?: boolean }) => {
      lessonSyncVersionRef.current = row.updated_at ?? null;
      setLesson(row);
      setTopicField(row.topic ?? "");
      setIrregularVerbsField(row.irregular_verbs ?? "");
      setLessonDateField(row.lesson_date ?? "");
      if (opts.syncTeacherText) setTeacherNote(row.teacher_note ?? "");
      if (opts.syncStudentText) setStudentNote(row.student_note ?? "");
    },
    [],
  );

  const bumpTeacherNoteStatus = useCallback((next: LessonNoteSaveStatus) => {
    if (teacherNoteStatusClearRef.current) {
      clearTimeout(teacherNoteStatusClearRef.current);
      teacherNoteStatusClearRef.current = null;
    }
    setTeacherNoteStatus(next);
    if (next === "saved") {
      teacherNoteStatusClearRef.current = setTimeout(() => {
        teacherNoteStatusClearRef.current = null;
        setTeacherNoteStatus((s) => (s === "saved" ? "idle" : s));
      }, NOTE_STATUS_SAVED_CLEAR_MS);
    } else if (next === "conflict") {
      teacherNoteStatusClearRef.current = setTimeout(() => {
        teacherNoteStatusClearRef.current = null;
        setTeacherNoteStatus((s) => (s === "conflict" ? "idle" : s));
      }, NOTE_STATUS_CONFLICT_CLEAR_MS);
    }
  }, []);

  const bumpStudentNoteStatus = useCallback((next: LessonNoteSaveStatus) => {
    if (studentNoteStatusClearRef.current) {
      clearTimeout(studentNoteStatusClearRef.current);
      studentNoteStatusClearRef.current = null;
    }
    setStudentNoteStatus(next);
    if (next === "saved") {
      studentNoteStatusClearRef.current = setTimeout(() => {
        studentNoteStatusClearRef.current = null;
        setStudentNoteStatus((s) => (s === "saved" ? "idle" : s));
      }, NOTE_STATUS_SAVED_CLEAR_MS);
    } else if (next === "conflict") {
      studentNoteStatusClearRef.current = setTimeout(() => {
        studentNoteStatusClearRef.current = null;
        setStudentNoteStatus((s) => (s === "conflict" ? "idle" : s));
      }, NOTE_STATUS_CONFLICT_CLEAR_MS);
    }
  }, []);

  const bumpTopicStatus = useCallback((next: LessonNoteSaveStatus) => {
    if (topicStatusClearRef.current) {
      clearTimeout(topicStatusClearRef.current);
      topicStatusClearRef.current = null;
    }
    setTopicStatus(next);
    if (next === "saved") {
      topicStatusClearRef.current = setTimeout(() => {
        topicStatusClearRef.current = null;
        setTopicStatus((s) => (s === "saved" ? "idle" : s));
      }, NOTE_STATUS_SAVED_CLEAR_MS);
    } else if (next === "conflict") {
      topicStatusClearRef.current = setTimeout(() => {
        topicStatusClearRef.current = null;
        setTopicStatus((s) => (s === "conflict" ? "idle" : s));
      }, NOTE_STATUS_CONFLICT_CLEAR_MS);
    }
  }, []);

  const bumpIrregularVerbsStatus = useCallback((next: LessonNoteSaveStatus) => {
    if (irregularVerbsStatusClearRef.current) {
      clearTimeout(irregularVerbsStatusClearRef.current);
      irregularVerbsStatusClearRef.current = null;
    }
    setIrregularVerbsStatus(next);
    if (next === "saved") {
      irregularVerbsStatusClearRef.current = setTimeout(() => {
        irregularVerbsStatusClearRef.current = null;
        setIrregularVerbsStatus((s) => (s === "saved" ? "idle" : s));
      }, NOTE_STATUS_SAVED_CLEAR_MS);
    } else if (next === "conflict") {
      irregularVerbsStatusClearRef.current = setTimeout(() => {
        irregularVerbsStatusClearRef.current = null;
        setIrregularVerbsStatus((s) => (s === "conflict" ? "idle" : s));
      }, NOTE_STATUS_CONFLICT_CLEAR_MS);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (teacherNoteStatusClearRef.current) clearTimeout(teacherNoteStatusClearRef.current);
      if (studentNoteStatusClearRef.current) clearTimeout(studentNoteStatusClearRef.current);
      if (topicStatusClearRef.current) clearTimeout(topicStatusClearRef.current);
      if (irregularVerbsStatusClearRef.current) clearTimeout(irregularVerbsStatusClearRef.current);
    };
  }, []);

  const saveTeacherNoteToServer = useCallback(
    async (raw: string) => {
      if (!lessonId) return;
      const trimmed = raw.trim();
      const teacher_note = trimmed.length === 0 ? null : trimmed;

      teacherNoteSaveInflightRef.current += 1;
      bumpTeacherNoteStatus("saving");
      const attempt = async (): Promise<"ok" | "fail" | "conflict"> => {
        const if_lesson_updated_at = lessonSyncVersionRef.current;
        if (!if_lesson_updated_at) {
          console.log("[lesson teacher_note autosave] missing lesson version (if_lesson_updated_at)");
          return "fail";
        }
        try {
          const token = await getToken();
          if (!token) {
            console.log("[lesson teacher_note autosave] missing auth token");
            return "fail";
          }
          const res = await fetch(`/api/lessons/${lessonId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ if_lesson_updated_at, teacher_note }),
          });
          if (res.status === 409) {
            const data = await res.json().catch(() => null);
            if (data?.lesson) {
              applyLessonConflict(data.lesson as Lesson, { syncTeacherText: true });
            }
            return "conflict";
          }
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.log("[lesson teacher_note autosave] PATCH failed", res.status, errBody);
            return "fail";
          }
          const data = await res.json().catch(() => null);
          if (data?.lesson) {
            const row = data.lesson as Lesson;
            lessonSyncVersionRef.current = row.updated_at ?? null;
            setLesson(row);
          }
          return "ok";
        } catch (e) {
          console.log("[lesson teacher_note autosave] network error", e);
          return "fail";
        }
      };

      let outcome: "ok" | "fail" | "conflict" = "fail";
      try {
        outcome = await attempt();
        if (outcome === "fail") {
          await new Promise((r) => setTimeout(r, TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS));
          outcome = await attempt();
          if (outcome === "fail") console.log("[lesson teacher_note autosave] retry exhausted");
        }
      } finally {
        teacherNoteSaveInflightRef.current -= 1;
        if (teacherNoteSaveInflightRef.current <= 0) {
          teacherNoteSaveInflightRef.current = 0;
          if (outcome === "ok") bumpTeacherNoteStatus("saved");
          else if (outcome === "conflict") bumpTeacherNoteStatus("conflict");
          else bumpTeacherNoteStatus("error");
        }
      }
    },
    [lessonId, applyLessonConflict, bumpTeacherNoteStatus],
  );

  const debouncedSaveTeacherNote = useCallback(() => {
    if (!lessonId || !canEditTeacherNote) return;
    if (teacherNoteDebounceRef.current) clearTimeout(teacherNoteDebounceRef.current);
    teacherNoteDebounceRef.current = setTimeout(() => {
      teacherNoteDebounceRef.current = null;
      void saveTeacherNoteToServer(teacherNote);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
  }, [lessonId, teacherNote, canEditTeacherNote, saveTeacherNoteToServer]);

  const saveTopicToServer = useCallback(
    async (raw: string) => {
      if (!lessonId || !canEditTopic) return;
      const topic = raw.trim();

      topicSaveInflightRef.current += 1;
      bumpTopicStatus("saving");
      const attempt = async (): Promise<"ok" | "fail" | "conflict"> => {
        const if_lesson_updated_at = lessonSyncVersionRef.current;
        if (!if_lesson_updated_at) {
          console.log("[lesson topic autosave] missing lesson version (if_lesson_updated_at)");
          return "fail";
        }
        try {
          const token = await getToken();
          if (!token) {
            console.log("[lesson topic autosave] missing auth token");
            return "fail";
          }
          const res = await fetch(`/api/lessons/${lessonId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ if_lesson_updated_at, topic }),
          });
          if (res.status === 409) {
            const data = await res.json().catch(() => null);
            if (data?.lesson) {
              applyLessonConflict(data.lesson as Lesson, { syncTeacherText: true, syncStudentText: true });
            }
            return "conflict";
          }
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.log("[lesson topic autosave] PATCH failed", res.status, errBody);
            return "fail";
          }
          const data = await res.json().catch(() => null);
          if (data?.lesson) {
            const row = data.lesson as Lesson;
            lessonSyncVersionRef.current = row.updated_at ?? null;
            setLesson(row);
            setTopicField(row.topic ?? "");
          }
          return "ok";
        } catch (e) {
          console.log("[lesson topic autosave] network error", e);
          return "fail";
        }
      };

      let outcome: "ok" | "fail" | "conflict" = "fail";
      try {
        outcome = await attempt();
        if (outcome === "fail") {
          await new Promise((r) => setTimeout(r, TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS));
          outcome = await attempt();
          if (outcome === "fail") console.log("[lesson topic autosave] retry exhausted");
        }
      } finally {
        topicSaveInflightRef.current -= 1;
        if (topicSaveInflightRef.current <= 0) {
          topicSaveInflightRef.current = 0;
          if (outcome === "ok") bumpTopicStatus("saved");
          else if (outcome === "conflict") bumpTopicStatus("conflict");
          else bumpTopicStatus("error");
        }
      }
    },
    [lessonId, canEditTopic, applyLessonConflict, bumpTopicStatus],
  );

  const debouncedSaveTopic = useCallback(() => {
    if (!lessonId || !canEditTopic) return;
    if (topicDebounceRef.current) clearTimeout(topicDebounceRef.current);
    topicDebounceRef.current = setTimeout(() => {
      topicDebounceRef.current = null;
      void saveTopicToServer(topicField);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
  }, [lessonId, topicField, canEditTopic, saveTopicToServer]);

  const saveIrregularVerbsToServer = useCallback(
    async (raw: string) => {
      if (!lessonId || !canEditTopic) return;

      irregularVerbsSaveInflightRef.current += 1;
      bumpIrregularVerbsStatus("saving");
      const attempt = async (): Promise<"ok" | "fail" | "conflict"> => {
        const if_lesson_updated_at = lessonSyncVersionRef.current;
        if (!if_lesson_updated_at) {
          return "fail";
        }
        try {
          const token = await getToken();
          if (!token) return "fail";
          const res = await fetch(`/api/lessons/${lessonId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ if_lesson_updated_at, irregular_verbs: raw }),
          });
          if (res.status === 409) {
            setIrregularVerbsSaveFeedback(null);
            const data = await res.json().catch(() => null);
            if (data?.lesson) {
              applyLessonConflict(data.lesson as Lesson, { syncTeacherText: true, syncStudentText: true });
            }
            return "conflict";
          }
          if (!res.ok) {
            setIrregularVerbsSaveFeedback(null);
            return "fail";
          }
          const data = await res.json().catch(() => null);
          if (data?.lesson) {
            const row = data.lesson as Lesson;
            lessonSyncVersionRef.current = row.updated_at ?? null;
            setLesson(row);
            setIrregularVerbsField(row.irregular_verbs ?? "");
            setTopicField(row.topic ?? "");
            if (Array.isArray(data.saved_verbs) && Array.isArray(data.ignored_verbs)) {
              setIrregularVerbsSaveFeedback({
                saved: data.saved_verbs as string[],
                ignored: data.ignored_verbs as string[],
              });
            } else {
              setIrregularVerbsSaveFeedback(null);
            }
          }
          return "ok";
        } catch {
          return "fail";
        }
      };

      let outcome: "ok" | "fail" | "conflict" = "fail";
      try {
        outcome = await attempt();
        if (outcome === "fail") {
          await new Promise((r) => setTimeout(r, TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS));
          outcome = await attempt();
        }
      } finally {
        irregularVerbsSaveInflightRef.current -= 1;
        if (irregularVerbsSaveInflightRef.current <= 0) {
          irregularVerbsSaveInflightRef.current = 0;
          if (outcome === "ok") bumpIrregularVerbsStatus("saved");
          else if (outcome === "conflict") bumpIrregularVerbsStatus("conflict");
          else bumpIrregularVerbsStatus("error");
        }
      }
    },
    [lessonId, canEditTopic, applyLessonConflict, bumpIrregularVerbsStatus],
  );

  const debouncedSaveIrregularVerbs = useCallback(() => {
    if (!lessonId || !canEditTopic) return;
    if (irregularVerbsDebounceRef.current) clearTimeout(irregularVerbsDebounceRef.current);
    irregularVerbsDebounceRef.current = setTimeout(() => {
      irregularVerbsDebounceRef.current = null;
      void saveIrregularVerbsToServer(irregularVerbsField);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
  }, [lessonId, irregularVerbsField, canEditTopic, saveIrregularVerbsToServer]);

  const saveLessonDateToServer = useCallback(
    async (iso: string) => {
      if (!lessonId || !lesson || !canManageLesson) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      if (iso === lesson.lesson_date) return;

      lessonDateSaveInflightRef.current += 1;
      try {
        const if_lesson_updated_at = lessonSyncVersionRef.current;
        if (!if_lesson_updated_at) return;
        const token = await getToken();
        if (!token) {
          setError("Musisz być zalogowany.");
          return;
        }
        const res = await fetch(`/api/lessons/${lessonId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ if_lesson_updated_at, lesson_date: iso }),
        });
        if (res.status === 409) {
          const data = await res.json().catch(() => null);
          if (data?.lesson) {
            applyLessonConflict(data.lesson as Lesson, { syncTeacherText: true, syncStudentText: true });
          }
          return;
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          setError((errBody as { error?: string }).error || "Nie udało się zmienić daty.");
          return;
        }
        setError("");
        const data = await res.json().catch(() => null);
        if (data?.lesson) {
          const row = data.lesson as Lesson;
          lessonSyncVersionRef.current = row.updated_at ?? null;
          setLesson(row);
          setLessonDateField(row.lesson_date ?? "");
        }
      } catch {
        setError("Nie udało się zmienić daty.");
      } finally {
        lessonDateSaveInflightRef.current -= 1;
      }
    },
    [lessonId, lesson, canManageLesson, applyLessonConflict],
  );

  const debouncedSaveLessonDate = useCallback(
    (iso: string) => {
      if (!lessonId || !canManageLesson) return;
      if (lessonDateDebounceRef.current) clearTimeout(lessonDateDebounceRef.current);
      lessonDateDebounceRef.current = setTimeout(() => {
        lessonDateDebounceRef.current = null;
        void saveLessonDateToServer(iso);
      }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
    },
    [lessonId, canManageLesson, saveLessonDateToServer],
  );

  const handleDeleteLesson = useCallback(async () => {
    if (!lessonId || !canManageLesson) return;
    if (!window.confirm("Usunąć lekcję? Tego nie da się cofnąć.")) return;
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        setError("Musisz być zalogowany.");
        return;
      }
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError((errBody as { error?: string }).error || "Nie udało się usunąć lekcji.");
        return;
      }
      router.push("/app/lessons");
    } catch {
      setError("Nie udało się usunąć lekcji.");
    }
  }, [lessonId, canManageLesson, router]);

  const saveStudentNoteToServer = useCallback(
    async (raw: string) => {
      if (!lessonId) return;
      const trimmed = raw.trim();
      const student_note = trimmed.length === 0 ? null : trimmed;

      studentNoteSaveInflightRef.current += 1;
      bumpStudentNoteStatus("saving");
      let outcome: "ok" | "fail" | "conflict" = "fail";
      try {
        const if_lesson_updated_at = lessonSyncVersionRef.current;
        if (!if_lesson_updated_at) {
          outcome = "fail";
        } else {
          const token = await getToken();
          if (!token) {
            outcome = "fail";
          } else {
            const res = await fetch(`/api/lessons/${lessonId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ if_lesson_updated_at, student_note }),
            });
            if (res.status === 409) {
              const data = await res.json().catch(() => null);
              if (data?.lesson) {
                applyLessonConflict(data.lesson as Lesson, {
                  syncTeacherText: true,
                  syncStudentText: true,
                });
              }
              outcome = "conflict";
            } else if (!res.ok) {
              outcome = "fail";
            } else {
              const data = await res.json().catch(() => null);
              if (data?.lesson) {
                const row = data.lesson as Lesson;
                lessonSyncVersionRef.current = row.updated_at ?? null;
                setLesson(row);
              }
              outcome = "ok";
            }
          }
        }
      } catch {
        outcome = "fail";
      } finally {
        studentNoteSaveInflightRef.current -= 1;
        if (studentNoteSaveInflightRef.current <= 0) {
          studentNoteSaveInflightRef.current = 0;
          if (outcome === "ok") bumpStudentNoteStatus("saved");
          else if (outcome === "conflict") bumpStudentNoteStatus("conflict");
          else bumpStudentNoteStatus("error");
        }
      }
    },
    [lessonId, applyLessonConflict, bumpStudentNoteStatus],
  );

  const debouncedSaveStudentNote = useCallback(() => {
    if (!lessonId || !canEditStudentNote) return;
    if (studentNoteDebounceRef.current) clearTimeout(studentNoteDebounceRef.current);
    studentNoteDebounceRef.current = setTimeout(() => {
      studentNoteDebounceRef.current = null;
      void saveStudentNoteToServer(studentNote);
    }, LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS);
  }, [lessonId, studentNote, canEditStudentNote, saveStudentNoteToServer]);

  useEffect(() => {
    if (!lessonId) return;
    if (!initialTeacherNoteSaveSkippedRef.current) {
      initialTeacherNoteSaveSkippedRef.current = true;
      return;
    }
    debouncedSaveTeacherNote();
    return () => {
      if (teacherNoteDebounceRef.current) clearTimeout(teacherNoteDebounceRef.current);
    };
  }, [teacherNote, debouncedSaveTeacherNote, lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    if (!initialStudentNoteSaveSkippedRef.current) {
      initialStudentNoteSaveSkippedRef.current = true;
      return;
    }
    debouncedSaveStudentNote();
    return () => {
      if (studentNoteDebounceRef.current) clearTimeout(studentNoteDebounceRef.current);
    };
  }, [studentNote, debouncedSaveStudentNote, lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    if (!initialTopicSaveSkippedRef.current) {
      initialTopicSaveSkippedRef.current = true;
      return;
    }
    debouncedSaveTopic();
    return () => {
      if (topicDebounceRef.current) clearTimeout(topicDebounceRef.current);
    };
  }, [topicField, debouncedSaveTopic, lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    if (!initialIrregularVerbsSaveSkippedRef.current) {
      initialIrregularVerbsSaveSkippedRef.current = true;
      return;
    }
    debouncedSaveIrregularVerbs();
    return () => {
      if (irregularVerbsDebounceRef.current) clearTimeout(irregularVerbsDebounceRef.current);
    };
  }, [irregularVerbsField, debouncedSaveIrregularVerbs, lessonId]);

  useEffect(() => {
    return () => {
      if (lessonDateDebounceRef.current) clearTimeout(lessonDateDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const pid = profile?.id;
    const studentId = lesson?.student_id;
    const createdById = lesson?.created_by;
    const shouldPollTeacherNoteForStudent =
      Boolean(pid && studentId && createdById) && pid === studentId && pid !== createdById;

    if (!lessonId || loading || !lesson?.id || !shouldPollTeacherNoteForStudent) return;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      if (
        studentNoteSaveInflightRef.current > 0 ||
        topicSaveInflightRef.current > 0 ||
        lessonDateSaveInflightRef.current > 0
      )
        return;
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`/api/lessons/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = (await res.json().catch(() => null)) as { lesson?: Lesson } | null;
        const row = body?.lesson;
        if (!row?.updated_at) return;
        if (row.updated_at === lessonSyncVersionRef.current) return;

        lessonSyncVersionRef.current = row.updated_at;
        setLesson((prev) =>
          prev
            ? {
                ...prev,
                teacher_note: row.teacher_note ?? null,
                topic: row.topic ?? prev.topic,
                lesson_date: row.lesson_date ?? prev.lesson_date,
                updated_at: row.updated_at,
              }
            : null,
        );
        setLessonDateField(row.lesson_date ?? "");
        setTeacherNote(row.teacher_note ?? "");
      } catch {
        /* ignore */
      }
    };

    const intervalId = window.setInterval(poll, STUDENT_LESSON_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [lessonId, loading, profile?.id, lesson?.id, lesson?.student_id, lesson?.created_by]);

  const [counterpartyLine, setCounterpartyLine] = useState<
    null | { label: "Uczeń" | "Nauczyciel"; name: string } | { solo: true }
  >(null);

  useEffect(() => {
    if (!lesson || !profile) {
      setCounterpartyLine(null);
      return;
    }

    const solo = lesson.student_id === lesson.created_by;
    if (solo && lesson.student_id === profile.id) {
      setCounterpartyLine({ solo: true });
      return;
    }

    let otherId: string | null = null;
    let label: "Uczeń" | "Nauczyciel" | null = null;

    if (profile.id === lesson.created_by && lesson.student_id !== profile.id) {
      otherId = lesson.student_id;
      label = "Uczeń";
    } else if (profile.id === lesson.student_id && lesson.created_by !== profile.id) {
      otherId = lesson.created_by;
      label = "Nauczyciel";
    }

    if (!otherId || !label) {
      setCounterpartyLine(null);
      return;
    }

    let cancelled = false;
    void supabase
      .from("profiles")
      .select("username, email")
      .eq("id", otherId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) {
          if (!cancelled) {
            const fallback = "Nie udało się wczytać profilu";
            setCounterpartyLine({ label, name: fallback });
          }
          return;
        }
        const u = (data?.username ?? "").trim();
        const e = (data?.email ?? "").trim();
        const name = u || (e ? (e.includes("@") ? e.split("@")[0]! : e) : "Użytkownik");
        if (!cancelled) setCounterpartyLine({ label, name });
      });

    return () => {
      cancelled = true;
    };
  }, [lesson, profile]);

  const lessonIrregularVerbsDisplay = useMemo(() => {
    const raw = lesson?.irregular_verbs;
    if (typeof raw !== "string" || !raw.trim()) return [] as string[];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [lesson?.irregular_verbs]);

  const showLessonIrregularVerbsPracticeBar = lessonIrregularVerbsDisplay.length > 0;

  if (loading) {
    return (
      <main className="mx-auto flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
        <div className={`${cardBase} flex min-h-0 flex-1 animate-pulse flex-col`}>
          <div className="mb-3 h-3 w-40 rounded bg-slate-200" />
          <div className="min-h-0 flex-1 rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="mx-auto flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
          <p className="text-sm text-rose-700">Nie znaleziono lekcji.</p>
          <Link
            href="/app/lessons"
            className="mt-2 inline-block text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            ← Wróć do kalendarza
          </Link>
        </div>
      </main>
    );
  }

  const teacherNoteStatusLabel = lessonNoteStatusText(teacherNoteStatus);
  const studentNoteStatusLabel = lessonNoteStatusText(studentNoteStatus);
  const topicStatusLabel = lessonNoteStatusText(topicStatus);
  const irregularVerbsStatusLabel = lessonNoteStatusText(irregularVerbsStatus);
  const dateLine = formatPolishDate(lesson.lesson_date ?? "");
  const showPracticeSection =
    showLessonIrregularVerbsPracticeBar || assignments.length > 0;

  return (
    <main className="mx-auto flex h-[calc(100dvh-8.5rem)] max-h-[calc(100dvh-8.5rem)] w-full max-w-4xl flex-col gap-2 min-h-0">
      <header className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <Link
              href="/app/lessons"
              className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
            >
              ← Wróć do kalendarza
            </Link>
            <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">{dateLine}</h1>
            {counterpartyLine?.solo ? (
              <p className="mt-1.5 text-xs text-slate-500">Lekcja osobista</p>
            ) : counterpartyLine && "label" in counterpartyLine ? (
              <p className="mt-1.5 text-sm text-slate-700">
                <span className="font-medium text-slate-500">{counterpartyLine.label}:</span>{" "}
                <span className="font-semibold text-slate-900">{counterpartyLine.name}</span>
              </p>
            ) : null}
          </div>
          {canManageLesson ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
              <label className="flex items-center gap-1.5 text-sm font-normal text-slate-600">
                <span className="whitespace-nowrap transition-colors duration-150 ease-out decoration-slate-400/80 underline-offset-[3px] hover:text-slate-800 hover:underline">
                  Zmień datę
                </span>
                <input
                  type="date"
                  className="rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-sm font-normal text-slate-800 transition-colors duration-150 ease-out focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900/10"
                  value={lessonDateField}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLessonDateField(v);
                    debouncedSaveLessonDate(v);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => void handleDeleteLesson()}
                className="text-sm font-normal text-slate-600 underline decoration-slate-400/70 underline-offset-[3px] transition-[color,text-decoration-color] duration-150 ease-out hover:text-rose-700 hover:decoration-rose-600/80"
              >
                Usuń lekcję
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
              <label htmlFor="lesson-topic" className="text-[11px] font-medium text-slate-400">
                Temat lekcji
              </label>
              {canEditTopic && topicStatusLabel ? (
                <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                  {topicStatusLabel}
                </span>
              ) : null}
            </div>
            {canEditTopic ? (
              <input
                id="lesson-topic"
                type="text"
                className={topicInputClass}
                value={topicField}
                onChange={(e) => setTopicField(e.target.value)}
                placeholder="Wpisz temat lekcji"
                autoComplete="off"
                aria-busy={topicStatus === "saving"}
              />
            ) : (
              <div
                id="lesson-topic-readonly"
                className="min-w-0 truncate rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                {(lesson.topic ?? "").trim() ? lesson.topic : "—"}
              </div>
            )}
          </div>

          {canEditTopic ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
                <label htmlFor="lesson-irregular-verbs" className="text-[11px] font-medium text-slate-400">
                  Powtórka z lekcji
                </label>
                {irregularVerbsStatusLabel ? (
                  <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                    {irregularVerbsStatusLabel}
                  </span>
                ) : null}
              </div>
              <input
                id="lesson-irregular-verbs"
                type="text"
                className={topicInputClass}
                value={irregularVerbsField}
                onChange={(e) => {
                  setIrregularVerbsSaveFeedback(null);
                  setIrregularVerbsField(e.target.value);
                }}
                placeholder="np. be, make, take"
                autoComplete="off"
                aria-busy={irregularVerbsStatus === "saving"}
              />
              {irregularVerbsSaveFeedback &&
              (irregularVerbsSaveFeedback.saved.length > 0 ||
                irregularVerbsSaveFeedback.ignored.length > 0) ? (
                <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {irregularVerbsSaveFeedback.saved.length > 0 &&
                  irregularVerbsSaveFeedback.ignored.length === 0 ? (
                    <p>✔ Dodano: {irregularVerbsSaveFeedback.saved.join(", ")}</p>
                  ) : null}
                  {irregularVerbsSaveFeedback.saved.length > 0 &&
                  irregularVerbsSaveFeedback.ignored.length > 0 ? (
                    <>
                      <p>✔ Dodano: {irregularVerbsSaveFeedback.saved.join(", ")}</p>
                      <p>⚠ Pominięto: {irregularVerbsSaveFeedback.ignored.join(", ")}</p>
                    </>
                  ) : null}
                  {irregularVerbsSaveFeedback.saved.length === 0 &&
                  irregularVerbsSaveFeedback.ignored.length > 0 ? (
                    <p>⚠ Nie znaleziono żadnych czasowników</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="shrink-0 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3 py-2">
          <p className="text-xs leading-snug text-rose-700">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {canCreateLessonAssignments ? (
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200/60 pb-2.5">
          <span className="text-sm text-slate-600">Dodaj do przećwiczenia:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={assignmentAddBusy}
              onClick={() => {
                setAssignmentAddKind("pack");
                setAssignmentAddSlug("");
              }}
              className={`rounded-md border px-2 py-0.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                assignmentAddKind === "pack"
                  ? "border-slate-400 bg-slate-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Pack
            </button>
            <button
              type="button"
              disabled={assignmentAddBusy}
              onClick={() => {
                setAssignmentAddKind("cluster");
                setAssignmentAddSlug("");
              }}
              className={`rounded-md border px-2 py-0.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                assignmentAddKind === "cluster"
                  ? "border-slate-400 bg-slate-50 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Cluster
            </button>
          </div>
          {assignmentAddKind ? (
            <form
              onSubmit={(ev) => void submitNewAssignment(ev)}
              className="flex min-w-0 flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={assignmentAddSlug}
                onChange={(ev) => setAssignmentAddSlug(ev.target.value)}
                placeholder={
                  assignmentAddKind === "pack" ? "np. business-vocab" : "np. hear-vs-listen"
                }
                autoComplete="off"
                disabled={assignmentAddBusy}
                className="min-w-[10rem] max-w-[16rem] flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900/10 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={assignmentAddBusy || !assignmentAddSlug.trim()}
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {assignmentAddBusy ? "…" : "Dodaj"}
              </button>
              <button
                type="button"
                disabled={assignmentAddBusy}
                onClick={() => {
                  setAssignmentAddKind(null);
                  setAssignmentAddSlug("");
                }}
                className="rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                Anuluj
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="grid min-h-[13.5rem] min-w-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2 lg:items-stretch">
        <section
          className={`${cardNote} flex min-h-[13.5rem] flex-col lg:min-h-0 lg:h-full`}
        >
          <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Nauczyciel</h2>
            </div>
            {canEditTeacherNote && teacherNoteStatusLabel ? (
              <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                {teacherNoteStatusLabel}
              </span>
            ) : null}
          </div>
          {canEditTeacherNote ? (
            <textarea
              id="lesson-teacher-note"
              className="min-h-0 max-h-full w-full max-w-full flex-1 resize-none overflow-y-auto rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              placeholder={NOTE_FIELD_PLACEHOLDER}
              aria-busy={teacherNoteStatus === "saving"}
            />
          ) : (
            <div
              id="lesson-teacher-note"
              className="min-h-0 max-h-full flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
            >
              {teacherNote.trim() ? (
                teacherNote
              ) : (
                <span className="text-slate-400">{NOTE_FIELD_PLACEHOLDER}</span>
              )}
            </div>
          )}
        </section>

        <section
          className={`${cardNote} flex min-h-[13.5rem] flex-col lg:min-h-0 lg:h-full`}
        >
          <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Twoja notatka</h2>
            </div>
            {canEditStudentNote && studentNoteStatusLabel ? (
              <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                {studentNoteStatusLabel}
              </span>
            ) : null}
          </div>
          {canEditStudentNote ? (
            <textarea
              id="lesson-student-note"
              className="min-h-0 max-h-full w-full max-w-full flex-1 resize-none overflow-y-auto rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={studentNote}
              onChange={(e) => setStudentNote(e.target.value)}
              placeholder={NOTE_FIELD_PLACEHOLDER}
              aria-busy={studentNoteStatus === "saving"}
            />
          ) : (
            <div
              id="lesson-student-note"
              className="min-h-0 max-h-full flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800"
            >
              {studentNote.trim() ? (
                studentNote
              ) : (
                <span className="text-slate-400">{NOTE_FIELD_PLACEHOLDER}</span>
              )}
            </div>
          )}
        </section>
        </div>
      </div>

      {showPracticeSection ? (
        <section className="shrink-0 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="space-y-3">
            {showLessonIrregularVerbsPracticeBar ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Czasowniki do przećwiczenia
                </p>
                <p className="overflow-x-auto text-sm font-medium tracking-wide text-slate-800 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {lessonIrregularVerbsDisplay.join(" · ")}
                </p>
                <Link
                  href={`/app/irregular?lessonVerbs=${encodeURIComponent(lessonIrregularVerbsDisplay.join(","))}`}
                  className="inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                >
                  Przećwicz
                </Link>
              </div>
            ) : null}

            {assignments.length > 0 ? (
              <div
                className={
                  showLessonIrregularVerbsPracticeBar ? "border-t border-slate-200/80 pt-3" : ""
                }
              >
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Do przećwiczenia
                </h3>
                <ul className="space-y-0.5" role="list">
                  {assignments.map((a) => (
                    <li key={a.id}>
                      <Link href={assignmentTrainingHref(a)} className={assignmentLinkMotion}>
                        <span aria-hidden>→</span> {assignmentDisplayLabel(a)}
                        {a.status === "done" ? (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">✓</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
