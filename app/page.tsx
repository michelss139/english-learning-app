"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export default function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setHealth({
          status: "ok",
          message: `Połączenie działa. Sesja: ${data.session ? "aktywna" : "brak (niezalogowany)"}`,
        });
      } catch (e: any) {
        setHealth({
          status: "error",
          message: e?.message ?? "Nieznany błąd",
        });
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">English Platform — Etap 0</h1>

        <section className="rounded-xl border p-4">
          <h2 className="text-xl font-medium">Status Supabase</h2>

          {health.status === "loading" && <p className="mt-2">Sprawdzam połączenie…</p>}

          {health.status === "ok" && (
            <p className="mt-2">
              <span className="font-semibold">OK:</span> {health.message}
            </p>
          )}

          {health.status === "error" && (
            <p className="mt-2">
              <span className="font-semibold">Błąd:</span> {health.message}
            </p>
          )}

          <div className="mt-4 text-sm opacity-80">
            <p>
              <span className="font-semibold">URL ustawiony:</span>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "tak" : "nie"}
            </p>
            <p>
              <span className="font-semibold">Anon key ustawiony:</span>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "tak" : "nie"}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
