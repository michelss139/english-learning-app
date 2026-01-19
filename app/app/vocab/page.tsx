"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import PoolTab from "./PoolTab";
import SenseSelectionModal from "./SenseSelectionModal";
import ClustersSection from "./ClustersSection";

type StudentLesson = {
  id: string;
  lesson_date: string; // yyyy-mm-dd
  title: string;
};

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
  is_personal: boolean;
};

type Tab = "lessons" | "pool" | "personal";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function tabBtn(active: boolean) {
  return `rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
    active
      ? "border-white/20 bg-white/15 text-white"
      : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
  }`;
}

export default function VocabHomePage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <VocabHomeInner />
    </Suspense>
  );
}

function VocabHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize tab from URL query param or default to "lessons"
  const initialTab = (searchParams.get("tab") as Tab) || "lessons";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [personal, setPersonal] = useState<VocabItem[]>([]);

  // Dodawanie własnych słówek (nowy flow z multi-sense selection)
  const [newWord, setNewWord] = useState("");
  const [showSenseModal, setShowSenseModal] = useState(false);
  const [addingWord, setAddingWord] = useState(false);

  // Tworzenie lekcji (data)
  const [lessonDate, setLessonDate] = useState(todayISO());
  const [lessonNotes, setLessonNotes] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const personalCount = personal.length;

  const formattedLessons = useMemo(() => {
    return lessons.map((l) => ({
      ...l,
      label: `${l.title} ${l.lesson_date}`,
    }));
  }, [lessons]);

  const refreshLessons = async () => {
    const lessonsRes = await supabase
      .from("student_lessons")
      .select("id,lesson_date,title")
      .order("lesson_date", { ascending: false });

    if (lessonsRes.error) throw lessonsRes.error;
    setLessons((lessonsRes.data ?? []) as StudentLesson[]);
  };

  const refreshPersonal = async () => {
    if (!profile?.id) return;

    // Try new model first (user_vocab_items)
    const personalRes = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        custom_lemma,
        custom_translation_pl,
        lexicon_senses(
          lexicon_entries(lemma),
          lexicon_translations(translation_pl)
        )
      `
      )
      .eq("student_id", profile.id)
      .or("custom_lemma.not.is.null,source.eq.custom")
      .order("created_at", { ascending: false });

    if (personalRes.error) {
      // Fallback to old model
      const oldRes = await supabase
        .from("vocab_items")
        .select("id,term_en,translation_pl,is_personal")
        .eq("is_personal", true)
        .order("created_at", { ascending: false });

      if (oldRes.error) throw oldRes.error;
      setPersonal(
        (oldRes.data ?? []).map((v: any) => ({
          id: v.id,
          term_en: v.term_en,
          translation_pl: v.translation_pl,
          is_personal: v.is_personal,
        })) as VocabItem[]
      );
      return;
    }

    // Map new model to old format for compatibility
    const mapped = (personalRes.data ?? []).map((uvi: any) => {
      const lemma = uvi.custom_lemma || uvi.lexicon_senses?.lexicon_entries?.lemma || "";
      const translation = uvi.custom_translation_pl || uvi.lexicon_senses?.lexicon_translations?.[0]?.translation_pl || null;
      return {
        id: uvi.id,
        term_en: lemma,
        translation_pl: translation,
        is_personal: true,
        user_vocab_item_id: uvi.id, // Store for deletion
      };
    });

    setPersonal(mapped as any);
  };

  useEffect(() => {
    const run = async () => {
      try {
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

        await refreshLessons();
        await refreshPersonal();
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const createLesson = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    if (!lessonDate) {
      setError("Wybierz datę lekcji.");
      return;
    }

    setCreatingLesson(true);
    setError("");

    try {
      const insertRes = await supabase
        .from("student_lessons")
        .insert({
          student_id: profile.id,
          lesson_date: lessonDate,
          title: "Lekcja",
          notes: lessonNotes.trim() || null,
        })
        .select("id")
        .single();

      if (insertRes.error) throw insertRes.error;

      await refreshLessons();

      router.push(`/app/vocab/lesson/${insertRes.data.id}`);
      router.refresh();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        setError("Masz już utworzoną lekcję dla tej daty. Wybierz inną datę.");
      } else {
        setError(e?.message ?? "Nie udało się utworzyć lekcji.");
      }
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleLookupWord = () => {
    if (!newWord.trim()) {
      setError("Wpisz słówko po angielsku.");
      return;
    }
    setError("");
    setShowSenseModal(true);
  };

  const handleSenseSelected = async (senseId: string, entry?: any) => {
    // Modal already handles the API call
    // If entry has verb_forms, add highlight links for forms
    if (entry?.verb_forms) {
      const forms = [
        entry.verb_forms.past_simple,
        entry.verb_forms.past_participle,
      ].filter(Boolean);
      if (forms.length > 0) {
        // Navigate to pool tab with highlight parameter
        const highlightParam = forms.join(',');
        setNewWord("");
        setShowSenseModal(false);
        router.push(`/app/vocab?tab=pool&highlight=${encodeURIComponent(highlightParam)}`);
        return;
      }
    }
    setNewWord("");
    setShowSenseModal(false);
    await refreshPersonal();
    // Refresh pool tab if active
    if (tab === "pool") {
      // PoolTab will refresh on its own via useEffect
      router.refresh();
    }
  };

  const handleCustomWord = async (lemma: string, translation: string | null) => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }

    setAddingWord(true);
    setError("");

    try {
      const { error: insertErr } = await supabase.from("user_vocab_items").insert({
        student_id: profile.id,
        sense_id: null,
        custom_lemma: lemma.trim().toLowerCase(),
        custom_translation_pl: translation?.trim() || null,
        source: "custom",
        verified: false,
      });

      if (insertErr) {
        // Check if duplicate
        if (String(insertErr.message).toLowerCase().includes("duplicate")) {
          setError("To słowo już jest w Twojej puli");
          setAddingWord(false);
          return;
        }
        throw insertErr;
      }

      await refreshPersonal();

      setNewWord("");
      setShowSenseModal(false);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówka.");
    } finally {
      setAddingWord(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Trening słówek</h1>
            <p className="text-sm text-white/75">
              Zalogowany jako: <span className="font-medium text-white">{profile?.email ?? "-"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app"
            >
              ← Panel ucznia
            </a>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
              href="/app/status"
            >
              Status
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

      {/* CLUSTERS */}
      <ClustersSection />

      <nav className="flex flex-wrap gap-2">
        <button className={tabBtn(tab === "lessons")} onClick={() => setTab("lessons")}>
          Lekcje (daty)
        </button>

        <button className={tabBtn(tab === "pool")} onClick={() => setTab("pool")}>
          Moja pula
        </button>

        <button className={tabBtn(tab === "personal")} onClick={() => setTab("personal")}>
          Dodaj słówko ({personalCount})
        </button>
      </nav>

      {/* LEKCJE */}
      {tab === "lessons" ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Lekcje</h2>
            <p className="text-sm text-white/75">Utwórz „Lekcja + data”, a potem dodaj do niej słówka.</p>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/85">Data</label>
                <input
                  className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium text-white/85">Notatki (opcjonalnie)</label>
                <input
                  className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                  placeholder="np. temat lekcji, co robiliśmy..."
                />
              </div>
            </div>

            <button
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
              onClick={createLesson}
              disabled={creatingLesson}
            >
              {creatingLesson ? "Tworzę…" : "Utwórz lekcję"}
            </button>
          </div>

          {formattedLessons.length === 0 ? (
            <p className="text-sm text-white/75">Na razie nie masz jeszcze żadnych lekcji.</p>
          ) : (
            <ul className="space-y-2">
              {formattedLessons.map((l) => (
                <li
                  key={l.id}
                  className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{l.label}</div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
                      href={`/app/vocab/lesson/${l.id}`}
                    >
                      Otwórz →
                    </a>
                    <button
                      className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
                      onClick={async () => {
                        if (!confirm(`Czy na pewno chcesz usunąć lekcję "${l.label}"?`)) return;

                        try {
                          const session = await supabase.auth.getSession();
                          const token = session?.data?.session?.access_token;
                          if (!token) {
                            setError("Musisz być zalogowany");
                            return;
                          }

                          const res = await fetch("/api/vocab/delete-lesson", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ lesson_id: l.id }),
                          });

                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                          }

                          await refreshLessons();
                        } catch (e: any) {
                          setError(e?.message ?? "Nie udało się usunąć lekcji.");
                        }
                      }}
                      title="Usuń lekcję"
                    >
                      Usuń
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* MOJA PULA */}
      {tab === "pool" ? <PoolTab /> : null}

      {/* DODAJ SŁÓWKO */}
      {tab === "personal" ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Dodaj słówko</h2>
            <p className="text-sm text-white/75">
              Wpisz słówko po angielsku. System znajdzie wszystkie znaczenia i pozwoli wybrać właściwe.
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
          />

          {personal.length === 0 ? (
            <p className="text-sm text-white/75">Nie masz jeszcze własnych słówek.</p>
          ) : (
            <ul className="space-y-2">
              {personal.map((w) => (
                <li
                  key={w.id}
                  className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between gap-3"
                  title={w.translation_pl ?? ""}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{w.term_en}</span>
                    <span className="text-sm text-white/70 ml-2">{w.translation_pl ? "hover → PL" : "brak tłumaczenia"}</span>
                  </div>
                  <button
                    className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć słówko "${w.term_en}"?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        // Check if we have user_vocab_item_id (new model)
                        const userVocabItemId = (w as any).user_vocab_item_id;

                        if (userVocabItemId) {
                          // New model
                          const res = await fetch("/api/vocab/delete-word", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ user_vocab_item_id: userVocabItemId }),
                          });

                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                          }
                        } else {
                          // Old model - try to delete from vocab_items
                          const { error: deleteErr } = await supabase.from("vocab_items").delete().eq("id", w.id);
                          if (deleteErr) throw deleteErr;
                        }

                        await refreshPersonal();
                      } catch (e: any) {
                        setError(e?.message ?? "Nie udało się usunąć słówka.");
                      }
                    }}
                    title="Usuń słówko"
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
