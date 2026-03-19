"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, type Profile } from "@/lib/auth/profile";
import SenseSelectionModal from "@/app/app/vocab/SenseSelectionModal";

type Lesson = {
  id: string;
  lesson_date: string;
  topic: string;
  summary: string | null;
};

type LessonResource = {
  id: string;
  resource_type: "grammar" | "pack" | "cluster" | "irregular";
  resource_id: string;
  created_at?: string;
};

type TeacherComment = {
  id: string;
  teacher_id: string;
  content: string;
  created_at: string;
};

function formatLessonDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate + "T12:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [teacherComments, setTeacherComments] = useState<TeacherComment[]>([]);

  const [notesText, setNotesText] = useState("");
  const [homework, setHomework] = useState("");
  const [lessonDate, setLessonDate] = useState("");

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);

  const [resourceIdInput, setResourceIdInput] = useState("");
  const [savingResourceType, setSavingResourceType] = useState<LessonResource["resource_type"] | null>(null);

  const [vocabSearch, setVocabSearch] = useState("");
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [vocabSuccess, setVocabSuccess] = useState("");

  const [teacherCommentText, setTeacherCommentText] = useState("");
  const [addingTeacherComment, setAddingTeacherComment] = useState(false);

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
    const [lessonData, resourcesData, commentsData] = await Promise.all([
      fetchJsonWithAuth(`/api/lessons/${lessonId}`),
      fetchJsonWithAuth(`/api/lessons/${lessonId}/resources`),
      fetchJsonWithAuth(`/api/lessons/teacher-comment?lesson_id=${lessonId}`),
    ]);

    setLesson(lessonData.lesson);
    setNotesText(lessonData.lesson.topic ?? "");
    setHomework(lessonData.lesson.summary ?? "");
    setLessonDate(lessonData.lesson.lesson_date ?? "");
    setResources(resourcesData.resources ?? []);
    setTeacherComments(commentsData.comments ?? []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const p = await getOrCreateProfile();
        setProfile(p);
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
        setError("");
        await loadLesson();
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się odświeżyć lekcji.");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lessonId]);

  const debouncedSave = useCallback(() => {
    if (!lessonId || !lessonDate) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      saveDebounceRef.current = null;
      try {
        const token = await getToken();
        if (!token) return;
        await fetch(`/api/lessons/${lessonId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic: notesText.trim() || "",
            lesson_date: lessonDate,
            summary: homework.trim() || null,
          }),
        });
      } catch {
        // silent fail for auto-save
      }
    }, 600);
  }, [lessonId, lessonDate, notesText, homework]);

  useEffect(() => {
    if (!lessonId || !lessonDate) return;
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      return;
    }
    debouncedSave();
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [notesText, homework, debouncedSave, lessonId, lessonDate]);

  const addLinkedResource = async (resourceType: LessonResource["resource_type"]) => {
    if (!resourceIdInput.trim()) {
      setError("Podaj identyfikator zasobu (slug/id).");
      return;
    }

    try {
      setSavingResourceType(resourceType);
      setError("");
      await fetchJsonWithAuth("/api/lessons/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          resource_type: resourceType,
          resource_id: resourceIdInput.trim(),
        }),
      });

      const refreshed = await fetchJsonWithAuth(`/api/lessons/${lessonId}/resources`);
      setResources(refreshed.resources ?? []);
      setResourceIdInput("");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać zasobu.");
    } finally {
      setSavingResourceType(null);
    }
  };

  const openVocabSearch = () => {
    if (!vocabSearch.trim()) {
      setError("Wpisz słowo do wyszukania w leksykonie.");
      return;
    }
    setError("");
    setShowVocabModal(true);
  };

  const addTeacherComment = async () => {
    if (!teacherCommentText.trim()) return;
    try {
      setAddingTeacherComment(true);
      setError("");

      const data = await fetchJsonWithAuth("/api/lessons/teacher-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          content: teacherCommentText.trim(),
        }),
      });

      if (!data.ok) throw new Error(data.error || "Nie udało się dodać komentarza.");
      setTeacherCommentText("");
      setTeacherComments((prev) => [...prev, data.comment]);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać komentarza nauczyciela.");
    } finally {
      setAddingTeacherComment(false);
    }
  };


  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="text-sm text-slate-600">Ładuję lekcję…</div>
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
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Lekcja ({formatLessonDate(lessonDate)})
          </h1>
          <button
            type="button"
            onClick={() => router.push("/app/lessons/list")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            ← Wróć do listy
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 text-center">Notatki z lekcji</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <textarea
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 min-h-[120px]"
                rows={5}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Przestrzeń na luźne notatki..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 text-center">Praca domowa</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <textarea
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 min-h-[120px]"
                rows={5}
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Zadanie domowe po lekcji..."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Dodaj materiały z lekcji</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              placeholder="Słownictwo (np. improve)"
            />
            <button
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
              onClick={openVocabSearch}
            >
              Dodaj słownictwo z leksykonu
            </button>
          </div>
          {vocabSuccess ? <p className="text-sm text-emerald-600">{vocabSuccess}</p> : null}

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={resourceIdInput}
              onChange={(e) => setResourceIdInput(e.target.value)}
              placeholder="Id/slug zasobu (np. present-perfect, business-retail-daily)"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
                onClick={() => addLinkedResource("grammar")}
                disabled={savingResourceType !== null}
              >
                {savingResourceType === "grammar" ? "Dodaję…" : "Add grammar"}
              </button>
              <button
                className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
                onClick={() => addLinkedResource("pack")}
                disabled={savingResourceType !== null}
              >
                {savingResourceType === "pack" ? "Dodaję…" : "Add pack"}
              </button>
              <button
                className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
                onClick={() => addLinkedResource("cluster")}
                disabled={savingResourceType !== null}
              >
                {savingResourceType === "cluster" ? "Dodaję…" : "Add cluster"}
              </button>
            </div>
          </div>
        </div>

        {resources.length === 0 ? (
          <p className="text-sm text-slate-600">Brak dodanych materiałów.</p>
        ) : (
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">{resource.resource_type}</span> • {resource.resource_id}
              </li>
            ))}
          </ul>
        )}

        <SenseSelectionModal
          lemma={vocabSearch}
          isOpen={showVocabModal}
          onClose={() => setShowVocabModal(false)}
          onSelect={() => {
            setVocabSuccess("Słowo dodane do puli.");
            setTimeout(() => setVocabSuccess(""), 2200);
            setShowVocabModal(false);
            setVocabSearch("");
          }}
          onSelectCustom={() => {
            setVocabSuccess("Własne słowo dodane do puli.");
            setTimeout(() => setVocabSuccess(""), 2200);
            setShowVocabModal(false);
            setVocabSearch("");
          }}
          onSearchForm={(term) => setVocabSearch(term)}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Teacher comments</h2>
        {teacherComments.length === 0 ? (
          <p className="text-sm text-slate-600">No teacher comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {teacherComments.map((comment) => (
              <li key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-xs text-slate-500">{new Date(comment.created_at).toLocaleString()}</div>
                <div className="whitespace-pre-wrap text-sm text-slate-700">{comment.content}</div>
              </li>
            ))}
          </ul>
        )}

        {profile?.role === "admin" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <textarea
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              rows={3}
              value={teacherCommentText}
              onChange={(e) => setTeacherCommentText(e.target.value)}
              placeholder="Teacher comment..."
            />
            <button
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
              onClick={addTeacherComment}
              disabled={addingTeacherComment || !teacherCommentText.trim()}
            >
              {addingTeacherComment ? "Adding…" : "Add teacher comment"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Teacher comments can be added by teacher account.</p>
        )}
      </section>
    </main>
  );
}
