import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { loadSentenceBuilderVerbs } from "@/lib/grammar/sentence-builder/verbLoader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAvatarUrl } from "@/lib/avatars";
import { CurrentWordProvider } from "@/lib/coach/CurrentWordContext";
import GlobalCoach from "./GlobalCoach";
import AppNav from "./AppNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const [
    {
      data: { user },
    },
    sentenceBuilderVerbs,
  ] = await Promise.all([supabase.auth.getUser(), loadSentenceBuilderVerbs()]);

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    (profile?.username ?? "").trim() ||
    (profile?.email ?? "").split("@")[0] ||
    "Konto";
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, profile?.username ?? profile?.email ?? user.id);
  const isAdmin = profile?.role === "admin";

  return (
    <div className="app-light relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="pointer-events-none absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-sky-100 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[420px] w-[420px] rounded-full bg-indigo-100 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 shrink-0">
            <Link
              href="/app"
              className="text-lg font-semibold tracking-tight text-slate-900 hover:text-slate-700"
              aria-label="LANGBracket — przejdź do dashboardu"
            >
              LANGBracket
            </Link>
            <p className="text-xs text-slate-500">Twoja osobista pomoc w nauce</p>
          </div>
          <AppNav isAdmin={isAdmin} displayName={displayName} avatarSrc={avatarSrc} />
        </div>
      </header>

      <CurrentWordProvider>
        <div className="relative mx-auto max-w-[1100px] px-6 pb-10 pt-[7.25rem] sm:pt-28">{children}</div>
        <GlobalCoach sentenceBuilderVerbs={sentenceBuilderVerbs} />
      </CurrentWordProvider>
    </div>
  );
}
