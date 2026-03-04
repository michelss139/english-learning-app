"use client";

import { useEffect, useState } from "react";
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

type LessonNote = {
  id: string;
  author_role: "student" | "admin";
  content: string;
  created_at: string;
};

type LessonTopic = {
  id: string;
  topic_type: "conversation" | "grammar" | "custom";
  topic_value: string;
  created_at?: string;
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

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const grammarTopics = [
    "Present Simple",
    "Present Continuous",
    "Present Perfect",
    "Past Simple",
    "Past Continuous",
    "Past Perfect",
    "Future forms",
    "Conditionals",
    "Modal verbs",
    "Passive voice",
    "Reported speech",
    "Gerund and infinitive",
    "Articles",
    "Prepositions",
    "Custom topic",
  ];

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [teacherComments, setTeacherComments] = useState<TeacherComment[]>([]);

  const [topic, setTopic] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [homework, setHomework] = useState("");

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [conversationCovered, setConversationCovered] = useState(false);
  const [selectedGrammarTopic, setSelectedGrammarTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [savingTopics, setSavingTopics] = useState(false);

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
    const [lessonData, topicsData, resourcesData, commentsData] = await Promise.all([
      fetchJsonWithAuth(`/api/lessons/${lessonId}`),
      fetchJsonWithAuth(`/api/lessons/${lessonId}/topics`),
      fetchJsonWithAuth(`/api/lessons/${lessonId}/resources`),
      fetchJsonWithAuth(`/api/lessons/teacher-comment?lesson_id=${lessonId}`),
    ]);

    setLesson(lessonData.lesson);
    setNotes(lessonData.notes ?? []);
    setTopic(lessonData.lesson.topic ?? "");
    setLessonDate(lessonData.lesson.lesson_date ?? "");
    setHomework(lessonData.lesson.summary ?? "");
    setTopics(topicsData.topics ?? []);
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
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim() || "",
          lesson_date: lessonDate,
          summary: homework.trim() || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się zapisać lekcji.");
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Nie udało się zapisać lekcji.");

      setLesson(data.lesson);
      setHomework(data.lesson.summary ?? "");
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
      const token = session.data.session?.access_token;
      if (!token) return;

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

  const addCoveredTopics = async () => {
    const requests: Array<{ topic_type: "conversation" | "grammar" | "custom"; topic_value: string }> = [];
    if (conversationCovered) {
      requests.push({ topic_type: "conversation", topic_value: "Conversation" });
    }
    if (selectedGrammarTopic) {
      if (selectedGrammarTopic === "Custom topic") {
        if (!customTopic.trim()) {
          setError("Wpisz własny temat gramatyczny.");
          return;
        }
        requests.push({ topic_type: "custom", topic_value: customTopic.trim() });
      } else {
        requests.push({ topic_type: "grammar", topic_value: selectedGrammarTopic });
      }
    }

    if (requests.length === 0) {
      setError("Wybierz przynajmniej jeden temat.");
      return;
    }

    try {
      setSavingTopics(true);
      setError("");

      for (const reqBody of requests) {
        await fetchJsonWithAuth("/api/lessons/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lesson_id: lessonId,
            ...reqBody,
          }),
        });
      }

      const refreshed = await fetchJsonWithAuth(`/api/lessons/${lessonId}/topics`);
      setTopics(refreshed.topics ?? []);
      setConversationCovered(false);
      setSelectedGrammarTopic("");
      setCustomTopic("");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zapisać tematów.");
    } finally {
      setSavingTopics(false);
    }
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Lekcja</h1>
            <div className="text-sm text-slate-600">Workflow nauczyciela po zajęciach</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveLesson}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              disabled={saving}
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/lessons/list")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              ← Wróć do listy
            </button>
          </div>
        </div>
      </header>

      {refreshing ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
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


      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Data</label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Temat</label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Temat lekcji"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Homework</label>
          <textarea
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            rows={3}
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder="Zadanie domowe po lekcji..."
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Topics covered</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={conversationCovered}
              onChange={(e) => setConversationCovered(e.target.checked)}
            />
            Conversation
          </label>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Grammar topics</label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              value={selectedGrammarTopic}
              onChange={(e) => setSelectedGrammarTopic(e.target.value)}
            >
              <option value="">Select topic</option>
              {grammarTopics.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {selectedGrammarTopic === "Custom topic" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Custom topic</label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. relative clauses"
              />
            </div>
          ) : null}

          <button
            className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
            onClick={addCoveredTopics}
            disabled={savingTopics}
          >
            {savingTopics ? "Saving…" : "Save topics"}
          </button>
        </div>

        {topics.length === 0 ? (
          <p className="text-sm text-slate-600">No topics saved yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
                {t.topic_type}: {t.topic_value}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Vocabulary</h2>
        <p className="text-sm text-slate-600">Add vocabulary from lexicon to student pool.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            value={vocabSearch}
            onChange={(e) => setVocabSearch(e.target.value)}
            placeholder="Type word (e.g. improve)"
          />
          <button
            className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
            onClick={openVocabSearch}
          >
            Add vocabulary from lexicon
          </button>
        </div>
        {vocabSuccess ? <p className="text-sm text-emerald-600">{vocabSuccess}</p> : null}

        <SenseSelectionModal
          lemma={vocabSearch}
          isOpen={showVocabModal}
          onClose={() => setShowVocabModal(false)}
          onSelect={() => {
            setVocabSuccess("Word added to pool.");
            setTimeout(() => setVocabSuccess(""), 2200);
            setShowVocabModal(false);
            setVocabSearch("");
          }}
          onSelectCustom={() => {
            setVocabSuccess("Custom word added to pool.");
            setTimeout(() => setVocabSuccess(""), 2200);
            setShowVocabModal(false);
            setVocabSearch("");
          }}
          onSearchForm={(term) => setVocabSearch(term)}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Notes</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <textarea
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Dodaj notatkę..."
          />
          <button
            className="rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-white/15 transition disabled:opacity-60"
            onClick={addNote}
            disabled={addingNote || !noteText.trim()}
          >
            {addingNote ? "Dodaję…" : "Dodaj notatkę"}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-600">Brak notatek.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500 mb-2">
                  {note.author_role === "admin" ? "Nauczyciel" : "Uczeń"} •{" "}
                  {new Date(note.created_at).toLocaleString()}
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Linked resources</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <input
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            value={resourceIdInput}
            onChange={(e) => setResourceIdInput(e.target.value)}
            placeholder="Resource id/slug (e.g. present-perfect, business-retail-daily)"
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
              onClick={() => addLinkedResource("grammar")}
              disabled={savingResourceType !== null}
            >
              {savingResourceType === "grammar" ? "Adding…" : "Add grammar"}
            </button>
            <button
              className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
              onClick={() => addLinkedResource("pack")}
              disabled={savingResourceType !== null}
            >
              {savingResourceType === "pack" ? "Adding…" : "Add pack"}
            </button>
            <button
              className="rounded-xl border border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition disabled:opacity-60"
              onClick={() => addLinkedResource("cluster")}
              disabled={savingResourceType !== null}
            >
              {savingResourceType === "cluster" ? "Adding…" : "Add cluster"}
            </button>
          </div>
        </div>

        {resources.length === 0 ? (
          <p className="text-sm text-slate-600">No linked resources yet.</p>
        ) : (
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">{resource.resource_type}</span> • {resource.resource_id}
              </li>
            ))}
          </ul>
        )}
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
