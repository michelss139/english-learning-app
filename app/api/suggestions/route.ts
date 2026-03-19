import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const MIN_ATTEMPTS = 3;
const MIN_IRREGULAR_RUNS = 2;
const WEAK_THRESHOLD = 0.85;
const RECENT_IRREGULAR_RUNS = 6;
const TOP_LIMIT = 2;
const LIST_LIMIT = 5;

const W_ACCURACY = 10;
const W_WRONG = 0.5;

type KnowledgeRow = {
  unit_type: string;
  unit_id: string;
  correct_count: number | null;
  wrong_count: number | null;
  knowledge_state: string | null;
  last_wrong_at: string | null;
};

type RunRow = {
  irregular_verb_id: string;
  past_simple_correct: boolean;
  past_participle_correct: boolean;
  entered_past_simple: string | null;
  entered_past_participle: string | null;
  created_at: string;
};

type VerbRow = { id: string; base: string };

type Suggestion = {
  unitType: string;
  unitId: string;
  accuracy: number;
  priority: number;
  form?: "past_simple" | "past_participle";
  label?: string;
  href: string;
  displayName: string;
};

type Scored = Suggestion & { _sort: number };

function stateBonus(state: string | null | undefined): number {
  switch (state) {
    case "unstable":
      return 3;
    case "improving":
      return 1;
    default:
      return 0;
  }
}

function recencyBonus(lastWrongAt: string | null): number {
  if (!lastWrongAt) return 0;
  const ms = Date.parse(lastWrongAt);
  if (!Number.isFinite(ms)) return 0;
  const hoursAgo = (Date.now() - ms) / (1000 * 60 * 60);
  if (hoursAgo < 24) return 2;
  if (hoursAgo < 72) return 1;
  return 0;
}

function scorePriority(
  accuracy: number,
  wrongCount: number,
  knowledgeState: string | null,
  lastWrongAt: string | null,
): number {
  return (1 - accuracy) * W_ACCURACY + wrongCount * W_WRONG + stateBonus(knowledgeState) + recencyBonus(lastWrongAt);
}

function buildHref(unitType: string, unitId: string, form?: string): string {
  switch (unitType) {
    case "sense":
      return "/app/vocab";
    case "cluster":
      return `/app/vocab/cluster/${unitId}?autostart=1`;
    case "grammar":
      return `/app/grammar/${unitId}/practice`;
    case "irregular":
      if (form) {
        return `/app/irregular-verbs/train?mode=targeted&targets=${encodeURIComponent(`${unitId}:${form}`)}`;
      }
      return "/app/irregular-verbs/train?focus=auto";
    default:
      return "/app";
  }
}

