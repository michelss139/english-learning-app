import { calculateLevelInfo } from "./levels";

export type NewlyAwardedBadge = {
  slug: string;
  title: string;
  description: string | null;
};

export type AwardInput = {
  supabase: any;
  userId: string;
  source: "pack" | "cluster" | "irregular" | "grammar";
  sourceSlug?: string | null;
  sessionId: string;
  dedupeKey: string;
  perfect: boolean;
  meta?: Record<string, any> | null;
  eligibleForAward?: boolean;
  repeatQualified?: boolean;
  badgeContext?: {
    packSlug?: string;
    countMode?: string;
  };
};

export type AwardResult = {
  xp_awarded: number;
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  newly_awarded_badges: NewlyAwardedBadge[];
};

export function getWarsawDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

async function ensureUserXp(supabase: any, userId: string) {
  const { data: existing, error } = await supabase
    .from("user_xp")
    .select("user_id, xp_total, level")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;

  const { data: inserted, error: insertErr } = await supabase
    .from("user_xp")
    .insert({ user_id: userId, xp_total: 0, level: 0 })
    .select("user_id, xp_total, level")
    .single();

  if (insertErr) throw insertErr;
  return inserted;
}

async function awardPackShopBadge(
  supabase: any,
  userId: string,
  packSlug: string | undefined,
  countMode: string | undefined,
  perfect: boolean
): Promise<NewlyAwardedBadge[]> {
  if (packSlug !== "shop" || countMode !== "all" || !perfect) return [];

  const { data: badgeRow, error: badgeErr } = await supabase
    .from("badges")
    .select("id, slug, title, description")
    .eq("slug", "pack_shop_master")
    .eq("is_active", true)
    .maybeSingle();

  if (badgeErr || !badgeRow) return [];

  const { data: existing } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .eq("badge_id", badgeRow.id)
    .maybeSingle();

  if (existing) return [];

  const { error: insertErr } = await supabase.from("user_badges").insert({
    user_id: userId,
    badge_id: badgeRow.id,
    source: "pack",
    source_slug: packSlug,
    meta: { count_mode: countMode, perfect },
  });

  if (insertErr) return [];

  return [
    {
      slug: badgeRow.slug,
      title: badgeRow.title,
      description: badgeRow.description ?? null,
    },
  ];
}

export async function awardXpAndBadges(input: AwardInput): Promise<AwardResult> {
  const {
    supabase,
    userId,
    source,
    sourceSlug = null,
    sessionId,
    dedupeKey,
    perfect,
    meta = null,
    eligibleForAward = true,
    repeatQualified = true,
    badgeContext,
  } = input;

  const awardedOn = getWarsawDateString();

  const { data: latestEvent, error: existingErr } = await supabase
    .from("xp_events")
    .select("awarded_on")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .order("awarded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) throw existingErr;

  const hasAnyAward = !!latestEvent;
  const awardedToday = latestEvent?.awarded_on === awardedOn;

  const userXpRow = await ensureUserXp(supabase, userId);
  let xpTotal = userXpRow.xp_total ?? 0;
  let xpAwarded = 0;
  let newlyAwardedBadges: NewlyAwardedBadge[] = [];

  if (!awardedToday && eligibleForAward && (!hasAnyAward || repeatQualified)) {
    xpAwarded = perfect ? 20 : 10;

    const { error: insertErr } = await supabase.from("xp_events").insert({
      user_id: userId,
      source,
      source_slug: sourceSlug,
      session_id: sessionId,
      awarded_on: awardedOn,
      dedupe_key: dedupeKey,
      xp_awarded: xpAwarded,
      perfect,
      meta,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        xpAwarded = 0;
      } else {
        throw insertErr;
      }
    }

    if (xpAwarded > 0) {
      xpTotal += xpAwarded;
      const levelInfo = calculateLevelInfo(xpTotal);

      const { error: updateErr } = await supabase
        .from("user_xp")
        .update({
          xp_total: xpTotal,
          level: levelInfo.level,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateErr) throw updateErr;

      if (source === "pack" && badgeContext) {
        newlyAwardedBadges = await awardPackShopBadge(
          supabase,
          userId,
          badgeContext.packSlug,
          badgeContext.countMode,
          perfect
        );
      }
    }
  }

  const finalLevelInfo = calculateLevelInfo(xpTotal);

  return {
    xp_awarded: xpAwarded,
    xp_total: xpTotal,
    level: finalLevelInfo.level,
    xp_in_current_level: finalLevelInfo.xp_in_current_level,
    xp_to_next_level: finalLevelInfo.xp_to_next_level,
    newly_awarded_badges: newlyAwardedBadges,
  };
}
