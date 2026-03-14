import type { SupabaseClient } from "@supabase/supabase-js";
import { LEMMA_FAMILIES } from "@/lib/vocab/lemmaFamilies";

export type ClusterTaskType = "choice" | "correction" | "translation";
export type ClusterMasteryState = "new" | "building" | "stable" | "mastered";

export type ClusterPattern = {
  id: string;
  title: string;
  pattern_en: string;
  pattern_pl: string | null;
  usage_note: string | null;
  contrast_note: string | null;
  sort_order: number;
};

export type ClusterMastery = {
  practiced_days: number;
  stable_days: number;
  latest_activity_date: string | null;
  rolling_accuracy: number | null;
  mastery_state: ClusterMasteryState;
};

export type ClusterCatalogItem = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
  unlocked: boolean;
  unlocked_at: string | null;
  pinned: boolean;
  theory_available: boolean;
  patterns_count: number;
  examples_count: number;
  tasks_count: number;
  mastery: ClusterMastery;
};

type ClusterBaseRow = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
  theory_md?: string | null;
  theory_summary?: string | null;
  learning_goal?: string | null;
  display_order?: number | null;
};

type ClusterTaskRow = {
  id: string;
  prompt: string;
  slot: string | null;
  choices: string[] | null;
  explanation: string | null;
  correct_choice: string | null;
  task_type: ClusterTaskType | null;
  instruction: string | null;
  source_text: string | null;
  expected_answer: string | null;
  accepted_answers: string[] | null;
  target_tokens: string[] | null;
  sort_order: number | null;
  is_active: boolean | null;
  last_used_at?: string | null;
};

export type ClusterTask = {
  id: string;
  prompt: string;
  slot?: string;
  explanation?: string | null;
  task_type: ClusterTaskType;
  instruction?: string | null;
  source_text?: string | null;
  expected_answer?: string | null;
  accepted_answers?: string[];
  target_tokens?: string[];
  choices: string[];
  correct_choice?: string;
  sort_order: number;
};

type ClusterTaskValidationShape = {
  task_type?: ClusterTaskType | null;
  correct_choice?: string | null;
  expected_answer?: string | null;
  accepted_answers?: string[] | null;
  target_tokens?: string[] | null;
  explanation?: string | null;
};

export type ClusterPageData = {
  cluster: {
    id: string;
    slug: string;
    title: string;
    is_recommended: boolean;
    is_unlockable: boolean;
    unlocked: boolean;
    unlocked_at: string | null;
    theory_md: string | null;
    theory_summary: string | null;
    learning_goal: string | null;
    display_order: number;
    mastery: ClusterMastery;
  };
  patterns: ClusterPattern[];
  tasks: ClusterTask[];
};

type ClusterPageLoadResult =
  | { status: "not_found" }
  | { status: "ok"; data: ClusterPageData };

type MasteryEventRow = {
  context_id: string | null;
  created_at: string;
  is_correct: boolean | null;
};

type CountRow = {
  cluster_id: string;
  is_active?: boolean | null;
};

const VISIBLE_VOCAB_CLUSTER_SLUGS = new Set(["make-do", "bring-take", "hear-listen", "say-tell"]);
const CLUSTER_SESSION_SIZE = 10;
const CLUSTER_TARGET_COUNTS: Record<ClusterTaskType, number> = {
  choice: 6,
  correction: 0,
  translation: 4,
};

const EMPTY_MASTERY: ClusterMastery = {
  practiced_days: 0,
  stable_days: 0,
  latest_activity_date: null,
  rolling_accuracy: null,
  mastery_state: "new",
};

export function normalizeClusterAnswer(value: string): string {
  return value
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,!?]+$/g, "")
    .toLowerCase();
}

export function tokenizeClusterAnswer(value: string): string[] {
  const normalized = value
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? normalized.split(" ") : [];
}

function expandLemmaFamily(token: string): string[] {
  const normalized = normalizeClusterAnswer(token);
  if (!normalized) return [];
  if (LEMMA_FAMILIES[normalized]) return LEMMA_FAMILIES[normalized];

  return [normalized];
}

export function extractClusterKeyPhrase(explanation: string | null | undefined): string | null {
  if (!explanation) return null;

  const match = explanation.match(/(?:kluczowe połączenie|key phrase)\s*:\s*(.+)$/i);
  if (!match?.[1]) return null;

  const normalized = normalizeClusterAnswer(match[1]);
  return normalized || null;
}

