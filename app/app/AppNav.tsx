"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  isAdmin: boolean;
  displayName: string;
  avatarSrc: string;
};

function NavItem({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
        isActive
          ? "bg-slate-900/[0.06] text-slate-900"
          : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default function AppNav({ isAdmin, displayName, avatarSrc }: AppNavProps) {
  const pathname = usePathname() || "";

  const dashboardActive = pathname === "/app";
  const lessonsActive = pathname === "/app/lessons" || pathname.startsWith("/app/lessons/");
  const profileActive = pathname.startsWith("/app/profile");
  const settingsActive = pathname.startsWith("/app/settings");

  return (
    <nav
      className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-2"
      aria-label="Główna nawigacja"
    >
      <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
        <NavItem href="/app" label="Dashboard" isActive={dashboardActive} />
        <NavItem href="/app/lessons" label="Lekcje" isActive={lessonsActive} />
        <NavItem href="/app/profile" label="Profil" isActive={profileActive} />
        <NavItem href="/app/settings" label="Ustawienia" isActive={settingsActive} />
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
