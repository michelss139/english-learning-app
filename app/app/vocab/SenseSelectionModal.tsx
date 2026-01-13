"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase/client";

type LexiconEntry = {
  id: string;
  lemma: string;
  pos: string;
  senses: Array<{
    id: string;
    definition_en: string;
    domain: string | null;
    sense_order: number;
    translation_pl: string | null;
    example_en: string | null;
    pos?: string; // Part of speech for this specific sense (may differ from entry.pos when multiple POS)
  }>;
  verb_forms: {
    present_simple_i: string;
    present_simple_you: string;
    present_simple_he_she_it: string;
    past_simple: string;
    past_participle: string;
  } | null;
};

type SenseSelectionModalProps = {
  lemma: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (senseId: string, entry: LexiconEntry) => void;
  onSelectCustom?: (lemma: string, translation: string | null) => void; // For custom/unverified words
  lessonId?: string; // Optional: if adding from lesson context
};

export default function SenseSelectionModal({
  lemma,
  isOpen,
  onClose,
  onSelect,
  onSelectCustom,
  lessonId,
}: SenseSelectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [entry, setEntry] = useState<LexiconEntry | null>(null);
  const [selectedSenseId, setSelectedSenseId] = useState<string | null>(null);
  const [customTranslation, setCustomTranslation] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !lemma.trim()) {
      setEntry(null);
      setError("");
      setSuccess("");
      setSelectedSenseId(null);
      setShowCustomForm(false);
      setCustomTranslation("");
      setAdding(false);
      return;
    }

    const lookupWord = async (retryCount = 0) => {
      setLoading(true);
      setError("");
      setEntry(null);

      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;

        if (!token) {
          setError("Musisz być zalogowany");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/vocab/lookup-word", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lemma: lemma.trim() }),
        });

        // Handle different HTTP status codes
        if (res.status === 401 || res.status === 403) {
          setError("Błąd autoryzacji. Zaloguj się ponownie.");
          setLoading(false);
          return;
        }

        if (res.status === 500) {
          // Server error - retry once if not already retried
          if (retryCount < 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
            return lookupWord(retryCount + 1);
          }
          setError("Błąd serwera. Spróbuj ponownie za chwilę.");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          setError(errorData.error || `Błąd: HTTP ${res.status}`);
          setLoading(false);
          return;
        }

        const data = await res.json();
        
        // Check if response indicates not found (but not a technical error)
        if (!data.ok) {
          // This is a legitimate "not found" from AI
          setEntry(null);
          setShowCustomForm(true);
          setError(""); // Clear error, show custom form instead
          setLoading(false);
          return;
        }

        if (!data.entry || !data.entry.senses || data.entry.senses.length === 0) {
          // Empty response - retry once if not already retried
          if (retryCount < 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return lookupWord(retryCount + 1);
          }
          // After retry, show custom form
          setEntry(null);
          setShowCustomForm(true);
          setError("");
          setLoading(false);
          return;
        }

        setEntry(data.entry);
        setShowCustomForm(false);
        // Auto-select first sense if only one
        if (data.entry.senses.length === 1) {
          setSelectedSenseId(data.entry.senses[0].id);
        }
      } catch (e: any) {
        // Network error or other exception
        if (retryCount < 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return lookupWord(retryCount + 1);
        }
        setError(e?.message || "Błąd połączenia. Sprawdź połączenie internetowe.");
        setEntry(null);
        setShowCustomForm(true);
      } finally {
        setLoading(false);
      }
    };

    lookupWord();
  }, [isOpen, lemma]);

  const handleSelect = async () => {
    if (!selectedSenseId || !entry) {
      setError("Wybierz znaczenie");
      return;
    }

    setAdding(true);
    setError("");
    setSuccess("");

    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setError("Musisz być zalogowany");
        setAdding(false);
        return;
      }

      // Call add-word API
      const res = await fetch("/api/vocab/add-word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sense_id: selectedSenseId,
          lesson_id: lessonId || undefined, // Include lesson_id if in lesson context
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error("Nie udało się dodać słówka");
      }

      const message = data.already_in_pool
        ? lessonId
          ? "Słówko już było w puli. Przypięto do lekcji."
          : "Słówko już jest w Twojej puli."
        : lessonId
        ? "Słówko dodane do puli i przypięte do lekcji!"
        : "Słówko dodane do puli!";

      setSuccess(message);
      setTimeout(() => {
        onSelect(selectedSenseId, entry);
        onClose();
      }, 1000);
    } catch (e: any) {
      setError(e?.message || "Błąd podczas dodawania słówka");
    } finally {
      setAdding(false);
    }
  };

  const handleSelectCustom = () => {
    if (!onSelectCustom) {
      setError("Dodawanie własnych słów nie jest dostępne");
      return;
    }
    if (!lemma.trim()) {
      setError("Wpisz słówko");
      return;
    }
    onSelectCustom(lemma.trim(), customTranslation.trim() || null);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={(e) => {
        // Close on click outside (on overlay, not on modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-white/20 bg-gray-900/98 backdrop-blur-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-semibold text-white">Wybierz znaczenie</h2>
            {entry && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-bold text-white">{entry.lemma}</span>
                <span className="px-2 py-0.5 rounded-lg border border-emerald-400/40 bg-emerald-400/20 text-emerald-200 text-xs font-semibold">
                  [{entry.pos}]
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 hover:bg-white/20 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-white/75">Wyszukuję słowo w słowniku...</p>
            {entry === null && <p className="text-sm text-white/60 mt-2">Może to chwilę potrwać (AI enrichment)</p>}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl border-2 border-rose-400/50 bg-rose-400/20 p-4 mb-4">
            <p className="text-sm text-rose-100 font-medium">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-2xl border-2 border-emerald-400/50 bg-emerald-400/20 p-4 mb-4">
            <p className="text-sm text-emerald-100 font-medium">{success}</p>
          </div>
        )}

        {/* Warning for __NEEDS_HUMAN__ senses */}
        {entry && entry.senses.some((s) => s.translation_pl === "__NEEDS_HUMAN__") && (
          <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4 mb-4">
            <p className="text-sm text-amber-100 font-semibold">Uwaga: Niektóre znaczenia wymagają ręcznego tłumaczenia</p>
            <p className="text-xs text-amber-200/80 mt-1">
              System nie mógł wygenerować krótkiego ekwiwalentu słownikowego. Możesz dodać własne słowo z ręcznym tłumaczeniem.
            </p>
          </div>
        )}

        {/* Custom word form (when AI didn't return data) */}
        {showCustomForm && !loading && (
          <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4 mb-4 space-y-3">
            <div>
              <p className="text-sm text-amber-100 font-semibold">Nie znaleziono tego słowa w słowniku.</p>
              <p className="text-xs text-amber-200/80 mt-1">
                Automatyczne tłumaczenie, przykłady i weryfikacja nie będą dostępne.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-white/90">Tłumaczenie (opcjonalnie)</label>
              <input
                type="text"
                value={customTranslation}
                onChange={(e) => setCustomTranslation(e.target.value)}
                placeholder="np. piłka, bal"
                className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectCustom}
                className="flex-1 rounded-xl border-2 border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-400/20 transition"
              >
                Dodaj własne
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Senses List */}
        {entry && entry.senses.length > 0 && (
          <div className="space-y-4 mb-6">
            {entry.senses
              .filter((sense) => sense.translation_pl !== "__NEEDS_HUMAN__")
              .map((sense) => (
              <button
                key={sense.id}
                onClick={() => setSelectedSenseId(sense.id)}
                className={`w-full text-left rounded-2xl border-2 p-5 transition ${
                  selectedSenseId === sense.id
                    ? "border-sky-400/60 bg-sky-400/15 shadow-lg shadow-sky-400/10"
                    : "border-white/15 bg-gray-800/80 hover:border-white/25 hover:bg-gray-800/90"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedSenseId === sense.id
                        ? "border-sky-400 bg-sky-400"
                        : "border-white/40 bg-transparent"
                    }`}
                  >
                    {selectedSenseId === sense.id && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Lemma + POS */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-bold text-white">{entry.lemma}</span>
                      <span className="px-3 py-1 rounded-lg border-2 border-emerald-400/40 bg-emerald-400/20 text-emerald-200 text-sm font-semibold">
                        [{sense.pos || entry.pos}]
                      </span>
                      {sense.domain && (
                        <span className="px-2 py-1 rounded-lg border border-white/20 bg-white/10 text-white/70 text-xs">
                          {sense.domain}
                        </span>
                      )}
                    </div>

                    {/* Translation PL - KEY INFORMATION, very prominent */}
                    <div className="rounded-xl border-2 border-emerald-400/50 bg-emerald-400/15 px-4 py-3">
                      <div className="text-xs text-emerald-200/80 font-medium mb-1 uppercase tracking-wide">Tłumaczenie</div>
                      <div className="text-xl text-emerald-100 font-bold leading-relaxed">
                        {sense.translation_pl || <span className="text-white/50 italic">Brak tłumaczenia</span>}
                      </div>
                    </div>

                    {/* Definition EN - bold */}
                    <div className="text-sm text-white font-semibold leading-relaxed">{sense.definition_en}</div>

                    {/* Example EN */}
                    {sense.example_en && (
                      <div className="text-sm text-white/80 italic leading-relaxed">"{sense.example_en}"</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Verb Forms (if verb) - Simplified format */}
        {entry && entry.pos === "verb" && entry.verb_forms && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
            <h3 className="text-sm font-medium text-white/90 mb-3">Odmiana czasownika</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-white/70">Present Simple:</span>
                <div className="text-white/90 font-mono mt-1">
                  I {entry.verb_forms.present_simple_i}, He/She/It {entry.verb_forms.present_simple_he_she_it}
                </div>
              </div>
              <div>
                <span className="text-white/70">Past Simple:</span>
                <div className="text-white/90 font-mono mt-1">{entry.verb_forms.past_simple}</div>
              </div>
              <div>
                <span className="text-white/70">Past Participle:</span>
                <div className="text-white/90 font-mono mt-1">{entry.verb_forms.past_participle}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <a
                href="/app/grammar"
                className="text-xs text-sky-300 hover:text-sky-200 underline"
              >
                Po więcej sprawdź: Gramatyka →
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2 font-medium text-white/75 hover:bg-white/10 hover:text-white transition"
          >
            Anuluj
          </button>
          {entry && entry.senses.length > 0 && (
            <button
              onClick={handleSelect}
              disabled={!selectedSenseId || adding}
              className="flex-1 rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {adding ? "Dodaję..." : lessonId ? "Dodaj do lekcji" : "Dodaj do puli"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render modal via portal to body to avoid overflow-hidden issues
  return createPortal(modalContent, document.body);
}
