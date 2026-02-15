"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";

export default function LoginClient() {
  const router = useRouter();
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
        email,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error("Nie udało się utworzyć sesji.");

      const profile = await getOrCreateProfile();

      if (profile?.role === "admin") router.push("/admin");
      else router.push("/app");
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Logowanie</h1>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hasło</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="w-full rounded-lg border px-3 py-2 font-medium" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Loguję…" : "Zaloguj się"}
          </button>

          {message && (
            <p className="text-sm">
              <span className="font-semibold">Błąd: </span>
              {message}
            </p>
          )}
        </form>

        <p className="text-sm">
          Nie masz konta? <a className="underline" href="/register">Zarejestruj się</a>
        </p>
      </div>
    </main>
  );
}
