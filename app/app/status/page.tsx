"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type Counts = {
  vocab: number | null;
  lessons: number | null;
};

export default function StatusPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authOk, setAuthOk] = useState(false);
  const [emailOrId, setEmailOrId] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts>({ vocab: null, lessons: null });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          router.push("/login");
          return;
        }

        if (cancelled) return;

        setAuthOk(true);
        setEmailOrId(session.user.email ?? session.user.id);

        const p = await getOrCreateProfile();
        if (cancelled) return;

        if (!p) {
          router.push("/login");
          return;
        }

        setProfile(p);

        // Liczniki – head:true nie pobiera danych, tylko count
        const vocabRes = await supabase
          .from("vocab_items")
          .select("id", { count: "exact", head: true });

        const lessonsRes = await supabase
          .from("student_lessons")
          .select("id", { count: "exact", head: true });

        if (cancelled) return;

        if (vocabRes.error) throw vocabRes.error;
        if (lessonsRes.error) throw lessonsRes.error;

        setCounts({
          vocab: vocabRes.count ?? 0,
          lessons: lessonsRes.count ?? 0,
        });
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd statusu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="text-sm opacity-80">
          Szybki sanity-check: Auth + Profile + liczniki vocab/lessons.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm">Ładuję…</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border p-4 text-sm text-red-700">
          <span className="font-semibold">Błąd: </span>
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Auth</h2>
          <span
            className={`rounded-lg border px-3 py-1 text-sm font-medium ${
              authOk ? "border-green-500 text-green-700" : "border-red-500 text-red-700"
            }`}
          >
            {authOk ? "OK" : "BRAK"}
          </span>
        </div>

        {authOk ? (
          <p className="text-sm">
            Użytkownik: <span className="font-medium">{emailOrId}</span>
          </p>
        ) : (
          <p className="text-sm opacity-80">Brak aktywnej sesji (nastąpi redirect do /login).</p>
        )}
      </section>

      <section className="rounded-2xl border p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <span
            className={`rounded-lg border px-3 py-1 text-sm font-medium ${
              profile ? "border-green-500 text-green-700" : "opacity-80"
            }`}
          >
            {profile ? "OK" : "—"}
          </span>
        </div>

        {profile ? (
          <div className="text-sm space-y-1">
            <p>
              id: <span className="font-mono">{profile.id}</span>
            </p>
            {"role" in profile ? (
              <p>
                role: <span className="font-medium">{(profile as any).role}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm opacity-80">
            Nie udało się pobrać/utworzyć profilu (albo jeszcze się ładuje).
          </p>
        )}
      </section>

      <section className="rounded-2xl border p-5 space-y-2">
        <h2 className="text-lg font-semibold">Dane</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-80">vocab_items</div>
            <div className="mt-1 text-2xl font-semibold">
              {counts.vocab === null ? "—" : counts.vocab}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-sm opacity-80">student_lessons</div>
            <div className="mt-1 text-2xl font-semibold">
              {counts.lessons === null ? "—" : counts.lessons}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <a className="rounded-lg border px-4 py-2 text-sm font-medium" href="/app">
          ← Panel
        </a>
        <a className="rounded-lg border px-4 py-2 text-sm font-medium" href="/app/vocab">
          Trening słówek
        </a>
      </div>
    </main>
  );
}
