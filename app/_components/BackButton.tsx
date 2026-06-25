type BackButtonProps = {
  href: string;
  label?: string;
  className?: string;
};

/**
 * Elegant, consistent back button — white card with subtle border + shadow,
 * matching the "Wyloguj" button in the top nav. Same font size (text-sm).
 */
export function BackButton({ href, label = "Wróć", className = "" }: BackButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${className}`}
    >
      <span aria-hidden="true">←</span>
      {label}
    </a>
  );
}
