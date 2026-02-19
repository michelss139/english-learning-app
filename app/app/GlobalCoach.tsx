"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type CoachContent = string | string[];

function getCoachContent(pathname: string | null): CoachContent {
  if (!pathname) return "Witaj na LANGBracket";
  if (pathname.startsWith("/app/grammar/present-simple")) {
    return "Najczęstszy błąd? DO + czasownik z -s. Nigdy razem.";
  }
  if (pathname.startsWith("/app/grammar/present-continuous")) {
    return "Jeśli coś dzieje się teraz — potrzebujesz BE + -ING.";
  }
  if (pathname.startsWith("/app/grammar/past-simple")) {
    return "Jeśli podajesz konkretną datę — prawie zawsze będzie Past Simple.";
  }
  if (pathname.startsWith("/app/grammar/past-continuous")) {
    return [
      "Jeśli opisujesz, co działo się o konkretnej godzinie -> Past Continuous.",
      "Jeśli masz \"when\" i coś trwało -> to część z -ing.",
      "Jeśli coś nagle się wydarzyło -> to zwykle Past Simple.",
    ];
  }
  if (pathname.startsWith("/app/grammar/present-perfect")) {
    return [
      "Jeśli mówisz \"kiedy?\" i podajesz datę -> to nie Present Perfect.",
      "Jeśli efekt jest ważny teraz -> użyj Present Perfect.",
      "since = punkt w czasie, for = okres.",
    ];
  }
  if (pathname.startsWith("/app/grammar/present-perfect-continuous")) {
    return [
      "Jeśli chcesz podkreślić \"jak długo\" -> Continuous.",
      "Jeśli liczy się efekt końcowy -> Perfect Simple.",
      "Konstrukcja zawsze zawiera \"been\".",
    ];
  }
  if (pathname.startsWith("/app/grammar/past-perfect")) {
    return [
      "Jeśli masz dwa wydarzenia w przeszłości -> jedno może być Past Perfect.",
      "Po \"had\" zawsze trzecia forma czasownika.",
      "Ten czas nie opisuje \"dawno\", tylko \"wcześniej\".",
    ];
  }
  if (pathname.startsWith("/app/grammar/past-perfect-continuous")) {
    return [
      "Jeśli podkreślasz długość trwania przed czymś -> Continuous.",
      "Po \"had\" zawsze \"been\" + -ing.",
      "Jeśli liczy się efekt, nie proces -> użyj Past Perfect.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-simple")) {
    return [
      "Jeśli decyzja zapada teraz -> użyj will.",
      "Po \"will\" zawsze forma podstawowa.",
      "Jeśli to plan sprzed chwili -> to raczej „going to”.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-continuous")) {
    return [
      "Jeśli mówisz o konkretnej godzinie w przyszłości -> często Continuous.",
      "Po \"will be\" zawsze -ing.",
      "Ten czas opisuje proces, nie decyzję.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-perfect-simple")) {
    return [
      "Jeśli masz \"by + moment w przyszłości\" -> często Future Perfect.",
      "Po \"will have\" zawsze 3. forma.",
      "Ten czas porządkuje przyszłe wydarzenia.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-perfect-continuous")) {
    return [
      "Jeśli masz \"for + czas\" i punkt w przyszłości -> Continuous.",
      "Konstrukcja zawsze zawiera \"been\".",
      "Jeśli liczy się efekt, nie proces -> użyj Future Perfect.",
    ];
  }
  return "Witaj na LANGBracket";
}

export default function GlobalCoach() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  const content = useMemo(() => getCoachContent(pathname), [pathname]);
  const tips = Array.isArray(content) ? content : [content];
  const hasMultipleTips = tips.length > 1;
  const currentMessage = tips[tipIndex] ?? tips[0];

  useEffect(() => {
    setTipIndex(0);
  }, [pathname]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed top-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-medium text-slate-700 shadow-md transition hover:bg-slate-50"
        title="Pokaż coacha"
        aria-label="Pokaż coacha"
      >
        ?
      </button>
    );
  }

  const goPrev = () => setTipIndex((i) => (i <= 0 ? tips.length - 1 : i - 1));
  const goNext = () => setTipIndex((i) => (i >= tips.length - 1 ? 0 : i + 1));

  return (
    <div className="fixed top-6 right-6 z-40 max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {hasMultipleTips && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Poprzedni tip"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={goNext}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Następny tip"
              >
                &#8250;
              </button>
            </>
          )}
          <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">{currentMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Zamknij coacha"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

