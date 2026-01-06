"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type StudentLesson = {
  id: string;
  lesson_date: string; // yyyy-mm-dd
  title: string;
  notes: string | null;
};

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
  is_personal: boolean;
};

type LessonVocabRow = {
  vocab_items: VocabItem[] | null;
};

export default function VocabLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lesson, setLesson] = useState<StudentLesson | null>(null);
  const [words, setWords] = useState<VocabItem[]>([]);

  // Dodawanie nowych słówek "do lekcji"
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [adding, setAdding] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const loadLessonAndWords = async () => {
    if (!lessonId) return;

    const lessonRes = await supabase
      .from("student_lessons")
      .select("id,lesson_date,title,notes")
      .eq("id", lessonId)
      .single();

    if (lessonRes.error) throw lessonRes.error;
    setLesson(lessonRes.data as StudentLesson);

    const vocabRes = await supabase
      .from("student_lesson_vocab")
      .select("vocab_items(id,term_en,translation_pl,is_personal)")
      .eq("student_lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (vocabRes.error) throw vocabRes.error;

    const rows = (vocabRes.data ?? []) as unknown as LessonVocabRow[];
    const list = rows.flatMap((r) => r.vocab_items ?? []) as VocabItem[];
    setWords(list);

    setSelected({});
  };

  useEffect(() => {
    const run = async () => {
      try {
        if (!lessonId) {
          setError("Brak id lekcji w URL.");
          return;
        }

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const p = await getOrCreateProfile();
        if (!p) {
          router.push("/login");
          return;
        }
        setProfile(p);

        await loadLessonAndWords();
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, lessonId]);

  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) {
        setError("Twoja przeglądarka nie wspiera odtwarzania wymowy (speechSynthesis).");
        return;
      }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1.0;
      synth.speak(utter);
    } catch {
      setError("Nie udało się odtworzyć wymowy.");
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const w of words) next[w.id] = true;
    setSelected(next);
  };

  const clearAll = () => setSelected({});

  const startTest = () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) {
      setError("Zaznacz przynajmniej jedno słówko do testu.");
      return;
    }

    const q = encodeURIComponent(ids.join(","));
    router.push(`/app/vocab/test?ids=${q}&fromLesson=${lessonId}`);
  };

  const addWordToLesson = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    const term = newWord.trim();
    if (!term) {
      setError("Wpisz słówko po angielsku.");
      return;
    }

    setAdding(true);
    setError("");

    try {
      const findRes = await supabase
        .from("vocab_items")
        .select("id,term_en,translation_pl,is_personal")
        .eq("student_id", profile.id)
        .eq("term_en_norm", term.toLowerCase())
        .limit(1);

      if (findRes.error) throw findRes.error;

      let vocabId: string | null = findRes.data?.[0]?.id ?? null;

      if (!vocabId) {
        const insertRes = await supabase
          .from("vocab_items")
          .insert({
            student_id: profile.id,
            term_en: term,
            translation_pl: newTranslation.trim() || null,
            is_personal: true,
          })
          .select("id")
          .single();

        if (insertRes.error) {
          const retry = await supabase
            .from("vocab_items")
            .select("id")
            .eq("student_id", profile.id)
            .eq("term_en_norm", term.toLowerCase())
            .single();

          if (retry.error) throw insertRes.error;
          vocabId = retry.data.id;
        } else {
          vocabId = insertRes.data.id;
        }
      }

      const linkRes = await supabase.from("student_lesson_vocab").insert({
        student_lesson_id: lessonId,
        vocab_item_id: vocabId,
      });

      if (linkRes.error) {
        if (!String(linkRes.error.message).toLowerCase().includes("duplicate")) {
          throw linkRes.error;
        }
      }

      setNewWord("");
      setNewTranslation("");

      await loadLessonAndWords();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówka.");
    } finally {
      setAdding(false);
    }
  };

  const detachWordFromLesson = async (vocabItemId: string) => {
    setError("");
    try {
      const res = await supabase
        .from("student_lesson_vocab")
        .delete()
        .eq("student_lesson_id", lessonId)
        .eq("vocab_item_id", vocabItemId);

      if (res.error) throw res.error;

      await loadLessonAndWords();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się usunąć słówka z lekcji.");
    }
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {lesson ? `${lesson.title} ${lesson.lesson_date}` : "Lekcja"}
            </h1>
            <p className="text-sm text-white/75">
              Zalogowany jako: <span className="font-medium text-white">{profile?.email ?? "-"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/vocab"
            >
              ← Trening słówek
            </a>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
              href="/app"
            >
              Panel
            </a>
          </div>
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

      {lesson?.notes ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="text-sm text-white/70">Notatki:</div>
          <div className="mt-1 whitespace-pre-wrap text-white">{lesson.notes}</div>
        </section>
      ) : null}

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-white">Dodaj słówko do tej lekcji</h2>
          <p className="text-sm text-white/75">
            Dodane słówko trafia do tej lekcji i do Twojej ogólnej puli. Jeśli już istnieje, system go nie dubluje.
          </p>
          <p className="text-sm text-white/70">
            Wiele poprawnych tłumaczeń oddzielaj średnikiem <span className="font-medium text-white">;</span>{" "}
            (np. <span className="font-medium text-white">kwiat; kwiatek; kwiatuszek</span>).
          </p>
        </div>

        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              className="rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="EN (np. go)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
            />
            <input
              className="rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="PL (np. kwiat; kwiatek)"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
            />
            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={addWordToLesson}
              disabled={adding}
            >
              {adding ? "Dodaję…" : "Dodaj do lekcji"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Słówka w tej lekcji</h2>
            <p className="text-sm text-white/75">Hover → tłumaczenie. 🔊 → wymowa.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition"
              onClick={selectAll}
            >
              Zaznacz wszystkie
            </button>
            <button
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition"
              onClick={clearAll}
            >
              Wyczyść
            </button>
            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={startTest}
              disabled={selectedCount === 0}
            >
              Stwórz test ({selectedCount})
            </button>
          </div>
        </div>

        {words.length === 0 ? (
          <p className="text-sm text-white/75">Ta lekcja nie ma jeszcze przypisanych słówek.</p>
        ) : (
          <ul className="space-y-2">
            {words.map((w) => (
              <li
                key={w.id}
                className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
                title={w.translation_pl ?? ""}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!selected[w.id]}
                    onChange={() => toggleSelected(w.id)}
                  />

                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{w.term_en}</div>
                    <div className="text-xs text-white/70">
                      {w.translation_pl ? "hover → PL" : "brak tłumaczenia"}
                      {w.is_personal ? " • własne" : ""}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition"
                    onClick={() => speak(w.term_en)}
                    title="Odtwórz wymowę"
                  >
                    🔊
                  </button>
                  <button
                    className="rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
                    onClick={() => detachWordFromLesson(w.id)}
                    title="Usuń z tej lekcji"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
