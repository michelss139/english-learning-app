"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

function badgeClass(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "border-green-500 text-green-700";
  if (s === "trialing") return "border-green-500 text-green-700";
  if (s === "past_due") return "border-yellow-500 text-yellow-700";
  if (s === "canceled" || s === "cancelled") return "border-red-500 text-red-700";
  return "opacity-80";
}

export default function StudentDashboard() {
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

        // Admin nie powinien korzystać z panelu ucznia
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

  if (loading) return <main className="min-h-screen p-8">Ładuję…</main>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold">Panel ucznia</h1>
              <p className="text-sm opacity-80">
                Zalogowany jako: <span className="font-medium">{profile?.email ?? "-"}</span>
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-3 py-1 text-sm font-medium ${badgeClass(profile?.subscription_status)}`}>
                  Subskrypcja: {subscriptionLabel}
                </span>
                <a className="rounded-lg border px-3 py-1 text-sm font-medium" href="/app/status">
                  Status
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a className="rounded-lg border px-4 py-2 font-medium" href="/app/vocab">
                Trening słówek
              </a>
              <a className="rounded-lg border px-4 py-2 font-medium" href="/logout">
                Wyloguj
              </a>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border p-4">
            <p className="text-sm">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
          </div>
        ) : null}

        {/* Szybkie kafelki */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <a className="rounded-2xl border p-5 hover:bg-black/5 transition" href="/app/vocab">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Trening słówek</div>
                <p className="mt-1 text-sm opacity-80">
                  Lekcje (daty), cała pula, własne słówka, testy.
                </p>
              </div>
              <span className="rounded-lg border px-2 py-1 text-sm font-medium">MVP</span>
            </div>
            <div className="mt-4 text-sm underline">Otwórz →</div>
          </a>

          <a className="rounded-2xl border p-5 hover:bg-black/5 transition" href="/app/status">
            <div className="text-lg font-semibold">Status</div>
            <p className="mt-1 text-sm opacity-80">
              Sanity-check: auth, profil, RLS, liczniki vocab/lekcji.
            </p>
            <div className="mt-4 text-sm underline">Sprawdź →</div>
          </a>

          <div className="rounded-2xl border p-5">
            <div className="text-lg font-semibold">Subskrypcja</div>
            <p className="mt-1 text-sm opacity-80">
              Nie blokuje panelu. Odblokowuje funkcje premium w przyszłości.
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className={`rounded-lg border px-3 py-2 text-sm font-medium ${badgeClass(profile?.subscription_status)}`}>
                {subscriptionLabel}
              </span>

              {profile?.subscription_status !== "active" ? (
                <button
                  className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Przekierowuję…" : "Aktywuj"}
                </button>
              ) : (
                <span className="rounded-lg border px-4 py-2 text-sm font-medium">Aktywna</span>
              )}
            </div>

            <p className="mt-3 text-sm opacity-80">
              {profile?.subscription_status !== "active"
                ? "Masz dostęp do treningu bez subskrypcji."
                : "Premium funkcje będą pojawiać się w odpowiednich miejscach."}
            </p>
          </div>
        </section>

        {/* Notatki użytkownika */}
        <section className="rounded-2xl border p-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Notatki</p>
              <p className="text-sm opacity-80">
                Prywatne. Zapisuj tematy lekcji, zadania, linki, pomysły.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notesStatus ? (
                <span className="rounded-lg border px-3 py-1 text-sm font-medium border-green-500 text-green-700">
                  {notesStatus}
                </span>
              ) : null}
              <span className="text-sm opacity-70">{notes.length}/5000</span>
            </div>
          </div>

          <textarea
            className="w-full rounded-xl border bg-transparent px-3 py-2"
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
              className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
              onClick={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? "Zapisuję…" : "Zapisz"}
            </button>
            <span className="text-sm opacity-70">
              Wskazówka: możesz trzymać tu listę słówek do dodania później lub plan nauki.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
