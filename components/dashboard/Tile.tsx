import Link from "next/link";
import type { ReactNode } from "react";

type TileProps = {
  title: string;
  description: string;
  href?: string;
  badge?: ReactNode;
  disabled?: boolean;
};

export function DashboardTile({ title, description, href, badge, disabled }: TileProps) {
  const baseClasses =
    "group relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition";
  const activeClasses = "hover:border-slate-300 hover:shadow-md";
  const disabledClasses = "opacity-60 cursor-not-allowed";

  const content = (
    <>
      {badge ? <div className="absolute right-4 top-4">{badge}</div> : null}
      <div className="space-y-2">
        <div className="text-lg font-semibold tracking-tight text-slate-900">{title}</div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-6 text-sm font-medium text-slate-600">
        {disabled ? "Wkrótce" : "Otwórz →"}
      </div>
    </>
  );

  if (disabled || !href) {
    return (
      <div className={`${baseClasses} ${disabledClasses}`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={`${baseClasses} ${activeClasses}`}>
      {content}
    </Link>
  );
}
