"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

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

export default function VocabHomePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("lessons");

  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [personal, setPersonal] = useState<VocabItem[]>([]);
  const [pool, setPool] = useState<VocabItem[]>([]);
  const [poolSelected, setPoolSelected] = useState<Record<string, boolean>>({});

  // Dodawanie własnych słówek
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [savingWord, setSavingWord] = useState(false);

  // Tworzenie lekcji (data)
  const [lessonDate, setLessonDate] = useState(todayISO());
  const [lessonNotes, setLessonNotes] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Usuwanie słówka z puli
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  const personalCount = personal.length;
  const poolSelectedCount = useMemo(
    () => Object.values(poolSelected).filter(Boolean).length,
    [poolSelected]
  );

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
    const personalRes = await supabase
      .from("vocab_items")
      .select("id,term_en,translation_pl,is_personal")
      .eq("is_personal", true)
      .order("created_at", { ascending: false });

    if (personalRes.error) throw personalRes.error;
    setPersonal((personalRes.data ?? []) as VocabItem[]);
  };

  const refreshPool = async (studentId?: string) => {
    const query = supabase
      .from("vocab_items")
      .select("id,term_en,translation_pl,is_personal");

    if (studentId) {
      query.eq("student_id", studentId);
    }

    const poolRes = await query.order("term_en", { ascending: true });

    if (poolRes.error) throw poolRes.error;
    setPool((poolRes.data ?? []) as VocabItem[]);
    setPoolSelected({});
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
        await refreshPool(p.id);
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

  const addPersonalWord = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }
    if (!newWord.trim()) {
      setError("Wpisz słówko po angielsku.");
      return;
    }

    setSavingWord(true);
    setError("");

    try {
      const { error } = await supabase.from("vocab_items").insert({
        student_id: profile.id,
        term_en: newWord.trim(),
        translation_pl: newTranslation.trim() || null,
        is_personal: true,
      });

      if (error) throw error;

      await refreshPersonal();
      await refreshPool(profile.id);

      setNewWord("");
      setNewTranslation("");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówka.");
    } finally {
      setSavingWord(false);
    }
  };

  const deletePoolWord = async (word: VocabItem) => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }

    const ok = window.confirm(
      `Usunąć słówko z puli?\n\nEN: ${word.term_en}\nPL: ${word.translation_pl ?? "-"}\n\nTej operacji nie da się cofnąć.`
    );
    if (!ok) return;

    setDeletingWordId(word.id);
    setError("");

    try {
      const { error: delError } = await supabase.from("vocab_items").delete().eq("id", word.id);
      if (delError) throw delError;

      await refreshPool(profile.id);
      await refreshPersonal();
    } catch (e: any) {
      const msg = e?.message ?? "Nie udało się usunąć słówka.";
      setError(
        `${msg} Jeśli to słówko jest przypięte do lekcji, upewnij się, że FK ma ON DELETE CASCADE (student_lesson_vocab → vocab_items) i że RLS pozwala na DELETE swoich rekordów.`
      );
    } finally {
      setDeletingWordId(null);
    }
  };

  const togglePoolSelected = (id: string) => {
    setPoolSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllPool = () => {
    const next: Record<string, boolean> = {};
    for (const w of pool) next[w.id] = true;
    setPoolSelected(next);
  };

  const clearPoolSelection = () => setPoolSelected({});

  const startPoolTest = () => {
    const ids = Object.entries(poolSelected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) {
      setError("Zaznacz przynajmniej jedno słówko z puli do testu.");
      return;
    }

    const q = encodeURIComponent(ids.join(","));
    router.push(`/app/vocab/test?ids=${q}`);
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-2xl border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Trening słówek</h1>
            <p className="text-sm opacity-80">
              Zalogowany jako: <span className="font-medium">{profile?.email ?? "-"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a className="rounded-lg border px-4 py-2 font-medium" href="/app">
              ← Panel ucznia
            </a>
            <a className="rounded-lg border px-4 py-2 font-medium" href="/app/status">
              Status
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border p-4">
          <p className="text-sm">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        <button
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            tab === "lessons" ? "opacity-100" : "opacity-70"
          }`}
          onClick={() => setTab("lessons")}
        >
          Lekcje (daty)
        </button>
        <button
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            tab === "pool" ? "opacity-100" : "opacity-70"
          }`}
          onClick={() => setTab("pool")}
        >
          Cała pula
        </button>
        <button
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            tab === "personal" ? "opacity-100" : "opacity-70"
          }`}
          onClick={() => setTab("personal")}
        >
          Własne słówka ({personalCount})
        </button>
      </nav>

      {tab === "lessons" ? (
        <section className="rounded-2xl border p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Lekcje</h2>
            <p className="text-sm opacity-80">
              Utwórz „Lekcja + data”, a potem dodaj do niej słówka.
            </p>
          </div>

          <div className="rounded-2xl border p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Data</label>
                <input
                  className="w-full rounded-lg border bg-transparent px-3 py-2"
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Notatki (opcjonalnie)</label>
                <input
                  className="w-full rounded-lg border bg-transparent px-3 py-2"
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                  placeholder="np. temat lekcji, co robiliśmy..."
                />
              </div>
            </div>

            <button
              className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
              onClick={createLesson}
              disabled={creatingLesson}
            >
              {creatingLesson ? "Tworzę…" : "Utwórz lekcję"}
            </button>
          </div>

          {formattedLessons.length === 0 ? (
            <p className="text-sm opacity-80">Na razie nie masz jeszcze żadnych lekcji.</p>
          ) : (
            <ul className="space-y-2">
              {formattedLessons.map((l) => (
                <li
                  key={l.id}
                  className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.label}</div>
                  </div>
                  <a className="underline text-sm" href={`/app/vocab/lesson/${l.id}`}>
                    Otwórz →
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "pool" ? (
        <section className="rounded-2xl border p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cała pula</h2>
              <p className="text-sm opacity-80">
                Wszystkie Twoje słówka (z lekcji + własne). Hover → tłumaczenie.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={selectAllPool}>
                Zaznacz wszystkie
              </button>
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={clearPoolSelection}>
                Wyczyść
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60"
                onClick={startPoolTest}
                disabled={poolSelectedCount === 0}
              >
                Stwórz test ({poolSelectedCount})
              </button>
            </div>
          </div>

          {pool.length === 0 ? (
            <p className="text-sm opacity-80">Nie masz jeszcze żadnych słówek w puli.</p>
          ) : (
            <ul className="space-y-2">
              {pool.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
                  title={w.translation_pl ?? ""}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={!!poolSelected[w.id]}
                      onChange={() => togglePoolSelected(w.id)}
                      disabled={deletingWordId === w.id}
                    />

                    <div className="min-w-0">
                      <div className="font-medium truncate">{w.term_en}</div>
                      <div className="text-xs opacity-70">
                        {w.translation_pl ? "hover → PL" : "brak tłumaczenia"}
                        {w.is_personal ? " • własne" : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                    onClick={() => deletePoolWord(w)}
                    disabled={deletingWordId === w.id}
                    title="Usuń słówko z puli"
                  >
                    {deletingWordId === w.id ? "Usuwam…" : "Usuń"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "personal" ? (
        <section className="rounded-2xl border p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Własne słówka</h2>
            <p className="text-sm opacity-80">
              Dodaj swoje słówko. Tłumaczenie jest pokazywane na hover.
            </p>
            <p className="text-sm opacity-80">
              Wiele poprawnych tłumaczeń wpisuj po polsku i oddzielaj średnikiem{" "}
              <span className="font-medium">;</span> (np.{" "}
              <span className="font-medium">kwiat; kwiatek; kwiatuszek</span>).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border bg-transparent px-3 py-2"
              placeholder="EN (np. achieve)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
            />
            <input
              className="rounded-lg border bg-transparent px-3 py-2"
              placeholder="PL (np. kwiat; kwiatek)"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
            />
            <button
              className="rounded-lg border px-3 py-2 font-medium disabled:opacity-60"
              onClick={addPersonalWord}
              disabled={savingWord}
            >
              {savingWord ? "Dodaję…" : "Dodaj"}
            </button>
          </div>

          {personal.length === 0 ? (
            <p className="text-sm opacity-80">Nie masz jeszcze własnych słówek.</p>
          ) : (
            <ul className="space-y-2">
              {personal.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border px-4 py-3 flex items-center justify-between"
                  title={w.translation_pl ?? ""}
                >
                  <span className="font-medium">{w.term_en}</span>
                  <span className="text-sm opacity-70">
                    {w.translation_pl ? "hover → PL" : "brak tłumaczenia"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
