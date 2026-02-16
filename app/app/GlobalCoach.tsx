"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export default function GlobalCoach() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  const message = useMemo(() => {
    if (pathname?.startsWith("/app/grammar/present-simple")) {
      return "Najczęstszy błąd? DO + czasownik z -s. Nigdy razem.";
    }
    if (pathname?.startsWith("/app/grammar/present-continuous")) {
      return "Jeśli coś dzieje się teraz — potrzebujesz BE + -ING.";
    }
    if (pathname?.startsWith("/app/grammar/past-simple")) {
      return "Jeśli podajesz konkretną datę — prawie zawsze będzie Past Simple.";
    }
    if (pathname?.startsWith("/app/grammar/past-continuous")) {
      return [
        "1) Jeśli opisujesz, co działo się o konkretnej godzinie -> Past Continuous.",
        "2) Jeśli masz \"when\" i coś trwało -> to część z -ing.",
        "3) Jeśli coś nagle się wydarzyło -> to zwykle Past Simple.",
      ].join("\n");
    }
    if (pathname?.startsWith("/app/grammar/present-perfect")) {
      return [
        "1) Jeśli mówisz \"kiedy?\" i podajesz datę -> to nie Present Perfect.",
        "2) Jeśli efekt jest ważny teraz -> użyj Present Perfect.",
        "3) since = punkt w czasie, for = okres.",
      ].join("\n");
    }
    if (pathname?.startsWith("/app/grammar/present-perfect-continuous")) {
      return [
        "1) Jeśli chcesz podkreślić \"jak długo\" -> Continuous.",
        "2) Jeśli liczy się efekt końcowy -> Perfect Simple.",
        "3) Konstrukcja zawsze zawiera \"been\".",
      ].join("\n");
    }
    if (pathname?.startsWith("/app/grammar/past-perfect")) {
      return [
        "1) Jeśli masz dwa wydarzenia w przeszłości -> jedno może być Past Perfect.",
        "2) Po \"had\" zawsze trzecia forma czasownika.",
        "3) Ten czas nie opisuje \"dawno\", tylko \"wcześniej\".",
      ].join("\n");
    }
    if (pathname?.startsWith("/app/grammar/past-perfect-continuous")) {
      return [
        "1) Jeśli podkreślasz długość trwania przed czymś -> Continuous.",
        "2) Po \"had\" zawsze \"been\" + -ing.",
        "3) Jeśli liczy się efekt, nie proces -> użyj Past Perfect.",
      ].join("\n");
    }
    return "Witaj na LANGBracket";
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

  return (
    <div className="fixed top-6 right-6 z-40 max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-line text-sm font-medium text-slate-800">{message}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Zamknij coacha"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

