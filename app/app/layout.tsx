import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-100">
      {/* Tło: ciemny niebiesko-szary gradient – DELIKATNIE jaśniejszy */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] via-[#1f2a44] to-[#020617]" />

      {/* Subtelny grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Niebieskie plamy – delikatnie jaśniejsze */}
      <div className="absolute -top-48 -left-48 h-[520px] w-[520px] rounded-full bg-sky-400/25 blur-3xl" />
      <div className="absolute top-1/3 -right-48 h-[520px] w-[520px] rounded-full bg-indigo-400/25 blur-3xl" />

      {/* Content shell */}
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 shadow-2xl p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
