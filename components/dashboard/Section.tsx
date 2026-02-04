import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DashboardSection({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-emerald-50">{title}</h2>
        {description ? <p className="text-sm text-emerald-100/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
