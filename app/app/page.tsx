import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export default async function StudentDashboardPage() {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const supabase = createSupabaseAdmin();

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, username, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profileRow) {
    redirect("/login");
  }
  if (profileRow.role === "admin") {
    redirect("/admin");
  }

  const { data: streakRow } = await supabase
    .from("user_streaks")
    .select("current_streak,best_streak,last_activity_date")
    .eq("student_id", userId)
    .maybeSingle();

  return (
    <DashboardClient
      profile={{
        id: profileRow.id,
        email: profileRow.email ?? null,
        username: profileRow.username ?? null,
        avatar_url: profileRow.avatar_url ?? null,
      }}
      initialStreak={{
        current_streak: streakRow?.current_streak ?? 0,
        best_streak: streakRow?.best_streak ?? 0,
        last_activity_date: streakRow?.last_activity_date ?? null,
      }}
      initialSuggestion={null}
    />
  );
}
