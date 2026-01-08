import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const student_id = userData.user.id;

    const [accuracyRes, todayRes, wrongRes, learnedRes, lastRes] = await Promise.all([
      supabase.from("vocab_accuracy_window").select("*").eq("student_id", student_id).single(),
      supabase
        .from("vocab_exercise_runs")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student_id)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from("vocab_most_wrong").select("term_en_norm, wrong_count").eq("student_id", student_id).limit(5),
      supabase.from("vocab_learned").select("term_en_norm, correct_count").eq("student_id", student_id),
      supabase.from("vocab_last_attempts").select("term_en_norm, correct, created_at").eq("student_id", student_id).limit(3),
    ]);

    return NextResponse.json({
      accuracy: accuracyRes.data ?? {
        correct_7d: 0,
        total_7d: 0,
        correct_14d: 0,
        total_14d: 0,
      },
      todayCount: todayRes.count ?? 0,
      mostWrong: wrongRes.data ?? [],
      learned: learnedRes.data ?? [],
      lastAttempts: lastRes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
