"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import type { Lesson } from "@/lib/lessons/types";
import {
  LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS,
  STUDENT_LESSON_POLL_INTERVAL_MS,
  TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS,
} from "@/lib/lessons/constants";
import {
  encodeLessonVocabPairsForQuery,
  parseLessonVocabPairsInput,
  parseLessonVocabPairsStored,
} from "@/lib/lessons/vocabPairs";

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

const modalFieldClass =
  "w-full rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm leading-relaxed text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5";

function mergeIrregularVerbsAppend(existingRaw: string | null | undefined, newInput: string): string {
  const existing = (existingRaw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set(existing.map((v) => v.toLowerCase()));
  const nextTokens = newInput
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...existing];
  for (const t of nextTokens) {
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(t);
    }
  }
  return merged.join(", ");
}

function appendLessonVocabPairLine(
  existingRaw: string | null | undefined,
  en: string,
  pl: string,
): string {
  const line = `${en.trim()} - ${pl.trim()}`;
  const base = (existingRaw ?? "").trim();
  if (!base) return line;
  return `${base}\n${line}`;
}

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
  const [topicField, setTopicField] = useState("");
  const [addContentModal, setAddContentModal] = useState<null | "irregular" | "vocab">(null);
  const [irregularModalDraft, setIrregularModalDraft] = useState("");
  const [vocabModalEn, setVocabModalEn] = useState("");
  const [vocabModalPl, setVocabModalPl] = useState("");
  const [modalIrregularError, setModalIrregularError] = useState<string | null>(null);
  const [modalVocabError, setModalVocabError] = useState<string | null>(null);
  const [irregularVerbsSaveFeedback, setIrregularVerbsSaveFeedback] = useState<{
    saved: string[];
    ignored: string[];
  } | null>(null);
  const [teacherNote, setTeacherNote] = useState("");
  const [studentNote, setStudentNote] = useState("");

  const topicDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicSaveInflightRef = useRef(0);
  const irregularVerbsSaveInflightRef = useRef(0);
  const vocabPairsSaveInflightRef = useRef(0);
  const initialTopicSaveSkippedRef = useRef(false);

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
  const [vocabPairsStatus, setVocabPairsStatus] = useState<LessonNoteSaveStatus>("idle");
  const teacherNoteStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentNoteStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const irregularVerbsStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vocabPairsStatusClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    setLesson(lessonData.lesson);
    setTopicField(lessonData.lesson.topic ?? "");
    setLessonDateField(lessonData.lesson.lesson_date ?? "");
    setTeacherNote(lessonData.lesson.teacher_note ?? "");
    setStudentNote(lessonData.lesson.student_note ?? "");
    lessonSyncVersionRef.current = lessonData.lesson.updated_at ?? null;
  };

  const loadAssignments = useCallback(async () => {
    if (!lessonId) {
      setAssignments([]);
      return;
    }
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
    }
  }, [lessonId]);

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
  const isSelfLesson = lesson?.lesson_type === "self";

  const canEditTeacherNote = (isAdminOverride || isLessonTeacher) && !isSelfLesson;
  const canEditStudentNote = isAdminOverride || isLessonStudent;
  const canEditTopic = isAdminOverride || isLessonTeacher;
  /** Date / delete: author or admin only — not enrolled student on a teacher-led lesson. */
  const canManageLesson = isAdminOverride || isLessonTeacher;

  const applyLessonConflict = useCallback(
    (row: Lesson, opts: { syncTeacherText?: boolean; syncStudentText?: boolean }) => {
      lessonSyncVersionRef.current = row.updated_at ?? null;
      setLesson(row);
      setTopicField(row.topic ?? "");
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

  const bumpVocabPairsStatus = useCallback((next: LessonNoteSaveStatus) => {
    if (vocabPairsStatusClearRef.current) {
      clearTimeout(vocabPairsStatusClearRef.current);
      vocabPairsStatusClearRef.current = null;
    }
    setVocabPairsStatus(next);
    if (next === "saved") {
      vocabPairsStatusClearRef.current = setTimeout(() => {
        vocabPairsStatusClearRef.current = null;
        setVocabPairsStatus((s) => (s === "saved" ? "idle" : s));
      }, NOTE_STATUS_SAVED_CLEAR_MS);
    } else if (next === "conflict") {
      vocabPairsStatusClearRef.current = setTimeout(() => {
        vocabPairsStatusClearRef.current = null;
        setVocabPairsStatus((s) => (s === "conflict" ? "idle" : s));
      }, NOTE_STATUS_CONFLICT_CLEAR_MS);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (teacherNoteStatusClearRef.current) clearTimeout(teacherNoteStatusClearRef.current);
      if (studentNoteStatusClearRef.current) clearTimeout(studentNoteStatusClearRef.current);
      if (topicStatusClearRef.current) clearTimeout(topicStatusClearRef.current);
      if (irregularVerbsStatusClearRef.current) clearTimeout(irregularVerbsStatusClearRef.current);
      if (vocabPairsStatusClearRef.current) clearTimeout(vocabPairsStatusClearRef.current);
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
    async (raw: string): Promise<"ok" | "fail" | "conflict"> => {
      if (!lessonId || !canEditTopic) return "fail";

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
      return outcome;
    },
    [lessonId, canEditTopic, applyLessonConflict, bumpIrregularVerbsStatus],
  );

  const saveVocabPairsToServer = useCallback(
    async (raw: string): Promise<"ok" | "fail" | "conflict" | "format"> => {
      if (!lessonId || !canEditTopic) return "fail";

      vocabPairsSaveInflightRef.current += 1;
      bumpVocabPairsStatus("saving");
      const attempt = async (): Promise<"ok" | "fail" | "conflict" | "format"> => {
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
            body: JSON.stringify({ if_lesson_updated_at, vocab_pairs: raw }),
          });
          if (res.status === 409) {
            const data = await res.json().catch(() => null);
            if (data?.lesson) {
              applyLessonConflict(data.lesson as Lesson, { syncTeacherText: true, syncStudentText: true });
            }
            return "conflict";
          }
          if (res.status === 400) {
            return "format";
          }
          if (!res.ok) {
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
        } catch {
          return "fail";
        }
      };

      let outcome: "ok" | "fail" | "conflict" | "format" = "fail";
      try {
        outcome = await attempt();
        if (outcome === "fail") {
          await new Promise((r) => setTimeout(r, TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS));
          outcome = await attempt();
        }
      } finally {
        vocabPairsSaveInflightRef.current -= 1;
        if (vocabPairsSaveInflightRef.current <= 0) {
          vocabPairsSaveInflightRef.current = 0;
          if (outcome === "ok") bumpVocabPairsStatus("saved");
          else if (outcome === "conflict") bumpVocabPairsStatus("conflict");
          else if (outcome === "format") bumpVocabPairsStatus("idle");
          else bumpVocabPairsStatus("error");
        }
      }
      return outcome;
    },
    [lessonId, canEditTopic, applyLessonConflict, bumpVocabPairsStatus],
  );

  const closeAddContentModal = useCallback(() => {
    setAddContentModal(null);
    setIrregularModalDraft("");
    setVocabModalEn("");
    setVocabModalPl("");
    setModalIrregularError(null);
    setModalVocabError(null);
  }, []);

  const handleIrregularModalSave = useCallback(async () => {
    if (!lesson) return;
    setModalIrregularError(null);
    const draft = irregularModalDraft.trim();
    if (!draft) {
      setModalIrregularError("Wpisz co najmniej jeden czasownik.");
      return;
    }
    const merged = mergeIrregularVerbsAppend(lesson.irregular_verbs, draft);
    const outcome = await saveIrregularVerbsToServer(merged);
    if (outcome === "ok" || outcome === "conflict") {
      closeAddContentModal();
    }
  }, [lesson, irregularModalDraft, saveIrregularVerbsToServer, closeAddContentModal]);

  const handleVocabModalSave = useCallback(async () => {
    if (!lesson) return;
    setModalVocabError(null);
    const en = vocabModalEn.trim();
    const pl = vocabModalPl.trim();
    if (!en || !pl) {
      setModalVocabError("Uzupełnij oba pola.");
      return;
    }
    const merged = appendLessonVocabPairLine(lesson.vocab_pairs, en, pl);
    const parsed = parseLessonVocabPairsInput(merged);
    if (!parsed.ok) {
      setModalVocabError("Błąd w sposobie zapisu");
      return;
    }
    const raw = parsed.stored ?? merged;
    const outcome = await saveVocabPairsToServer(raw);
    if (outcome === "format") {
      setModalVocabError("Błąd w sposobie zapisu");
      return;
    }
    if (outcome === "ok" || outcome === "conflict") {
      closeAddContentModal();
    }
  }, [lesson, vocabModalEn, vocabModalPl, saveVocabPairsToServer, closeAddContentModal]);

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
    if (!addContentModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAddContentModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addContentModal, closeAddContentModal]);

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
                lesson_type: row.lesson_type ?? prev.lesson_type,
                teacher_note: row.teacher_note ?? null,
                topic: row.topic ?? prev.topic,
                lesson_date: row.lesson_date ?? prev.lesson_date,
                irregular_verbs: row.irregular_verbs ?? prev.irregular_verbs,
                vocab_pairs: row.vocab_pairs ?? prev.vocab_pairs,
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

    const soloSelf =
      lesson.lesson_type === "self" ||
      (lesson.lesson_type == null && lesson.student_id === lesson.created_by);
    if (soloSelf && lesson.student_id === profile.id) {
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

  const lessonVocabPairsDisplay = useMemo(
    () => parseLessonVocabPairsStored(lesson?.vocab_pairs),
    [lesson?.vocab_pairs],
  );

  if (loading) {
    return (
      <main className="mx-auto flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
        <div className={`${cardBase} flex min-h-0 flex-1 animate-pulse flex-col`}>
          <div className="mb-3 h-3 w-40 rounded bg-slate-200" />
          <div className="min-h-0 flex-1 rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="mx-auto flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] w-full max-w-4xl flex-col gap-3 min-h-0">
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
  const vocabPairsStatusLabel = lessonNoteStatusText(vocabPairsStatus);
  const dateLine = formatPolishDate(lesson.lesson_date ?? "");
  const showPracticeSection = assignments.length > 0;

  return (
    <main className="mx-auto flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] w-full max-w-4xl flex-col gap-2 min-h-0">
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
            {counterpartyLine && "solo" in counterpartyLine ? (
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch md:gap-x-4">
            <div className={`${cardBase} flex min-w-0 flex-col`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                  Czasowniki nieregularne
                </h3>
                {canEditTopic && irregularVerbsStatusLabel ? (
                  <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                    {irregularVerbsStatusLabel}
                  </span>
                ) : null}
              </div>
              <div className="min-h-[3rem] flex-1">
                {lessonIrregularVerbsDisplay.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {lessonIrregularVerbsDisplay.map((v, i) => (
                      <span
                        key={`${i}-${v}`}
                        className="inline-flex max-w-full truncate rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Brak wpisów</p>
                )}
              </div>
              {irregularVerbsSaveFeedback &&
              (irregularVerbsSaveFeedback.saved.length > 0 ||
                irregularVerbsSaveFeedback.ignored.length > 0) ? (
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
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
              <div className="mt-3 flex flex-wrap gap-2">
                {canEditTopic ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalIrregularError(null);
                      setIrregularModalDraft("");
                      setAddContentModal("irregular");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    + Dodaj
                  </button>
                ) : null}
                {lessonIrregularVerbsDisplay.length > 0 ? (
                  <Link
                    href={`/app/irregular?lessonVerbs=${encodeURIComponent(lessonIrregularVerbsDisplay.join(","))}&lessonId=${encodeURIComponent(lessonId)}`}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Przećwicz
                  </Link>
                ) : null}
              </div>
            </div>

            <div className={`${cardBase} flex min-w-0 flex-col`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Słownictwo</h3>
                {canEditTopic && vocabPairsStatusLabel ? (
                  <span className="text-[11px] font-medium text-slate-400" aria-live="polite">
                    {vocabPairsStatusLabel}
                  </span>
                ) : null}
              </div>
              {lessonVocabPairsDisplay.length > 0 ? (
                <ul
                  className="min-h-[3rem] flex-1 space-y-1 text-sm text-slate-800 [scrollbar-width:thin]"
                  role="list"
                >
                  {lessonVocabPairsDisplay.map((p, idx) => (
                    <li key={`${idx}-${p.source}`} className="leading-snug">
                      <span className="font-medium text-slate-900">{p.source}</span>
                      <span className="text-slate-400"> – </span>
                      <span className="text-slate-700">{p.target}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="min-h-[3rem] flex-1 text-xs text-slate-400">Brak wpisów</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {canEditTopic ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalVocabError(null);
                      setVocabModalEn("");
                      setVocabModalPl("");
                      setAddContentModal("vocab");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    + Dodaj
                  </button>
                ) : null}
                {lessonVocabPairsDisplay.length > 0 ? (
                  <Link
                    href={`/app/vocab/lesson?pairs=${encodeLessonVocabPairsForQuery(lessonVocabPairsDisplay)}&lessonId=${encodeURIComponent(lessonId)}`}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Przećwicz
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="grid min-h-[13.5rem] min-w-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2 lg:items-stretch">
        {!isSelfLesson ? (
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
        ) : null}

        <section
          className={`${cardNote} flex min-h-[13.5rem] flex-col lg:min-h-0 lg:h-full ${isSelfLesson ? "lg:col-span-2" : ""}`}
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
        </section>
      ) : null}

      {addContentModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-add-content-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Zamknij"
            onClick={closeAddContentModal}
          />
          <div className="relative flex max-h-[min(85dvh,32rem)] w-full max-w-md flex-col rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:shadow-xl">
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <h2
                id="lesson-add-content-title"
                className="text-base font-semibold tracking-tight text-slate-900"
              >
                {addContentModal === "irregular" ? "Dodaj czasowniki nieregularne" : "Dodaj słownictwo"}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {addContentModal === "irregular" ? (
                <div className="space-y-2">
                  <label htmlFor="lesson-add-irregular" className="block text-xs font-medium text-slate-500">
                    Czasowniki (przecinek lub nowa linia)
                  </label>
                  <textarea
                    id="lesson-add-irregular"
                    rows={5}
                    className={`${modalFieldClass} max-w-full resize-y`}
                    value={irregularModalDraft}
                    onChange={(e) => {
                      setModalIrregularError(null);
                      setIrregularModalDraft(e.target.value);
                    }}
                    placeholder={"np. be, make, take"}
                    autoComplete="off"
                    spellCheck={false}
                    aria-busy={irregularVerbsStatus === "saving"}
                  />
                  {modalIrregularError ? (
                    <p className="text-xs font-medium text-rose-600" role="alert">
                      {modalIrregularError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="lesson-add-vocab-en" className="block text-xs font-medium text-slate-500">
                      Angielski
                    </label>
                    <input
                      id="lesson-add-vocab-en"
                      type="text"
                      className={modalFieldClass}
                      value={vocabModalEn}
                      onChange={(e) => {
                        setModalVocabError(null);
                        setVocabModalEn(e.target.value);
                      }}
                      placeholder="np. go over"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lesson-add-vocab-pl" className="block text-xs font-medium text-slate-500">
                      Polski
                    </label>
                    <input
                      id="lesson-add-vocab-pl"
                      type="text"
                      className={modalFieldClass}
                      value={vocabModalPl}
                      onChange={(e) => {
                        setModalVocabError(null);
                        setVocabModalPl(e.target.value);
                      }}
                      placeholder="np. przejrzeć"
                      autoComplete="off"
                    />
                  </div>
                  {modalVocabError ? (
                    <p className="text-xs font-medium text-rose-600" role="alert">
                      {modalVocabError}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-4 py-3">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddContentModal}
                  disabled={
                    addContentModal === "irregular"
                      ? irregularVerbsStatus === "saving"
                      : vocabPairsStatus === "saving"
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => void (addContentModal === "irregular" ? handleIrregularModalSave() : handleVocabModalSave())}
                  disabled={
                    addContentModal === "irregular"
                      ? irregularVerbsStatus === "saving"
                      : vocabPairsStatus === "saving"
                  }
                  className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {addContentModal === "irregular"
                    ? irregularVerbsStatus === "saving"
                      ? "Zapisywanie…"
                      : "Zapisz"
                    : vocabPairsStatus === "saving"
                      ? "Zapisywanie…"
                      : "Zapisz"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
