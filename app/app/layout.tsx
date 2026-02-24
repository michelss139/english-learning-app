import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import GlobalCoach from "./GlobalCoach";
import GlobalTrainingSuggestion from "./GlobalTrainingSuggestion";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-light min-h-screen relative overflow-hidden bg-[#f5f7fb] text-slate-900">
      {/* Subtelne jasne tlo */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="pointer-events-none absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-sky-100 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[420px] w-[420px] rounded-full bg-indigo-100 blur-3xl" />

      {/* Branding (clean typography, no tile) */}
      <div className="fixed left-6 top-6 z-20">
        <div className="flex flex-col">
          <Link
            href="/app"
            className="text-lg font-semibold tracking-tight text-slate-900 hover:text-slate-700"
            aria-label="LANGBracket — przejdź do dashboardu"
          >
            LANGBracket
          </Link>
          <span className="text-xs text-slate-500">Twoja osobista pomoc w nauce</span>
        </div>
      </div>

      {/* Content shell */}
      <div className="relative mx-auto max-w-[1100px] px-6 pb-10 pt-24">
        {children}
      </div>
      <GlobalCoach />
      <GlobalTrainingSuggestion />
    </div>
  );
}
