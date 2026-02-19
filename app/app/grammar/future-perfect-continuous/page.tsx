import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FuturePerfectContinuousClient } from "./FuturePerfectContinuousClient";

export default async function FuturePerfectContinuousPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <FuturePerfectContinuousClient />;
}
