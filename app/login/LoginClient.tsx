"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authCallbackError = searchParams.get("error") === "auth_callback";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error("Nie udało się utworzyć sesji.");

      await getOrCreateProfile();

      router.push("/app");
      router.refresh();
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nieznany błąd");
    }
  };

  return (
    <AuthShell
      title="Witaj ponownie"
      subtitle="Zaloguj się, żeby wrócić do nauki i swojego planu."
      footer={
        <p>
          Nie masz konta?{" "}
          <Link href="/register" className="font-medium text-sky-700 underline-offset-2 hover:underline">
            Zarejestruj się
          </Link>
        </p>
      }
    >
      {authCallbackError ? (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Link z maila wygasł albo nie udało się nawiązać sesji. Poproś o nowy link (reset hasła lub logowanie)
          albo sprawdź w Supabase, czy adres aplikacji <code className="rounded bg-white/80 px-1">/auth/callback</code>{" "}
          jest na liście Redirect URLs.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium text-slate-800">
            E-mail
          </label>
          <input
            id="login-email"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-pass" className="text-sm font-medium text-slate-800">
              Hasło
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              Nie pamiętasz hasła?
            </Link>
          </div>
          <input
            id="login-pass"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Loguję…" : "Zaloguj się"}
        </button>

        {status === "error" && message ? (
          <p className="text-sm text-red-600" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
