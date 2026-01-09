/**
 * Types for Grammar module
 */

export type GrammarTenseSlug =
  | "present-simple"
  | "present-continuous"
  | "past-simple"
  | "past-continuous"
  | "present-perfect"
  | "present-perfect-continuous"
  | "future-simple"
  | "future-continuous"
  | "future-perfect-simple"
  | "future-perfect-continuous";

export type GrammarChip = {
  text: string;
  description?: string; // Tooltip/description on hover
  link?: string; // Optional link
};

export type GrammarAnchor = {
  id: string; // Anchor ID
  title: string; // Display title
};

export type GrammarRelatedLink = {
  slug: GrammarTenseSlug;
  title: string;
  description?: string;
};

export type GrammarComparison = {
  tense1: GrammarTenseSlug;
  tense2: GrammarTenseSlug;
  title: string; // e.g., "Present Simple vs Present Perfect"
  description?: string;
};

export type GrammarTense = {
  slug: GrammarTenseSlug;
  title: string; // e.g., "Present Simple"
  description?: string; // Short description
  content: {
    // IDENTYCZNA struktura sekcji dla wszystkich czasów:
    usage: string; // "Po co używamy"
    characteristicWords: string; // "Charakterystyczne słowa i zwroty"
    structure: {
      affirmative: string; // Struktura twierdzenia
      negative: string; // Struktura przeczenia
      question: string; // Struktura pytania
    };
    auxiliary: string; // "Słówko pomocnicze (auxiliary)"
    confusionWarnings: string; // "Uwaga! To myli"
    commonMistakes: string; // "Typowe błędy (szczególnie pod Polaków)"
    examples: string; // "Przykłady zdań"
    dialog: string; // "Dialog w praktyce"
    chips?: GrammarChip[]; // Clickable chips (characteristic words)
    relatedLinks?: GrammarRelatedLink[]; // "Zobacz też" links
    comparisons?: GrammarComparison[]; // Available comparisons
  };
  practiceLink?: string; // Link to exercises: /app/exercises/[czas]
  courseLink?: string; // Link to video course: /app/courses/[czas]
};

export type GrammarContent = {
  tenses: GrammarTense[];
};
