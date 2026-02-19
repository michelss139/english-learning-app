"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import PoolTab from "../PoolTab";
import SenseSelectionModal from "../SenseSelectionModal";

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
  is_personal: boolean;
};

type Tab = "pool" | "personal";

function tabBtn(active: boolean) {
  return `rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
    active
      ? "border-slate-900 bg-slate-100 text-slate-900"
      : "border-slate-900 bg-white text-slate-700 hover:bg-slate-50"
  }`;
}

export default function VocabPoolPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <VocabPoolInner />
    </Suspense>
  );
}

function VocabPoolInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const initialTab = (searchParams.get("tab") as Tab) || "pool";
  const [tab, setTab] = useState<Tab>(initialTab);

  const [personal, setPersonal] = useState<VocabItem[]>([]);
  const [newWord, setNewWord] = useState("");
  const [showSenseModal, setShowSenseModal] = useState(false);
  const [addingWord, setAddingWord] = useState(false);

  const personalCount = personal.length;

  const refreshPersonal = async () => {
    if (!profile?.id) return;

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

    const mapped = (personalRes.data ?? []).map((uvi: any) => {
      const lemma = uvi.custom_lemma || uvi.lexicon_senses?.lexicon_entries?.lemma || "";
      const translation =
        uvi.custom_translation_pl || uvi.lexicon_senses?.lexicon_translations?.[0]?.translation_pl || null;
      return {
        id: uvi.id,
        term_en: lemma,
        translation_pl: translation,
        is_personal: true,
        user_vocab_item_id: uvi.id,
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

  const handleLookupWord = () => {
    if (!newWord.trim()) {
      setError("Wpisz słówko po angielsku.");
      return;
    }
    setError("");
    setShowSenseModal(true);
  };

  const handleSenseSelected = async (senseId: string, entry?: any) => {
    if (entry?.verb_forms) {
      const forms = [entry.verb_forms.past_simple, entry.verb_forms.past_participle].filter(Boolean);
      if (forms.length > 0) {
        const highlightParam = forms.join(",");
        setNewWord("");
        setShowSenseModal(false);
        router.push(`/app/vocab/pool?tab=pool&highlight=${encodeURIComponent(highlightParam)}`);
        return;
      }
    }
    setNewWord("");
    setShowSenseModal(false);
    await refreshPersonal();
    if (tab === "pool") {
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Moja pula</h1>

        <div className="flex flex-wrap gap-2">
          <a
            className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50 transition"
            href="/app/vocab"
          >
            ← Słownictwo
          </a>
          <a
            className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50 transition"
            href="/app"
          >
            ← Panel ucznia
          </a>
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

      <nav className="flex flex-wrap gap-2">
        <button className={tabBtn(tab === "pool")} onClick={() => setTab("pool")}>
          Moja pula
        </button>

        <button className={tabBtn(tab === "personal")} onClick={() => setTab("personal")}>
          Dodaj słówko ({personalCount})
        </button>
      </nav>

      {tab === "pool" ? <PoolTab /> : null}

      {tab === "personal" ? (
        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Dodaj słówko</h2>
            <p className="text-sm text-slate-600">
              Wpisz słówko po angielsku. System znajdzie wszystkie znaczenia i pozwoli wybrać właściwe.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-2xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
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
            onSearchForm={(formTerm) => setNewWord(formTerm)}
          />

          {personal.length === 0 ? (
            <p className="text-sm text-slate-600">Nie masz jeszcze własnych słówek.</p>
          ) : (
            <ul className="space-y-2">
              {personal.map((w) => (
                <li
                  key={w.id}
                  className="rounded-2xl border-2 border-slate-900 bg-white px-4 py-3 flex items-center justify-between gap-3"
                  title={w.translation_pl ?? ""}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{w.term_en}</span>
                    <span className="text-sm text-slate-600 ml-2">
                      {w.translation_pl ? "hover → PL" : "brak tłumaczenia"}
                    </span>
                  </div>
                  <button
                    className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć słówko "${w.term_en}"?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        const userVocabItemId = (w as any).user_vocab_item_id;

                        if (userVocabItemId) {
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
                          const res = await fetch("/api/vocab/delete-word", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ word_id: w.id }),
                          });

                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                          }
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
