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

    const [
      accRes,
      learnedTotalRes,
      learnedTodayRes,
      learnedWeekRes,
      toLearnTotalRes,
      toLearnTodayRes,
      toLearnWeekRes,
      repeatRes,
    ] = await Promise.all([
      supabase.from("vocab_accuracy_extended").select("*").eq("student_id", student_id).single(),
      supabase.from("vocab_learned_total").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_learned_today").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_learned_week").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_to_learn_total").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_to_learn_today").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_to_learn_week").select("term_en_norm").eq("student_id", student_id),
      supabase.from("vocab_repeat_suggestions").select("term_en_norm, last_correct_at").eq("student_id", student_id),
    ]);

    return NextResponse.json({
      accuracy: accRes.data ?? {
        correct_today: 0,
        total_today: 0,
        correct_3d: 0,
        total_3d: 0,
        correct_7d: 0,
        total_7d: 0,
        correct_14d: 0,
        total_14d: 0,
      },
      learned: {
        today: learnedTodayRes.data ?? [],
        week: learnedWeekRes.data ?? [],
        total: learnedTotalRes.data ?? [],
      },
      toLearn: {
        today: toLearnTodayRes.data ?? [],
        week: toLearnWeekRes.data ?? [],
        total: toLearnTotalRes.data ?? [],
      },
      repeatSuggestions: repeatRes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
