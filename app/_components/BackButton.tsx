import Link from "next/link";

type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

/**
 * Canonical back button used across the whole app — elegant white card with a
 * subtle border + shadow, same size as the top-nav "Wyloguj" button (text-sm).
 * The whole card reacts to hover (lift + arrow nudge), not just the arrow.
 */
export function BackButton({ href, label = "Wróć", className = "" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md ${className}`}
    >
      <span aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
      {label}
    </Link>
  );
}