function buildDisplayName(unitType: string, unitId: string, label?: string, form?: string): string {
  if (unitType === "irregular") {
    const base = label ?? unitId;
    const formLabel =
      form === "past_simple" ? "past simple" : form === "past_participle" ? "past participle" : "";
    return formLabel ? `${base} — ${formLabel}` : `Nieregularne: ${base}`;
  }
  if (unitType === "cluster") return unitId.replace(/-/g, " / ");
  if (unitType === "grammar") {
    return unitId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  if (unitType === "sense") return "Powtórz słówka";
  return unitId;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const scored: Scored[] = [];

    const { data: knowledgeRows, error: knowledgeErr } = await supabase
      .from("user_learning_unit_knowledge")
      .select("unit_type, unit_id, correct_count, wrong_count, knowledge_state, last_wrong_at")
      .eq("student_id", userId)
      .not("unit_type", "is", null)
      .not("unit_id", "is", null);

    const irregularMeta = new Map<
      string,
      { knowledge_state: string | null; last_wrong_at: string | null; wrong_count: number }
    >();

    if (!knowledgeErr && knowledgeRows) {
      for (const row of knowledgeRows as KnowledgeRow[]) {
        if (row.unit_type === "irregular") {
          irregularMeta.set(row.unit_id, {
            knowledge_state: row.knowledge_state,
            last_wrong_at: row.last_wrong_at,
            wrong_count: Number(row.wrong_count) || 0,
          });
          continue;
        }

        const correct = Number(row.correct_count) || 0;
        const wrong = Number(row.wrong_count) || 0;
        const total = correct + wrong;
        if (total < MIN_ATTEMPTS) continue;

        const accuracy = correct / total;
        const priority = scorePriority(accuracy, wrong, row.knowledge_state, row.last_wrong_at);

        scored.push({
          unitType: row.unit_type,
          unitId: row.unit_id,
          accuracy: round2(accuracy),
          priority: round2(priority),
          href: buildHref(row.unit_type, row.unit_id),
          displayName: buildDisplayName(row.unit_type, row.unit_id),
          _sort: priority,
        });
      }
    }

    const { data: runs, error: runsErr } = await supabase
      .from("irregular_verb_runs")
      .select(
        "irregular_verb_id, past_simple_correct, past_participle_correct, entered_past_simple, entered_past_participle, created_at",
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (!runsErr && runs && runs.length > 0) {
      const verbIds = [...new Set((runs as RunRow[]).map((r) => r.irregular_verb_id))];
      const { data: verbs } = await supabase.from("irregular_verbs").select("id, base").in("id", verbIds);

      const verbMap = new Map<string, string>();
      (verbs ?? []).forEach((v: VerbRow) => verbMap.set(v.id, v.base));

      const byVerb = new Map<string, RunRow[]>();
      for (const r of runs as RunRow[]) {
        if (!byVerb.has(r.irregular_verb_id)) byVerb.set(r.irregular_verb_id, []);
        byVerb.get(r.irregular_verb_id)!.push(r);
      }

      for (const [verbId, verbRuns] of byVerb) {
        const base = verbMap.get(verbId) ?? verbId;
        const meta = irregularMeta.get(verbId);

        const psRuns = verbRuns
          .filter((r) => (r.entered_past_simple ?? "").trim().length > 0)
          .slice(0, RECENT_IRREGULAR_RUNS);
        const ppRuns = verbRuns
          .filter((r) => (r.entered_past_participle ?? "").trim().length > 0)
          .slice(0, RECENT_IRREGULAR_RUNS);

        if (psRuns.length >= MIN_IRREGULAR_RUNS) {
          const psCorrect = psRuns.reduce((s, r) => s + (r.past_simple_correct ? 1 : 0), 0);
          const psAcc = psCorrect / psRuns.length;
          if (psAcc < WEAK_THRESHOLD) {
            const lastWrong =
              psRuns.find((r) => !r.past_simple_correct)?.created_at ?? meta?.last_wrong_at ?? null;
            const priority = scorePriority(psAcc, meta?.wrong_count ?? 0, meta?.knowledge_state ?? null, lastWrong);
            scored.push({
              unitType: "irregular",
              unitId: verbId,
              accuracy: round2(psAcc),
              priority: round2(priority),
              form: "past_simple",
              label: base,
              href: buildHref("irregular", verbId, "past_simple"),
              displayName: buildDisplayName("irregular", verbId, base, "past_simple"),
              _sort: priority,
            });
          }
        }

        if (ppRuns.length >= MIN_IRREGULAR_RUNS) {
          const ppCorrect = ppRuns.reduce((s, r) => s + (r.past_participle_correct ? 1 : 0), 0);
          const ppAcc = ppCorrect / ppRuns.length;
          if (ppAcc < WEAK_THRESHOLD) {
            const lastWrong =
              ppRuns.find((r) => !r.past_participle_correct)?.created_at ?? meta?.last_wrong_at ?? null;
            const priority = scorePriority(ppAcc, meta?.wrong_count ?? 0, meta?.knowledge_state ?? null, lastWrong);
            scored.push({
              unitType: "irregular",
              unitId: verbId,
              accuracy: round2(ppAcc),
              priority: round2(priority),
              form: "past_participle",
              label: base,
              href: buildHref("irregular", verbId, "past_participle"),
              displayName: buildDisplayName("irregular", verbId, base, "past_participle"),
              _sort: priority,
            });
          }
        }
      }
    }

    scored.sort((a, b) => b._sort - a._sort);

    const seenHrefs = new Set<string>();
    const top: Suggestion[] = [];
    for (const { _sort, ...item } of scored) {
      if (top.length >= TOP_LIMIT) break;
      if (seenHrefs.has(item.href)) continue;
      seenHrefs.add(item.href);
      top.push(item);
    }

    const list: Suggestion[] = scored.slice(0, LIST_LIMIT).map(({ _sort, ...item }) => item);

    return NextResponse.json({ top, list });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
