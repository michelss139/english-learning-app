import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Jasna oprawa spójna z dashboardem (/app): tło #f5f7fb, delikatna siatka, plamy sky/indigo.
 * Wymusza „light” niezależnie od trybu systemowego (dark mode na body).
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      className="app-light relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900"
      style={{ colorScheme: "light" }}
    >
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

      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-0.5 px-6 py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
          >
            LANGBracket
          </Link>
          <p className="text-xs text-slate-500">Twoja osobista pomoc w nauce</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-6 pb-16 pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:p-8">
          {children}
        </div>

        {footer ? <div className="mt-8 text-center text-sm text-slate-600">{footer}</div> : null}
      </main>
    </div>
  );
}
