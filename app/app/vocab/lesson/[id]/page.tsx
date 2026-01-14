"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import SenseSelectionModal from "../../SenseSelectionModal";

type StudentLesson = {
  id: string;
  lesson_date: string; // yyyy-mm-dd
  title: string;
  notes: string | null;
};

type LessonWord = {
  user_vocab_item_id: string;
  lesson_vocab_item_id: string;
  lemma: string | null;
  custom_lemma: string | null;
  translation_pl: string | null;
  custom_translation_pl: string | null;
  verified: boolean;
  source: "lexicon" | "custom";
};

export default function VocabLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [lesson, setLesson] = useState<StudentLesson | null>(null);
  const [words, setWords] = useState<LessonWord[]>([]);
  const [availableWords, setAvailableWords] = useState<LessonWord[]>([]); // Words from pool not yet in lesson

  // Adding new word (opens modal)
  const [newWord, setNewWord] = useState("");
  const [showSenseModal, setShowSenseModal] = useState(false);
  const [addingWord, setAddingWord] = useState(false);

  // Adding from pool
  const [pinningWordId, setPinningWordId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const loadLessonAndWords = async () => {
    if (!lessonId || !profile?.id) return;

    // Load lesson
    const lessonRes = await supabase
      .from("student_lessons")
      .select("id,lesson_date,title,notes")
      .eq("id", lessonId)
      .single();

    if (lessonRes.error) throw lessonRes.error;
    setLesson(lessonRes.data as StudentLesson);

    // Load words pinned to this lesson
    const lessonVocabRes = await supabase
      .from("lesson_vocab_items")
      .select(
        `
        id,
        user_vocab_item_id,
        user_vocab_items(
          id,
          sense_id,
          custom_lemma,
          custom_translation_pl,
          verified,
          source,
          lexicon_senses(
            lexicon_entries(lemma),
            lexicon_translations(translation_pl)
          )
        )
      `
      )
      .eq("student_lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (lessonVocabRes.error) throw lessonVocabRes.error;

    const lessonWords: LessonWord[] = (lessonVocabRes.data || []).map((lv: any) => {
      const uvi = lv.user_vocab_items;
      const sense = uvi?.lexicon_senses;
      const entry = sense?.lexicon_entries;
      const translation = sense?.lexicon_translations?.[0];

      return {
        user_vocab_item_id: uvi.id,
        lesson_vocab_item_id: lv.id,
        lemma: entry?.lemma || null,
        custom_lemma: uvi.custom_lemma,
        translation_pl: translation?.translation_pl || null,
        custom_translation_pl: uvi.custom_translation_pl,
        verified: uvi.verified,
        source: uvi.source,
      };
    });

    setWords(lessonWords);

    // Load all user vocab items (for "Add from pool" section)
    const allUserVocabRes = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        sense_id,
        custom_lemma,
        custom_translation_pl,
        verified,
        source,
        lexicon_senses(
          lexicon_entries(lemma),
          lexicon_translations(translation_pl)
        )
      `
      )
      .eq("student_id", profile.id)
      .order("created_at", { ascending: false });

    if (allUserVocabRes.error) throw allUserVocabRes.error;

    const allWords: LessonWord[] = (allUserVocabRes.data || []).map((uvi: any) => {
      const sense = uvi.lexicon_senses;
      const entry = sense?.lexicon_entries;
      const translation = sense?.lexicon_translations?.[0];

      return {
        user_vocab_item_id: uvi.id,
        lesson_vocab_item_id: "", // Not in lesson yet
        lemma: entry?.lemma || null,
        custom_lemma: uvi.custom_lemma,
        translation_pl: translation?.translation_pl || null,
        custom_translation_pl: uvi.custom_translation_pl,
        verified: uvi.verified,
        source: uvi.source,
      };
    });

    // Filter out words already in lesson
    const pinnedIds = new Set(lessonWords.map((w) => w.user_vocab_item_id));
    const available = allWords.filter((w) => !pinnedIds.has(w.user_vocab_item_id));
    setAvailableWords(available);

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

  const toggleSelected = (userVocabItemId: string) => {
    setSelected((prev) => ({ ...prev, [userVocabItemId]: !prev[userVocabItemId] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const w of words) next[w.user_vocab_item_id] = true;
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

    // Clear selections (auto-unselect)
    setSelected({});

    // Navigate to test page with new format
    const selectedIdsParam = encodeURIComponent(ids.join(","));
    router.push(`/app/vocab/test?source=lesson&lessonId=${lessonId}&selectedIds=${selectedIdsParam}`);
  };

  const handleLookupWord = () => {
    if (!newWord.trim()) {
      setError("Wpisz słówko po angielsku.");
      return;
    }
    setError("");
    setShowSenseModal(true);
  };

  const handleSenseSelected = async (senseId: string) => {
    // Modal already handles the API call and pinning to lesson
    // Just refresh data and close modal
    setNewWord("");
    setShowSenseModal(false);
    await loadLessonAndWords();
  };

  const handleCustomWord = async (lemma: string, translation: string | null) => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }

    setAddingWord(true);
    setError("");

    try {
      // 1. Add custom word to user vocab pool
      const { data: newItem, error: insertErr } = await supabase
        .from("user_vocab_items")
        .insert({
          student_id: profile.id,
          sense_id: null,
          custom_lemma: lemma.trim().toLowerCase(),
          custom_translation_pl: translation?.trim() || null,
          source: "custom",
          verified: false,
        })
        .select("id")
        .single();

      if (insertErr) {
        // Check if duplicate - if so, use existing
        if (String(insertErr.message).toLowerCase().includes("duplicate")) {
          const { data: existing } = await supabase
            .from("user_vocab_items")
            .select("id")
            .eq("student_id", profile.id)
            .eq("custom_lemma", lemma.trim().toLowerCase())
            .eq("source", "custom")
            .maybeSingle();

          if (existing) {
            // 2. Pin to lesson
            const { error: pinErr } = await supabase.from("lesson_vocab_items").insert({
              student_lesson_id: lessonId,
              user_vocab_item_id: existing.id,
            });

            if (pinErr && !String(pinErr.message).toLowerCase().includes("duplicate")) {
              throw pinErr;
            }

            setNewWord("");
            setShowSenseModal(false);
            await loadLessonAndWords();
            return;
          }
        }
        throw insertErr;
      }

      if (!newItem) {
        throw new Error("Nie udało się utworzyć słówka");
      }

      // 2. Pin to lesson
      const { error: pinErr } = await supabase.from("lesson_vocab_items").insert({
        student_lesson_id: lessonId,
        user_vocab_item_id: newItem.id,
      });

      if (pinErr && !String(pinErr.message).toLowerCase().includes("duplicate")) {
        throw pinErr;
      }

      setNewWord("");
      setShowSenseModal(false);
      await loadLessonAndWords();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówka.");
    } finally {
      setAddingWord(false);
    }
  };

  const pinWordFromPool = async (userVocabItemId: string) => {
    setPinningWordId(userVocabItemId);
    setError("");

    try {
      const { error: pinErr } = await supabase.from("lesson_vocab_items").insert({
        student_lesson_id: lessonId,
        user_vocab_item_id: userVocabItemId,
      });

      if (pinErr) {
        if (!String(pinErr.message).toLowerCase().includes("duplicate")) {
          throw pinErr;
        }
      }

      await loadLessonAndWords();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się przypiąć słówka.");
    } finally {
      setPinningWordId(null);
    }
  };

  const detachWordFromLesson = async (lessonVocabItemId: string) => {
    setError("");
    try {
      const { error } = await supabase.from("lesson_vocab_items").delete().eq("id", lessonVocabItemId);

      if (error) throw error;

      await loadLessonAndWords();
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się usunąć słówka z lekcji.");
    }
  };

  function getDisplayLemma(word: LessonWord): string {
    return word.lemma || word.custom_lemma || "—";
  }

  function getDisplayTranslation(word: LessonWord): string {
    return word.translation_pl || word.custom_translation_pl || "—";
  }

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

      {/* Add new word */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-white">Dodaj nowe słówko</h2>
          <p className="text-sm text-white/75">
            Wpisz słówko po angielsku. System znajdzie wszystkie znaczenia i pozwoli wybrać właściwe. Słowo trafi do
            puli i zostanie automatycznie przypięte do tej lekcji.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              placeholder="Wpisz słówko po angielsku (np. ball)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLookupWord();
                }
              }}
            />
            <button
              className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
              onClick={handleLookupWord}
              disabled={addingWord || !newWord.trim()}
            >
              {addingWord ? "Dodaję…" : "Szukaj / Dodaj"}
            </button>
          </div>
        </div>

        <SenseSelectionModal
          lemma={newWord}
          isOpen={showSenseModal}
          onClose={() => {
            setShowSenseModal(false);
            setError("");
          }}
          onSelect={handleSenseSelected}
          onSelectCustom={handleCustomWord}
          lessonId={lessonId}
        />
      </section>

      {/* Add from pool */}
      {availableWords.length > 0 && (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Dodaj z puli</h2>
            <p className="text-sm text-white/75">Przypnij słówka z Twojej puli do tej lekcji.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableWords.slice(0, 12).map((w) => (
              <button
                key={w.user_vocab_item_id}
                onClick={() => pinWordFromPool(w.user_vocab_item_id)}
                disabled={pinningWordId === w.user_vocab_item_id}
                className="rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition disabled:opacity-60"
              >
                <div className="font-medium text-white">{getDisplayLemma(w)}</div>
                <div className="text-xs text-white/70 truncate">{getDisplayTranslation(w)}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Words in lesson */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Słówka w tej lekcji</h2>
            <p className="text-sm text-white/75">Hover → tłumaczenie. 🔊 → wymowa.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {words.length >= 2 && (
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition"
                onClick={selectAll}
              >
                Zaznacz wszystkie
              </button>
            )}
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
                key={w.lesson_vocab_item_id}
                className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
                title={getDisplayTranslation(w)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!selected[w.user_vocab_item_id]}
                    onChange={() => toggleSelected(w.user_vocab_item_id)}
                  />

                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{getDisplayLemma(w)}</div>
                    <div className="text-xs text-white/70">
                      {getDisplayTranslation(w) !== "—" ? "hover → PL" : "brak tłumaczenia"}
                      {w.source === "custom" ? " • własne" : ""}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition"
                    onClick={() => speak(getDisplayLemma(w))}
                    title="Odtwórz wymowę"
                  >
                    🔊
                  </button>
                  <button
                    className="rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
                    onClick={() => detachWordFromLesson(w.lesson_vocab_item_id)}
                    title="Usuń z tej lekcji"
                  >
                    Odepnij
                  </button>
                  <button
                    className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć słówko "${getDisplayLemma(w)}" z puli?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        const res = await fetch("/api/vocab/delete-word", {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ user_vocab_item_id: w.user_vocab_item_id }),
                        });

                        if (!res.ok) {
                          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                          throw new Error(errorData.error || `HTTP ${res.status}`);
                        }

                        await loadLessonAndWords();
                      } catch (e: any) {
                        setError(e?.message ?? "Nie udało się usunąć słówka.");
                      }
                    }}
                    title="Usuń słówko z puli (usunie też z wszystkich lekcji)"
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
