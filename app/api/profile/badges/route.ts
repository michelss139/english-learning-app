import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type BadgeRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const { data: badges, error: badgesErr } = await supabase
      .from("badges")
      .select("id, slug, title, description, icon")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (badgesErr) {
      return NextResponse.json({ error: badgesErr.message }, { status: 500 });
    }

    const { data: userBadges, error: userBadgesErr } = await supabase
      .from("user_badges")
      .select("badge_id, awarded_at")
      .eq("user_id", userId);

    if (userBadgesErr) {
      return NextResponse.json({ error: userBadgesErr.message }, { status: 500 });
    }

    const awardedMap = new Map(
      (userBadges ?? []).map((row: any) => [row.badge_id, row.awarded_at ?? null])
    );

    const payload = (badges ?? []).map((badge: BadgeRow) => ({
      slug: badge.slug,
      title: badge.title,
      description: badge.description ?? null,
      icon: badge.icon ?? null,
      earned: awardedMap.has(badge.id),
      awarded_at: awardedMap.get(badge.id) ?? null,
    }));

    return NextResponse.json({ ok: true, badges: payload });
  } catch (e: any) {
    console.error("[profile/badges] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
