"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesStatus, setNotesStatus] = useState("");

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
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Panel ucznia</h1>
            <p className="text-sm opacity-80">
              Zalogowany jako: <span className="font-medium">{profile?.email ?? "-"}</span>
            </p>
          </div>

          <a className="rounded-lg border px-4 py-2 font-medium" href="/logout">
            Wyloguj
          </a>
        </header>

        {error ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
          </div>
        ) : null}

        {/* 1) SERCE APLIKACJI – dostępne dla każdego zalogowanego */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a className="rounded-xl border p-4 hover:bg-black/5 transition" href="/app/vocab">
            <div className="text-lg font-semibold">Trening słówek</div>
            <p className="mt-1 text-sm opacity-80">
              Lekcja (data) + cała pula + własne słówka. Generator testów.
            </p>
          </a>

          <div className="rounded-xl border p-4 opacity-80">
            <div className="text-lg font-semibold">Wkrótce</div>
            <p className="mt-1 text-sm">
              Streak, XP, zadania, statystyki, itp.
            </p>
          </div>
        </section>

        {/* Notatki użytkownika */}
        <section className="rounded-xl border p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Notatki</p>
              <p className="text-sm opacity-80">
                Prywatne notatki. Zapisuj pomysły, tematy, linki, zadania.
              </p>
            </div>
            {notesStatus ? (
              <span className="text-sm font-medium text-green-700">{notesStatus}</span>
            ) : null}
          </div>

          <textarea
            className="w-full rounded-lg border bg-transparent px-3 py-2"
            rows={6}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesStatus("");
            }}
            placeholder="Twoje notatki..."
          />

          <button
            className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
            onClick={saveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? "Zapisuję…" : "Zapisz"}
          </button>
        </section>

        {/* 2) Subskrypcja – jako opcja, nie blokada całego panelu */}
        <section className="rounded-xl border p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Subskrypcja</p>
              <p className="text-sm opacity-80">
                Status: <span className="font-medium">{profile?.subscription_status ?? "-"}</span>
              </p>
              <p className="text-sm opacity-80">
                Subskrypcja odblokowuje wybrane funkcje premium (np. AI).
              </p>
            </div>

            {profile?.subscription_status !== "active" ? (
              <button
                className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
                onClick={startCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Przekierowuję…" : "Aktywuj"}
              </button>
            ) : (
              <span className="rounded-lg border px-3 py-2 text-sm font-medium">
                Aktywna
              </span>
            )}
          </div>

          {profile?.subscription_status !== "active" ? (
            <p className="text-sm opacity-80">
              Masz dostęp do panelu i treningu słówek bez subskrypcji.
            </p>
          ) : (
            <p className="text-sm opacity-80">
              Dzięki. Premium funkcje będą dostępne w odpowiednich miejscach.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
