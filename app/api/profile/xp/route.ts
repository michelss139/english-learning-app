import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateLevelInfo } from "@/lib/xp/levels";

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

    const { data: xpRow, error: xpErr } = await supabase
      .from("user_xp")
      .select("xp_total, level")
      .eq("user_id", userId)
      .maybeSingle();

    if (xpErr) {
      return NextResponse.json({ error: xpErr.message }, { status: 500 });
    }

    const xpTotal = xpRow?.xp_total ?? 0;
    const levelInfo = calculateLevelInfo(xpTotal);

    return NextResponse.json({
      ok: true,
      xp_total: xpTotal,
      level: levelInfo.level,
      xp_in_current_level: levelInfo.xp_in_current_level,
      xp_to_next_level: levelInfo.xp_to_next_level,
    });
  } catch (e: any) {
    console.error("[profile/xp] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
