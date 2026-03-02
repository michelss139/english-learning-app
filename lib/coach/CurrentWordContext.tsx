"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type CurrentWordContextValue = {
  currentLemma: string | null;
  setCurrentLemma: (lemma: string | null) => void;
};

const CurrentWordContext = createContext<CurrentWordContextValue | null>(null);

export function CurrentWordProvider({ children }: { children: ReactNode }) {
  const [currentLemma, setCurrentLemma] = useState<string | null>(null);
  const value: CurrentWordContextValue = {
    currentLemma,
    setCurrentLemma: useCallback((lemma) => setCurrentLemma(lemma), []),
  };
  return (
    <CurrentWordContext.Provider value={value}>
      {children}
    </CurrentWordContext.Provider>
  );
}

export function useCurrentWord() {
  const ctx = useContext(CurrentWordContext);
  return ctx ?? { currentLemma: null, setCurrentLemma: () => {} };
}