export function isClusterTaskAnswerCorrect(task: ClusterTaskValidationShape, submittedAnswer: string): boolean {
  const result = evaluateClusterTranslation(task, submittedAnswer);
  return result.cluster_correct;
}

export type TranslationDiffItem = {
  index: number;
  user: string;
  expected: string;
};

export type TranslationEvaluationResult = {
  cluster_correct: boolean;
  sentence_exact: boolean;
  diff: TranslationDiffItem[];
};

function isExactMatch(
  task: ClusterTaskValidationShape,
  normalizedSubmitted: string,
): boolean {
  const acceptedAnswers = Array.from(
    new Set(
      ((task.accepted_answers ?? [task.expected_answer ?? task.correct_choice ?? ""]) as string[])
        .map((item) => normalizeClusterAnswer(item))
        .filter(Boolean),
    ),
  );
  return acceptedAnswers.includes(normalizedSubmitted);
}

function normalizeSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeNormalizedSentence(s: string): string[] {
  const normalized = normalizeSentence(s);
  return normalized ? normalized.split(" ") : [];
}

export function computeTranslationDiff(
  userAnswer: string,
  expectedAnswer: string,
): TranslationDiffItem[] {
  const userNorm = tokenizeNormalizedSentence(userAnswer);
  const expectedNorm = tokenizeNormalizedSentence(expectedAnswer);
  const userDisplay = userAnswer.trim().split(/\s+/).filter(Boolean);
  const expectedDisplay = expectedAnswer.trim().split(/\s+/).filter(Boolean);
  const diff: TranslationDiffItem[] = [];
  const maxLen = Math.max(userNorm.length, expectedNorm.length);
  for (let i = 0; i < maxLen; i++) {
    const u = userNorm[i];
    const e = expectedNorm[i];
    if (u !== e) {
      diff.push({
        index: i,
        user: userDisplay[i] ?? u ?? "",
        expected: expectedDisplay[i] ?? e ?? "",
      });
    }
  }
  return diff;
}

export function evaluateClusterTranslation(
  task: ClusterTaskValidationShape,
  submittedAnswer: string,
): TranslationEvaluationResult {
  const taskType = task.task_type ?? "choice";
  const normalizedSubmitted = normalizeClusterAnswer(submittedAnswer);
  const canonicalAnswer = task.expected_answer ?? task.correct_choice ?? "";

  if (taskType !== "translation") {
    const clusterCorrect =
      taskType === "choice"
        ? normalizedSubmitted === normalizeClusterAnswer(task.correct_choice ?? "")
        : isExactMatch(task, normalizedSubmitted);
    return {
      cluster_correct: clusterCorrect,
      sentence_exact: clusterCorrect,
      diff: [],
    };
  }

  if (!normalizedSubmitted) {
    return { cluster_correct: false, sentence_exact: false, diff: [] };
  }

  const exactMatch = isExactMatch(task, normalizedSubmitted);

  const acceptedAnswers = Array.from(
    new Set(
      ((task.accepted_answers ?? [task.expected_answer ?? task.correct_choice ?? ""]) as string[])
        .map((item) => normalizeClusterAnswer(item))
        .filter(Boolean),
    ),
  );

  let clusterCorrect = acceptedAnswers.includes(normalizedSubmitted);
  if (!clusterCorrect) {
    const submittedTokens = new Set(tokenizeClusterAnswer(submittedAnswer));
    const expandedTargetTokens = Array.from(
      new Set(((task.target_tokens ?? []) as string[]).flatMap((token) => expandLemmaFamily(token))),
    );
    if (expandedTargetTokens.some((token) => submittedTokens.has(token))) {
      clusterCorrect = true;
    }
    if (!clusterCorrect) {
      const keyPhrase = extractClusterKeyPhrase(task.explanation);
      if (keyPhrase && normalizedSubmitted.includes(keyPhrase)) {
        clusterCorrect = true;
      }
    }
  }

  const diff =
    clusterCorrect && !exactMatch && canonicalAnswer
      ? computeTranslationDiff(submittedAnswer, canonicalAnswer)
      : [];

  return {
    cluster_correct: clusterCorrect,
    sentence_exact: exactMatch,
    diff,
  };
}

