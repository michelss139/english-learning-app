"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  isAdmin: boolean;
  displayName: string;
  avatarSrc: string;
};

function GradientNavItem({
  href,
  label,
  gradient,
  isActive,
}: {
  href: string;
  label: string;
  gradient: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} px-4 py-2 ring-1 ring-inset ring-white/20 transition-all duration-200 hover:-translate-y-px ${
        isActive
          ? "shadow-[0_4px_16px_rgba(15,23,42,0.18)] ring-white/40"
          : "shadow-sm hover:shadow-md"
      }`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <span className="relative text-[15px] font-black tracking-tight drop-shadow-sm" style={{ color: "#fff" }}>
        {label}
      </span>
    </Link>
  );
}

export default function AppNav({ isAdmin, displayName, avatarSrc }: AppNavProps) {
  const pathname = usePathname() || "";

  const lessonsActive = pathname === "/app/lessons" || pathname.startsWith("/app/lessons/");
  const vocabActive = pathname.startsWith("/app/vocab");
  const grammarActive = pathname.startsWith("/app/grammar");
  const storyActive = pathname.startsWith("/app/story-generator");

  return (
    <nav
      className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-2"
      aria-label="Główna nawigacja"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GradientNavItem href="/app/grammar" label="Gramatyka" gradient="from-emerald-400 to-teal-700" isActive={grammarActive} />
        <GradientNavItem href="/app/vocab" label="Słownictwo" gradient="from-sky-400 to-blue-700" isActive={vocabActive} />
        <GradientNavItem href="/app/lessons" label="Lekcje" gradient="from-amber-400 to-orange-500" isActive={lessonsActive} />
        <GradientNavItem href="/app/story-generator" label="Story Generator" gradient="from-indigo-400 to-violet-700" isActive={storyActive} />
        {isAdmin ? (
          <Link
            href="/admin/courses"
            className={`rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
              pathname.startsWith("/admin")
                ? "bg-indigo-900/[0.08] text-indigo-950"
                : "text-indigo-800/90 hover:bg-indigo-900/[0.06] hover:text-indigo-950"
            }`}
          >
            Kursy (CMS)
          </Link>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
        <Link
          href="/app/profile"
          className="flex min-w-0 max-w-[14rem] flex-1 items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 transition-colors hover:bg-slate-900/[0.04] sm:flex-initial"
          aria-label={`Profil: ${displayName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local avatars + arbitrary URLs */}
          <img
            src={avatarSrc}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full border border-slate-200/90 bg-slate-100 object-cover"
          />
          <span className="truncate text-sm font-medium text-slate-700">{displayName}</span>
        </Link>
        <Link
          href="/logout"
          className="shrink-0 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          Wyloguj
        </Link>
      </div>
    </nav>
  );
}
