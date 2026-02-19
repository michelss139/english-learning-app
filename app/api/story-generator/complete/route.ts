import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { awardXpAndBadges } from "@/lib/xp/award";

type Body = {
  session_id: string;
  correct: number;
  total: number;
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 });
    }

    const correct = Number(body.correct ?? 0);
    const total = Number(body.total ?? 0);
    if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0 || correct < 0) {
      return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const award = await awardXpAndBadges({
      supabase,
      userId: userData.user.id,
      source: "grammar",
      sourceSlug: "story-generator",
      sessionId: body.session_id,
      dedupeKey: "grammar:story-generator",
      perfect: true, // fixed +20 XP for this exercise
      meta: {
        correct,
        total,
      },
    });

    return NextResponse.json({ ok: true, ...award });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
