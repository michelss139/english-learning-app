/**
 * Shared display logic for GET /api/suggestions (`top` + `list`).
 * Keeps irregular bundling and display names aligned with the API (no duplicate scoring).
 *
 * Microcopy pattern (display only):
 * - `title` — short hook (3–5 words), conversational Polish
 * - `description` — subtitle: what the user will do (specific, clear)
 */

export type TrainingSuggestion = {
  unitType: string;
  unitId: string;
  priority?: number;
  href: string;
  displayName: string;
  accuracy?: number;
  form?: "past_simple" | "past_participle";
  label?: string;
};

export type TrainingDisplayCard = {
  /** Short hook (title line). */
  title: string;
  /** Subtitle — context / what user will do. */
  description: string;
  href: string;
  irregularItems?: TrainingSuggestion[];
};

function clusterPairForCopy(displayName: string): string {
  return displayName.replace(/\s*\/\s*/g, " vs ").trim();
}

/** True if string looks like a technical slug (no spaces, has hyphen). */
function looksLikeSlug(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && !t.includes(" ") && t.includes("-");
}

function humanizeDisplayFallback(displayName: string): string {
  if (looksLikeSlug(displayName)) {
    return displayName.replace(/-/g, " ");
  }
  return displayName.trim();
}

/**
 * Title hook for a single suggestion (no raw slugs as title).
 */
function titleHookForSuggestion(s: TrainingSuggestion): string {
  switch (s.unitType) {
    case "cluster": {
      const dn = s.displayName.trim();
      const lower = dn.toLowerCase();
      if (lower.includes("hear") && lower.includes("listen")) return "Słyszysz czy słuchasz?";
      const parts = dn.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 2) return "Wybierz właściwe słowo";
      if (looksLikeSlug(dn) || dn.length > 28) return "Ćwiczenie w kontekście";
      return dn.length <= 22 ? dn : "Ćwiczenie w kontekście";
    }
    case "sense":
      return "Twoje słówka";
    case "grammar":
      return "Ćwicz gramatykę";
    case "irregular":
      return "Jedna forma do opanowania";
    default:
      return "Trening dla Ciebie";
  }
}

/**
 * Subtitle — specific context (may include pair / lemma where helpful).
 */
function subtitleForSuggestion(s: TrainingSuggestion): string {
  switch (s.unitType) {
    case "cluster": {
      const pair = clusterPairForCopy(s.displayName);
      if (pair.includes(" vs ")) return `Przećwicz różnicę: ${pair}`;
      const h = humanizeDisplayFallback(s.displayName);
      return `Powtórz i utrwal: ${h}`;
    }
    case "sense":
      return "Powtórz słowa, które już znasz";
    case "grammar": {
      const dn = s.displayName.trim();
      if (dn && !looksLikeSlug(dn)) return `Temat: ${dn}`;
      return "Krótka sesja z zaproponowanego materiału";
    }
    case "irregular": {
      const verb = s.label ?? s.unitId;
      if (s.form === "past_simple") return `Past Simple — forma czasownika „${verb}”`;
      if (s.form === "past_participle") return `Past participle — forma czasownika „${verb}”`;
      return `Przećwicz formę czasownika „${verb}”`;
    }
    default:
      return "Wejdź w trening i utrwal materiał";
  }
}

export function buildIrregularTargetLink(items: TrainingSuggestion[]): string {
  const targetItems = items
    .filter(
      (i): i is TrainingSuggestion & { form: "past_simple" | "past_participle" } =>
        i.unitType === "irregular" && (i.form === "past_simple" || i.form === "past_participle"),
    )
    .slice(0, 5);
  if (targetItems.length === 0) return "/app/irregular-verbs/train";
  const targets = targetItems.map((i) => `${i.unitId}:${i.form}`).join(",");
  return `/app/irregular-verbs/train?mode=targeted&targets=${encodeURIComponent(targets)}`;
}

/** Irregular forms for bundled card: scan `top` first, then `list` (dedupe), so we never drop bundle when `list` is empty but `top` has irregular. */
function collectIrregularFormsForBundle(top: TrainingSuggestion[], list: TrainingSuggestion[]): TrainingSuggestion[] {
  const seen = new Set<string>();
  const out: TrainingSuggestion[] = [];
  for (const s of [...top, ...list]) {
    if (s.unitType !== "irregular") continue;
    if (s.form !== "past_simple" && s.form !== "past_participle") continue;
    const key = `${s.unitId}:${s.form}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 5) break;
  }
  return out;
}

/** Same card set as profile „Twój plan na teraz” (top-driven, list for irregular bundle). */
export function buildDisplayCards(top: TrainingSuggestion[], list: TrainingSuggestion[]): TrainingDisplayCard[] {
  const irregularFromList = collectIrregularFormsForBundle(top, list);

  const hasIrregularInTop = top.some((t) => t.unitType === "irregular");
  const nonIrregularTop = top.filter((t) => t.unitType !== "irregular");

  const cards: TrainingDisplayCard[] = [];

  if (hasIrregularInTop && irregularFromList.length > 0) {
    cards.push({
      title: "Czasowniki nieregularne",
      description: "Przećwicz najtrudniejsze formy",
      href: buildIrregularTargetLink(irregularFromList),
      irregularItems: irregularFromList,
    });
  }

  for (const s of nonIrregularTop) {
    cards.push({
      title: titleHookForSuggestion(s),
      description: subtitleForSuggestion(s),
      href: s.href,
    });
  }

  return cards.slice(0, 2);
}

/**
 * Dashboard: prefer `buildDisplayCards(top, list)`; if empty but `list` has rows, show deduped list items (max 5).
 */
export function buildDashboardTrainingCards(
  top: TrainingSuggestion[],
  list: TrainingSuggestion[],
): TrainingDisplayCard[] {
  const primary = buildDisplayCards(top, list);
  if (primary.length > 0) return primary;

  const seen = new Set<string>();
  const out: TrainingDisplayCard[] = [];
  const fallbackPool = list.length > 0 ? list : top;
  for (const s of fallbackPool) {
    if (seen.has(s.href)) continue;
    seen.add(s.href);
    out.push({
      title: titleHookForSuggestion(s),
      description: subtitleForSuggestion(s),
      href: s.href,
    });
    if (out.length >= 5) break;
  }
  return out;
}
