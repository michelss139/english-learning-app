"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

function badgeClass(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "border-emerald-400/40 text-emerald-200 bg-emerald-400/10";
  if (s === "trialing") return "border-emerald-400/40 text-emerald-200 bg-emerald-400/10";
  if (s === "past_due") return "border-amber-400/40 text-amber-200 bg-amber-400/10";
  if (s === "canceled" || s === "cancelled") return "border-rose-400/40 text-rose-200 bg-rose-400/10";
  return "border-white/20 text-white/80 bg-white/5";
}

export default function StudentDashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesStatus, setNotesStatus] = useState("");

  const subscriptionLabel = useMemo(() => {
    const s = profile?.subscription_status ?? "-";
    if (s === "active") return "active";
    return s;
  }, [profile?.subscription_status]);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const p = await getOrCreateProfile();
        if (!p) {
          router.push("/login");
          return;
        }

        if (p.role === "admin") {
          router.push("/admin");
          return;
        }

        setProfile(p);
        setNotes(p.notes ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const startCheckout = async () => {
    if (!profile?.email) {
      setError("Brak email w profilu. Zaloguj się ponownie.");
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Nie udało się rozpocząć płatności.");
      }

      if (!data?.url) {
        throw new Error("Brak URL do Stripe Checkout.");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Nieznany błąd");
      setCheckoutLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }

    if (notes.length > 5000) {
      setError("Notatki są za długie (max 5000 znaków).");
      setNotesStatus("");
      return;
    }

    setSavingNotes(true);
    setError("");
    setNotesStatus("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ notes: notes.trim() || null })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setNotesStatus("Zapisano");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zapisać notatek.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Panel ucznia</h1>
            <p className="text-sm text-white/75">
              Zalogowany jako: <span className="font-medium text-white">{profile?.email ?? "-"}</span>
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-xl border px-3 py-1 text-sm font-medium ${badgeClass(profile?.subscription_status)}`}>
                Subskrypcja: {subscriptionLabel}
              </span>
              <a className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium hover:bg-white/10 transition" href="/app/status">
                Status
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium hover:bg-white/15 transition"
              href="/app/vocab"
            >
              Trening słówek
            </a>
            <a className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium hover:bg-white/10 transition" href="/logout">
              Wyloguj
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {/* KAFELKI */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/vocab"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight">Trening słówek</div>
              <p className="text-sm text-white/75">
                Lekcje (daty), cała pula, własne słówka, testy.
              </p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
              MVP
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Otwórz <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/irregular-verbs"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight">Czasowniki nieregularne</div>
              <p className="text-sm text-white/75">
                Przypinaj czasowniki i trenuj formy past simple i past participle.
              </p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
              MVP
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Otwórz <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/vocab/clusters"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight">Typowe błędy</div>
              <p className="text-sm text-white/75">
                Clustery (make/do, say/tell itd.) – wybierz właściwe słowo w zdaniu.
              </p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
              BETA
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Otwórz <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/vocab/packs"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight">Fiszki</div>
              <p className="text-sm text-white/75">
                Szybkie powtórki w formie pakietów fiszek.
              </p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
              NEW
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Otwórz <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/grammar"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight">Gramatyka</div>
              <p className="text-sm text-white/75">
                Teoria czasów gramatycznych, przykłady, porównania.
              </p>
            </div>
            <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-white/80">
              MVP
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Otwórz <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <a
          className="group rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg hover:shadow-2xl hover:bg-white/10 transition"
          href="/app/status"
        >
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Status</div>
            <p className="text-sm text-white/75">
              Sanity-check: auth, profil, RLS, liczniki vocab/lekcji.
            </p>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/85 group-hover:text-white transition">
            Sprawdź <span className="translate-x-0 group-hover:translate-x-0.5 transition">→</span>
          </div>
        </a>

        <div className="rounded-3xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-lg">
          <div className="text-lg font-semibold tracking-tight">Subskrypcja</div>
          <p className="mt-1 text-sm text-white/75">
            Nie blokuje panelu. Odblokuje wybrane funkcje premium później.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={`rounded-xl border px-3 py-2 text-sm font-medium ${badgeClass(profile?.subscription_status)}`}>
              {subscriptionLabel}
            </span>

            {profile?.subscription_status !== "active" ? (
              <button
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium hover:bg-white/15 transition disabled:opacity-60"
                onClick={startCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Przekierowuję…" : "Aktywuj"}
              </button>
            ) : (
              <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                Aktywna
              </span>
            )}
          </div>

          <p className="mt-3 text-sm text-white/70">
            {profile?.subscription_status !== "active"
              ? "Masz dostęp do treningu bez subskrypcji."
              : "Premium funkcje będą pojawiać się w odpowiednich miejscach."}
          </p>
        </div>
      </section>

      {/* Notatki */}
      <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight">Notatki</p>
            <p className="text-sm text-white/75">
              Prywatne. Zapisuj tematy lekcji, zadania, linki, pomysły.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {notesStatus ? (
              <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
                {notesStatus}
              </span>
            ) : null}
            <span className="text-sm text-white/60">{notes.length}/5000</span>
          </div>
        </div>

        <textarea
          className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          rows={7}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesStatus("");
          }}
          placeholder="Twoje notatki..."
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium hover:bg-white/15 transition disabled:opacity-60"
            onClick={saveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? "Zapisuję…" : "Zapisz"}
          </button>
          <span className="text-sm text-white/60">
            Wskazówka: możesz trzymać tu listę słówek do dodania później lub plan nauki.
          </span>
        </div>
      </section>
    </main>
  );
}
