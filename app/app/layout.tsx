import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden text-white">
      {/* Tło gradientowe */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#831843]" />

      {/* Subtelny grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Blur plamy */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-pink-500/30 blur-3xl" />
      <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
