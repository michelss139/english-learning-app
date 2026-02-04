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
    "group relative rounded-3xl border border-emerald-100/10 bg-emerald-950/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition";
  const activeClasses = "hover:border-emerald-200/30 hover:bg-emerald-900/40";
  const disabledClasses = "opacity-60 cursor-not-allowed";

  const content = (
    <>
      {badge ? <div className="absolute right-4 top-4">{badge}</div> : null}
      <div className="space-y-2">
        <div className="text-lg font-semibold tracking-tight text-white">{title}</div>
        <p className="text-sm text-emerald-100/70">{description}</p>
      </div>
      <div className="mt-6 text-sm font-medium text-emerald-100/80">
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