function deriveAcceptedAnswers(task: ClusterTaskRow): string[] {
  const raw = task.accepted_answers?.length
    ? task.accepted_answers
    : [task.expected_answer ?? task.correct_choice ?? ""];

  return Array.from(new Set(raw.map((item) => normalizeClusterAnswer(item)).filter(Boolean)));
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function sampleRows<T>(pool: T[], count: number): { picked: T[]; rest: T[] } {
  if (count <= 0 || pool.length === 0) return { picked: [], rest: [...pool] };

  const working = [...pool];
  const picked: T[] = [];

  while (picked.length < count && working.length > 0) {
    const candidateWindow = Math.min(working.length, Math.max(count * 3, count));
    const candidateIndex = Math.floor(Math.random() * candidateWindow);
    picked.push(working.splice(candidateIndex, 1)[0]);
  }

  return { picked, rest: working };
}

function inferAnswerFamilyFromText(text: string | null | undefined): "make" | "do" | null {
  if (!text) return null;
  const normalized = normalizeClusterAnswer(text);
  const tokens = normalized.split(/[^a-z']+/).filter(Boolean);

  if (tokens.some((token) => ["make", "makes", "made", "making"].includes(token))) {
    return "make";
  }
  if (tokens.some((token) => ["do", "does", "did", "done", "doing"].includes(token))) {
    return "do";
  }
  return null;
}

function inferTaskAnswerFamily(task: ClusterTaskRow): "make" | "do" | null {
  return (
    inferAnswerFamilyFromText(task.correct_choice) ??
    inferAnswerFamilyFromText(task.expected_answer) ??
    task.accepted_answers?.map((item) => inferAnswerFamilyFromText(item)).find(Boolean) ??
    inferAnswerFamilyFromText(task.prompt) ??
    inferAnswerFamilyFromText(task.source_text)
  );
}

function deriveChoicePatternKey(task: ClusterTaskRow): string {
  const source = (task.prompt || task.source_text || task.expected_answer || "").toLowerCase();
  const tokens = source.match(/[a-z_']+/g) ?? [];
  const markerIndex = tokens.findIndex(
    (token) => token === "__" || ["make", "makes", "made", "making", "do", "does", "did", "done", "doing"].includes(token),
  );

  const trailing = markerIndex >= 0 ? tokens.slice(markerIndex + 1) : tokens;
  const stopwords = new Set([
    "a",
    "an",
    "the",
    "my",
    "your",
    "his",
    "her",
    "our",
    "their",
    "some",
    "me",
    "to",
    "for",
    "at",
    "on",
    "in",
    "of",
    "this",
    "that",
    "these",
    "those",
  ]);
  const meaningful = trailing.filter((token) => token !== "__" && !stopwords.has(token));
  const signature = meaningful.slice(0, 2);

  if (signature.length > 0) return signature.join(" ");
  if (trailing.length > 0) return trailing.slice(0, 2).join(" ");
  return source;
}

function selectBalancedChoiceTasks(rows: ClusterTaskRow[], targetCount: number): { selected: ClusterTaskRow[]; remaining: ClusterTaskRow[] } {
  if (targetCount <= 0 || rows.length === 0) return { selected: [], remaining: [...rows] };

  const families = new Map<string, ClusterTaskRow[]>();
  for (const row of rows) {
    const family = inferTaskAnswerFamily(row) ?? "other";
    const bucket = families.get(family) ?? [];
    bucket.push(row);
    families.set(family, bucket);
  }

  const remainingBuckets = new Map<string, ClusterTaskRow[]>(
    Array.from(families.entries()).map(([family, bucket]) => [family, [...bucket]]),
  );
  const selected: ClusterTaskRow[] = [];
  const selectedIds = new Set<string>();
  let familyOrder = shuffleArray(Array.from(remainingBuckets.keys()));

  while (selected.length < targetCount) {
    familyOrder = familyOrder.filter((family) => (remainingBuckets.get(family) ?? []).length > 0);
    if (familyOrder.length === 0) break;

    for (const family of familyOrder) {
      const bucket = remainingBuckets.get(family) ?? [];
      if (bucket.length === 0 || selected.length >= targetCount) continue;
      const { picked, rest } = sampleRows(bucket, 1);
      if (picked[0]) {
        selected.push(picked[0]);
        selectedIds.add(picked[0].id);
      }
      remainingBuckets.set(family, rest);
    }

    familyOrder = shuffleArray(familyOrder);
  }

  const remaining = rows.filter((row) => !selectedIds.has(row.id));
  return { selected, remaining };
}

function orderChoiceTasks(rows: ClusterTaskRow[]): ClusterTaskRow[] {
  const remaining = [...rows];
  const ordered: ClusterTaskRow[] = [];
  let previousFamily: string | null = null;
  let previousPattern: string | null = null;

  while (remaining.length > 0) {
    const scored = remaining.map((row, index) => {
      const family = inferTaskAnswerFamily(row) ?? "other";
      const pattern = deriveChoicePatternKey(row);
      let score = Math.random();
      if (family !== previousFamily) score += 4;
      if (pattern !== previousPattern) score += 4;
      if ((row.last_used_at ?? "") === "") score += 1;
      return { row, index, family, pattern, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];
    ordered.push(winner.row);
    previousFamily = winner.family;
    previousPattern = winner.pattern;
    remaining.splice(winner.index, 1);
  }

  return ordered;
}

function buildTypeOrder(counts: Record<ClusterTaskType, number>): ClusterTaskType[] {
  const remaining = { ...counts };
  const order: ClusterTaskType[] = [];
  let previous: ClusterTaskType | null = null;

  while (true) {
    const available = (Object.keys(remaining) as ClusterTaskType[]).filter((type) => remaining[type] > 0);
    if (available.length === 0) break;

    const preferred = available.filter((type) => type !== previous);
    const candidates = preferred.length > 0 ? preferred : available;
    const maxRemaining = Math.max(...candidates.map((type) => remaining[type]));
    const heavy = candidates.filter((type) => remaining[type] === maxRemaining);
    const nextType = heavy[Math.floor(Math.random() * heavy.length)];

    order.push(nextType);
    remaining[nextType] -= 1;
    previous = nextType;
  }

  return order;
}

function composeClusterSession(rows: ClusterTaskRow[]): ClusterTaskRow[] {
  const activeRows = rows.filter((row) => row.is_active !== false && (row.task_type ?? "choice") !== "correction");
  if (activeRows.length === 0) return [];

  const pools: Record<ClusterTaskType, ClusterTaskRow[]> = {
    choice: activeRows.filter((row) => (row.task_type ?? "choice") === "choice"),
    correction: [],
    translation: activeRows.filter((row) => row.task_type === "translation"),
  };

  const selected: Record<ClusterTaskType, ClusterTaskRow[]> = {
    choice: [],
    correction: [],
    translation: [],
  };

  const choicePick = selectBalancedChoiceTasks(pools.choice, Math.min(CLUSTER_TARGET_COUNTS.choice, pools.choice.length));
  selected.choice = orderChoiceTasks(choicePick.selected);
  pools.choice = choicePick.remaining;

  for (const type of ["translation"] as const) {
    const { picked, rest } = sampleRows(pools[type], Math.min(CLUSTER_TARGET_COUNTS[type], pools[type].length));
    selected[type] = shuffleArray(picked);
    pools[type] = rest;
  }

  while (Object.values(selected).reduce((sum, items) => sum + items.length, 0) < CLUSTER_SESSION_SIZE) {
    const candidates = (Object.keys(pools) as ClusterTaskType[])
      .filter((type) => type !== "correction" && pools[type].length > 0)
      .sort((a, b) => selected[a].length - selected[b].length);

    if (candidates.length === 0) break;

    const nextType = candidates[0];
    if (nextType === "choice") {
      const balanced = selectBalancedChoiceTasks(pools.choice, 1);
      const picked = balanced.selected[0];
      if (!picked) break;
      selected.choice.push(picked);
      selected.choice = orderChoiceTasks(selected.choice);
      pools.choice = balanced.remaining;
    } else {
      const { picked, rest } = sampleRows(pools[nextType], 1);
      if (!picked[0]) break;
      selected[nextType].push(picked[0]);
      pools[nextType] = rest;
    }
  }

  const typeOrder = buildTypeOrder({
    choice: selected.choice.length,
    correction: 0,
    translation: selected.translation.length,
  });

  const finalPools: Record<ClusterTaskType, ClusterTaskRow[]> = {
    choice: [...selected.choice],
    correction: [],
    translation: shuffleArray(selected.translation),
  };

  return typeOrder.map((type) => finalPools[type].shift()).filter((task): task is ClusterTaskRow => Boolean(task));
}

function serializeTask(row: ClusterTaskRow, includeAnswers: boolean): ClusterTask {
  const taskType = row.task_type ?? "choice";
  const acceptedAnswers = deriveAcceptedAnswers(row);

  return {
    id: row.id,
    prompt: row.prompt,
    slot: row.slot ?? undefined,
    explanation: row.explanation ?? null,
    task_type: taskType,
    instruction: row.instruction ?? null,
    source_text: row.source_text ?? null,
    expected_answer: includeAnswers ? row.expected_answer ?? row.correct_choice ?? null : undefined,
    accepted_answers: includeAnswers ? acceptedAnswers : undefined,
    target_tokens: includeAnswers ? row.target_tokens ?? undefined : undefined,
    choices: taskType === "choice" ? row.choices ?? [] : [],
    correct_choice: includeAnswers ? row.correct_choice ?? undefined : undefined,
    sort_order: row.sort_order ?? 0,
  };
}

function computeMasteryFromEvents(events: MasteryEventRow[]): ClusterMastery {
  if (events.length === 0) return EMPTY_MASTERY;

  const byDay = new Map<string, { total: number; correct: number }>();
  let totalAnswers = 0;
  let correctAnswers = 0;
  let latestActivityDate: string | null = null;

  for (const event of events) {
    const activityDate = event.created_at.slice(0, 10);
    const current = byDay.get(activityDate) ?? { total: 0, correct: 0 };
    current.total += 1;
    current.correct += event.is_correct ? 1 : 0;
    byDay.set(activityDate, current);

    totalAnswers += 1;
    correctAnswers += event.is_correct ? 1 : 0;
    if (!latestActivityDate || activityDate > latestActivityDate) {
      latestActivityDate = activityDate;
    }
  }

  const practicedDays = byDay.size;
  const stableDays = Array.from(byDay.values()).filter((day) => day.total > 0 && day.correct / day.total >= 0.8).length;
  const rollingAccuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : null;

  let masteryState: ClusterMasteryState = "building";
  if (practicedDays === 0) {
    masteryState = "new";
  } else if (stableDays >= 3 && (rollingAccuracy ?? 0) >= 0.85) {
    masteryState = "mastered";
  } else if (stableDays >= 2) {
    masteryState = "stable";
  } else if (practicedDays <= 1) {
    masteryState = "building";
  }

  return {
    practiced_days: practicedDays,
    stable_days: stableDays,
    latest_activity_date: latestActivityDate,
    rolling_accuracy: rollingAccuracy,
    mastery_state: masteryState,
  };
}

async function loadMasteryMap(
  supabase: SupabaseClient,
  studentId: string,
  slugs: string[],
): Promise<Map<string, ClusterMastery>> {
  if (slugs.length === 0) return new Map();

  const { data, error } = await supabase
    .from("vocab_answer_events")
    .select("context_id, created_at, is_correct")
    .eq("student_id", studentId)
    .eq("context_type", "vocab_cluster")
    .in("context_id", slugs)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return new Map(slugs.map((slug) => [slug, EMPTY_MASTERY]));
  }

  const grouped = new Map<string, MasteryEventRow[]>();
  for (const row of data as MasteryEventRow[]) {
    const slug = row.context_id;
    if (!slug) continue;
    const items = grouped.get(slug) ?? [];
    items.push(row);
    grouped.set(slug, items);
  }

  return new Map(slugs.map((slug) => [slug, computeMasteryFromEvents(grouped.get(slug) ?? [])]));
}

export async function loadClusterMasterySnapshot(
  supabase: SupabaseClient,
  studentId: string,
  slug: string,
): Promise<ClusterMastery> {
  const masteryMap = await loadMasteryMap(supabase, studentId, [slug]);
  return masteryMap.get(slug) ?? EMPTY_MASTERY;
}

function ensureClusterUnlocked(
  _supabase: SupabaseClient,
  _studentId: string,
  _cluster: ClusterBaseRow,
): { unlocked: boolean; unlocked_at: string | null; newly_unlocked: boolean } {
  return { unlocked: true, unlocked_at: null, newly_unlocked: false };
}

export async function loadClusterCatalog(params: {
  supabase: SupabaseClient;
  studentId: string;
  pinnedSlugs?: Set<string>;
}): Promise<{ clusters: ClusterCatalogItem[] }> {
  const { supabase, studentId, pinnedSlugs = new Set<string>() } = params;

  const { data: clustersRaw, error: clustersErr } = await supabase
    .from("vocab_clusters")
    .select(
      "id, slug, title, is_recommended, is_unlockable, theory_summary, learning_goal, display_order",
    )
    .order("display_order", { ascending: true })
    .order("is_recommended", { ascending: false })
    .order("title");

  if (clustersErr) {
    throw new Error(clustersErr.message);
  }

  const clusters = ((clustersRaw ?? []) as ClusterBaseRow[]).filter((cluster) => VISIBLE_VOCAB_CLUSTER_SLUGS.has(cluster.slug));

  const patternRows = await supabase.from("vocab_cluster_patterns").select("cluster_id");
  const taskRows = await supabase.from("vocab_cluster_questions").select("cluster_id, is_active");

  const countByClusterId = (rows: CountRow[] | null | undefined, onlyActive = false) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      if (onlyActive && row.is_active === false) continue;
      counts.set(row.cluster_id, (counts.get(row.cluster_id) ?? 0) + 1);
    }
    return counts;
  };

  const patternsCount = countByClusterId(patternRows.data as CountRow[]);
  const tasksCount = countByClusterId(taskRows.data as CountRow[], true);
  const masteryMap = await loadMasteryMap(
    supabase,
    studentId,
    clusters.map((cluster) => cluster.slug),
  );

  const payload: ClusterCatalogItem[] = [];
  for (const cluster of clusters) {
    const unlockState = ensureClusterUnlocked(supabase, studentId, cluster);

    payload.push({
      id: cluster.id,
      slug: cluster.slug,
      title: cluster.title,
      is_recommended: cluster.is_recommended,
      is_unlockable: cluster.is_unlockable,
      unlocked: unlockState.unlocked,
      unlocked_at: unlockState.unlocked_at,
      pinned: pinnedSlugs.has(cluster.slug),
      theory_available: Boolean(cluster.theory_summary || cluster.learning_goal),
      patterns_count: patternsCount.get(cluster.id) ?? 0,
      examples_count: 0,
      tasks_count: tasksCount.get(cluster.id) ?? 0,
      mastery: masteryMap.get(cluster.slug) ?? EMPTY_MASTERY,
    });
  }

  return { clusters: payload };
}

export async function loadClusterPageData(params: {
  supabase: SupabaseClient;
  studentId: string;
  slug: string;
  limit?: number;
  includeAnswers?: boolean;
}): Promise<ClusterPageLoadResult> {
  const { supabase, studentId, slug, includeAnswers = false } = params;

  const { data: clusterRaw, error: clusterErr } = await supabase
    .from("vocab_clusters")
    .select(
      "id, slug, title, is_recommended, is_unlockable, theory_md, theory_summary, learning_goal, display_order",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (clusterErr) {
    throw new Error(clusterErr.message);
  }
  if (!clusterRaw) {
    return { status: "not_found" };
  }

  const cluster = clusterRaw as ClusterBaseRow;
  const unlockState = ensureClusterUnlocked(supabase, studentId, cluster);

  const [patternsRes, tasksRes, masteryMap] = await Promise.all([
    supabase
      .from("vocab_cluster_patterns")
      .select("id, title, pattern_en, pattern_pl, usage_note, contrast_note, sort_order")
      .eq("cluster_id", cluster.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("vocab_cluster_questions")
      .select(
        "id, prompt, slot, choices, explanation, correct_choice, task_type, instruction, source_text, expected_answer, accepted_answers, target_tokens, sort_order, is_active, last_used_at",
      )
      .eq("cluster_id", cluster.id)
      .eq("is_active", true)
      .in("task_type", ["choice", "translation"])
      .order("sort_order", { ascending: true })
      .order("last_used_at", { ascending: true, nullsFirst: true }),
    loadMasteryMap(supabase, studentId, [slug]),
  ]);

  if (patternsRes.error) throw new Error(patternsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const sessionRows = composeClusterSession((tasksRes.data ?? []) as ClusterTaskRow[]);
  const tasks = sessionRows.map((row) => serializeTask(row, includeAnswers));
  const taskIds = tasks.map((task) => task.id);

  if (taskIds.length > 0) {
    try {
      await supabase
        .from("vocab_cluster_questions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", taskIds);
    } catch {
      // ignore rotation failures
    }
  }

  return {
    status: "ok",
    data: {
      cluster: {
        id: cluster.id,
        slug: cluster.slug,
        title: cluster.title,
        is_recommended: cluster.is_recommended,
        is_unlockable: cluster.is_unlockable,
        unlocked: true,
        unlocked_at: unlockState.unlocked_at,
        theory_md: cluster.theory_md ?? null,
        theory_summary: cluster.theory_summary ?? null,
        learning_goal: cluster.learning_goal ?? null,
        display_order: cluster.display_order ?? 0,
        mastery: masteryMap.get(slug) ?? EMPTY_MASTERY,
      },
      patterns: (patternsRes.data ?? []) as ClusterPattern[],
      tasks,
    },
  };
}
