import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl p-6 sm:p-8">{children}</div>
    </div>
  );
}
