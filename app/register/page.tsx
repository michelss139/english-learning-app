"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setStatus("success");
      setMessage(
        "Konto utworzone. Jeśli Supabase wymaga potwierdzenia email, sprawdź skrzynkę. Następnie zaloguj się."
      );
      router.push("/login");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Nieznany błąd");
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Rejestracja</h1>

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
              minLength={6}
            />
          </div>

          <button
            className="w-full rounded-lg border px-3 py-2 font-medium"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Tworzę konto…" : "Załóż konto"}
          </button>

          {message && (
            <p className="text-sm">
              <span className="font-semibold">
                {status === "error" ? "Błąd: " : "Info: "}
              </span>
              {message}
            </p>
          )}
        </form>

        <p className="text-sm">
          Masz już konto? <a className="underline" href="/login">Zaloguj się</a>
        </p>
      </div>
    </main>
  );
}
