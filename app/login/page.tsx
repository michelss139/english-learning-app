import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/app");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f7fb]">
          <div className="mx-auto max-w-lg px-6 pt-16 text-sm text-slate-500">Ładowanie…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
