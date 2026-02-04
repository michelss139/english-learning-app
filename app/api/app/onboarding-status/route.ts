import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

    const [packRes, clusterRes, irregularRes, anyRes] = await Promise.all([
      supabase
        .from("exercise_session_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("exercise_type", "pack"),
      supabase
        .from("exercise_session_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("exercise_type", "cluster"),
      supabase
        .from("exercise_session_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("exercise_type", "irregular"),
      supabase
        .from("exercise_session_completions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId),
    ]);

    if (packRes.error || clusterRes.error || irregularRes.error || anyRes.error) {
      return NextResponse.json({ error: "Failed to load onboarding stats" }, { status: 500 });
    }

    const hasPack = (packRes.count ?? 0) > 0;
    const hasCluster = (clusterRes.count ?? 0) > 0;
    const hasIrregular = (irregularRes.count ?? 0) > 0;
    const isNew = (anyRes.count ?? 0) === 0;
    const completed = hasPack && hasCluster && hasIrregular;

    return NextResponse.json({
      ok: true,
      is_new_user: isNew,
      steps: {
        packs: hasPack,
        clusters: hasCluster,
        irregular: hasIrregular,
      },
      completed,
    });
  } catch (e: any) {
    console.error("[app/onboarding-status] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
