import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PastPerfectContinuousClient } from "./PastPerfectContinuousClient";

export default async function PastPerfectContinuousPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <PastPerfectContinuousClient />;
}

