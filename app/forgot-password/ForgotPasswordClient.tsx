"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nieznany błąd");
    }
  };

  return (
    <AuthShell
      title="Odzyskiwanie hasła"
      subtitle="Wyślemy link na Twój adres e-mail. Po kliknięciu ustawisz nowe hasło na bezpiecznej stronie."
      footer={
        <p>
          <Link href="/login" className="font-medium text-sky-700 underline-offset-2 hover:underline">
            Wróć do logowania
          </Link>
        </p>
      }
    >
      {status === "sent" ? (
        <div className="space-y-3 text-sm leading-relaxed text-slate-700">
          <p>
            Jeśli konto dla <span className="font-medium text-slate-900">{email.trim()}</span> istnieje,
            wysłaliśmy wiadomość z linkiem. Sprawdź skrzynkę i folder spam.
          </p>
          <p className="text-slate-500">
            Link otwiera aplikację w tej samej przeglądarce. Jeśli nadal nie możesz się zalogować, upewnij
            się, że w Supabase (Authentication → URL configuration) dodany jest adres{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              …/auth/callback
            </code>{" "}
            w Redirect URLs.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="fp-email" className="text-sm font-medium text-slate-800">
              Adres e-mail
            </label>
            <input
              id="fp-email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none ring-sky-500/0 transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Wysyłam…" : "Wyślij link resetujący"}
          </button>

          {status === "error" && message ? (
            <p className="text-sm text-red-600" role="alert">
              {message}
            </p>
          ) : null}
        </form>
      )}
    </AuthShell>
  );
}
