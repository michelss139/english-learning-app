import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900">
      {/* Tło: jasny niebieski gradient (bez różu) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5f9ff] via-[#eef6ff] to-[#dbeafe]" />

      {/* Subtelny grid (zostaje, ale delikatniejszy) */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.18) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* “plamy” – tylko niebieskie, bez neonów */}
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-300/35 blur-3xl" />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-indigo-300/25 blur-3xl" />

      {/* Content shell */}
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-3xl border-2 border-slate-900/10 bg-white/70 backdrop-blur-xl shadow-xl p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
