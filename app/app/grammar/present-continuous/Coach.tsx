"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "grammarCoachHidden";

const TIPS = [
  "Jeśli coś dzieje się teraz — potrzebujesz BE + -ING.",
  "Fakt ogólny? Continuous zwykle nie pasuje.",
  "Plan osobisty? Continuous. Rozkład jazdy? Simple.",
];

export function Coach() {
  const [hidden, setHidden] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setHidden(stored === "true");
    setMounted(true);
  }, []);

  const hideCoach = () => {
    setHidden(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const showCoach = () => {
    setHidden(false);
  };

  const prevTip = () => {
    setTipIndex((i) => (i - 1 + TIPS.length) % TIPS.length);
  };

  const nextTip = () => {
    setTipIndex((i) => (i + 1) % TIPS.length);
  };

  if (!mounted) return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={showCoach}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-medium text-white shadow-lg transition hover:bg-white/20"
        title="Pokaż tip od nauczyciela"
        aria-label="Pokaż tip"
      >
        ?
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-white/20 bg-slate-800/95 p-4 shadow-xl backdrop-blur"
      role="complementary"
      aria-label="Tip od nauczyciela"
    >
      <p className="mb-3 text-sm text-white/95">{TIPS[tipIndex]}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={prevTip}
          className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white hover:bg-white/20"
          aria-label="Poprzedni tip"
        >
          ←
        </button>
        <button
          type="button"
          onClick={nextTip}
          className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white hover:bg-white/20"
          aria-label="Następny tip"
        >
          →
        </button>
        <button
          type="button"
          onClick={hideCoach}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
        >
          Schowaj nauczyciela
        </button>
      </div>
    </div>
  );
}

