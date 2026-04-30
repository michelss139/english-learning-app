/** Canonical section order for the user-facing Packs catalog. */

export const DAILY_SECTION_ORDER = [
  "Dom",
  "Jedzenie i zakupy",
  "Ubrania",
  "Ludzie i komunikacja",
  "Emocje",
  "Rozrywka",
  "Podróże i transport",
  "Praca i nauka",
  "Ciało i zdrowie",
  "Technologia",
  "Czas i pogoda",
  "Ogród",
  "Pieniądze",
  "Sport",
  // Legacy English keys kept so older DB metadata still sorts predictably before migration.
  "Home & Life",
  "Food & Shopping",
  "People & Communication",
  "Travel & Transport",
  "Work & Study",
  "Health & Body",
  "Technology",
  "Time & Weather",
] as const;

export const PRECISE_SECTION_ORDER = [
  "Ciało i zdrowie",
  "Biznes i umowy",
  "Dom",
  "Jedzenie i zakupy",
  "Ubrania",
  "Ludzie i komunikacja",
  "Emocje",
  "Rozrywka",
  "Podróże i transport",
  "Praca i nauka",
  "Technologia",
  "Czas i pogoda",
  "Ogród",
  "Pieniądze",
  "Sport",
  // Legacy English keys kept so older DB metadata still sorts predictably before migration.
  "Body & Health",
  "Business & Contracts",
  "Technology",
  "Sports",
  "Transport",
  "Specialist Topics",
] as const;

export const OTHER_SECTION_KEY = "__other__";

/** Polish headings for legacy `display_section` keys and the synthetic Other bucket. */
const DAILY_SECTION_LABELS_PL: Record<string, string> = {
  "Home & Life": "Dom",
  "Food & Shopping": "Jedzenie i zakupy",
  "People & Communication": "Ludzie i komunikacja",
  "Travel & Transport": "Podróże i transport",
  "Work & Study": "Praca i nauka",
  "Health & Body": "Ciało i zdrowie",
  Technology: "Technologia",
  "Time & Weather": "Czas i pogoda",
};

const PRECISE_SECTION_LABELS_PL: Record<string, string> = {
  "Body & Health": "Ciało i zdrowie",
  "Business & Contracts": "Biznes i umowy",
  Technology: "Technologia",
  Sports: "Sport",
  Transport: "Transport",
  "Specialist Topics": "Tematy specjalistyczne",
};

/**
 * User-facing (Polish) label for a catalog section. Unknown keys pass through (e.g. custom admin sections).
 */
export function packSectionLabelPl(sectionKey: string, mode: "daily" | "precise"): string {
  if (sectionKey === OTHER_SECTION_KEY) return "Inne";
  const map = mode === "daily" ? DAILY_SECTION_LABELS_PL : PRECISE_SECTION_LABELS_PL;
  return map[sectionKey] ?? sectionKey;
}

export function compareSectionLabels(a: string, b: string, mode: "daily" | "precise"): number {
  if (a === OTHER_SECTION_KEY && b === OTHER_SECTION_KEY) return 0;
  if (a === OTHER_SECTION_KEY) return 1;
  if (b === OTHER_SECTION_KEY) return -1;
  const order = (mode === "daily" ? DAILY_SECTION_ORDER : PRECISE_SECTION_ORDER) as readonly string[];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

/** featured_rank nulls last, then order_index, then presentation title. */
export function comparePacksForCatalog<T extends { featured_rank: number | null; order_index: number; presentation_title: string }>(
  a: T,
  b: T,
): number {
  const aHas = a.featured_rank != null;
  const bHas = b.featured_rank != null;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  if (aHas && bHas && a.featured_rank !== b.featured_rank) {
    return (a.featured_rank ?? 0) - (b.featured_rank ?? 0);
  }
  if (a.order_index !== b.order_index) return a.order_index - b.order_index;
  return a.presentation_title.localeCompare(b.presentation_title, "en", { sensitivity: "base" });
}
