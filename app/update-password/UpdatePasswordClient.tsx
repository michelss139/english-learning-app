"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";

export default function UpdatePasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
    };
    run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setStatus("error");
      setMessage("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    if (password !== password2) {
      setStatus("error");
      setMessage("Hasła nie są takie same.");
      return;
    }

    setStatus("loading");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/app");
      router.refresh();
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nieznany błąd");
    }
  };

  if (!ready) {
    return (
      <AuthShell
        title="Nowe hasło"
        subtitle="Łączymy Twoją sesję po linku z maila…"
      >
        <p className="text-sm text-slate-600">Sprawdzanie sesji…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Ustaw nowe hasło"
      subtitle="Sesja z linku w mailu jest aktywna. Zapisz silne hasło — po zatwierdzeniu trafisz na pulpit."
      footer={
        <p>
          <Link href="/login" className="text-slate-500 underline-offset-2 hover:underline">
            Logowanie
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="np1" className="text-sm font-medium text-slate-800">
            Nowe hasło
          </label>
          <input
            id="np1"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="np2" className="text-sm font-medium text-slate-800">
            Powtórz hasło
          </label>
          <input
            id="np2"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        <button
          className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Zapisuję…" : "Zapisz i przejdź do aplikacji"}
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
