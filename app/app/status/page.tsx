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

function badge(ok: boolean) {
  return ok
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    : "border-rose-400/30 bg-rose-400/10 text-rose-100";
}

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
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Status</h1>
            <p className="text-sm text-white/75">
              Szybki sanity-check: Auth + Profile + liczniki vocab/lessons.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app"
            >
              ← Panel
            </a>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
              href="/app/vocab"
            >
              Trening słówek
            </a>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-sm text-white/75">
          Ładuję…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">Auth</h2>
          <span className={`rounded-xl border px-3 py-1 text-sm font-semibold ${badge(authOk)}`}>
            {authOk ? "OK" : "BRAK"}
          </span>
        </div>

        {authOk ? (
          <p className="text-sm text-white/75">
            Użytkownik: <span className="font-medium text-white">{emailOrId}</span>
          </p>
        ) : (
          <p className="text-sm text-white/75">Brak aktywnej sesji (nastąpi redirect do /login).</p>
        )}
      </section>

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">Profile</h2>
          <span
            className={`rounded-xl border px-3 py-1 text-sm font-semibold ${
              profile ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-white/15 bg-white/5 text-white/80"
            }`}
          >
            {profile ? "OK" : "—"}
          </span>
        </div>

        {profile ? (
          <div className="text-sm space-y-1 text-white/75">
            <p>
              id: <span className="font-mono text-white">{profile.id}</span>
            </p>
            {"role" in profile ? (
              <p>
                role: <span className="font-medium text-white">{(profile as any).role}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/75">
            Nie udało się pobrać/utworzyć profilu (albo jeszcze się ładuje).
          </p>
        )}
      </section>

      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-white">Dane</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/70">vocab_items</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {counts.vocab === null ? "—" : counts.vocab}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/70">student_lessons</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {counts.lessons === null ? "—" : counts.lessons}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <a
          className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
          href="/app"
        >
          ← Panel
        </a>
        <a
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
          href="/app/vocab"
        >
          Trening słówek
        </a>
      </div>
    </main>
  );
}
