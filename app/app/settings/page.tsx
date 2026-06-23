"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { DEFAULT_AVATARS, getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

const cardBase =
  "rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm";
const sectionLabel =
  "mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400";
const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#178CF2]/30";
const btnSecondary =
  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const prof = await getOrCreateProfile();
        if (!prof) { setError("Nie udało się wczytać profilu."); setLoading(false); return; }
        setProfile({ id: prof.id, email: prof.email ?? null, username: prof.username ?? null, avatar_url: prof.avatar_url ?? null });
        setUsername(prof.username ?? "");
        setEmail(prof.email ?? "");
        setSelectedAvatar(prof.avatar_url ?? "");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Nie udało się wczytać ustawień.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const avatarSrc = useMemo(() => {
    const seed = profile?.id ?? profile?.email ?? "";
    return resolveAvatarUrl(selectedAvatar || profile?.avatar_url, seed);
  }, [profile?.id, profile?.email, profile?.avatar_url, selectedAvatar]);

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) throw new Error("Avatar musi być obrazem (image/*).");
    if (file.size > MAX_AVATAR_SIZE) throw new Error("Maksymalny rozmiar avatara to 3 MB.");
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setSelectedAvatar("");
  };

  const uploadAvatarToStorage = async (userId: string, file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    return supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true); setError(""); setStatus("");
    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) throw new Error("Nazwa użytkownika jest wymagana.");
      if (trimmedUsername.toLowerCase() !== (profile.username ?? "").toLowerCase()) {
        const { data: existing } = await supabase.from("profiles").select("id").ilike("username", trimmedUsername).limit(1).maybeSingle();
        if (existing && existing.id !== profile.id) throw new Error("Ta nazwa użytkownika jest już zajęta.");
      }
      let nextAvatarUrl = selectedAvatar || profile.avatar_url || null;
      if (uploadFile) nextAvatarUrl = await uploadAvatarToStorage(profile.id, uploadFile);
      const { error: updateError } = await supabase.from("profiles").update({ username: trimmedUsername, avatar_url: nextAvatarUrl }).eq("id", profile.id);
      if (updateError) throw updateError;
      if (email.trim() && email.trim() !== (profile.email ?? "")) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) throw emailErr;
      }
      setProfile({ ...profile, username: trimmedUsername, avatar_url: nextAvatarUrl, email: email.trim() });
      setSelectedAvatar(nextAvatarUrl || "");
      setUploadFile(null); setUploadPreview("");
      setStatus("Zmiany zostały zapisane.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  };

  const logoutEverywhere = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); router.push("/login"); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Nie udało się wylogować."); }
  };

  const deleteAccount = async () => {
    if (!confirm("Czy na pewno chcesz usunąć konto? Tej operacji nie można cofnąć.")) return;
    setStatus("Usuwanie konta jest w przygotowaniu.");
  };

  if (loading) {
    return (
      <main className="space-y-4">
        <div className={cardBase}>
          <p className="text-sm text-slate-500">Ładuję ustawienia…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      {/* Nagłówek */}
      <header className="px-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ustawienia</h1>
        <p className="mt-0.5 text-sm text-slate-500">Zarządzaj profilem i kontem.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {status ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>
      ) : null}

      {/* Siatka 2 kolumny */}
      <div className="grid grid-cols-2 items-stretch gap-4">

        {/* Lewa kolumna: Profil */}
        <div className="flex flex-col">

          {/* Profil */}
          <section className={`${cardBase} flex-1`}>
            <h2 className={sectionLabel}>Profil</h2>

            {/* Aktualny avatar */}
            <div className="mb-4 flex items-center gap-3">
              <img src={avatarSrc} alt="" className="h-14 w-14 rounded-full border border-slate-200 object-cover shadow-sm" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{profile?.username || "—"}</p>
                <p className="text-xs text-slate-400">{profile?.email || "—"}</p>
              </div>
            </div>

            {/* Siatka avatarów */}
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Wybierz avatar</p>
              <div className="grid grid-cols-6 gap-1.5">
                {DEFAULT_AVATARS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => { setSelectedAvatar(url); setUploadFile(null); setUploadPreview(""); }}
                    className="rounded-full transition focus:outline-none"
                  >
                    <img
                      src={url}
                      alt=""
                      className={`h-10 w-10 rounded-full object-cover transition ${
                        selectedAvatar === url
                          ? "ring-2 ring-[#178CF2] ring-offset-1"
                          : "opacity-75 hover:opacity-100"
                      }`}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSelectedAvatar(getRandomAvatar()); setUploadFile(null); setUploadPreview(""); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
                  title="Losuj avatar"
                >
                  <i className="ti-refresh" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {/* Upload własnego */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500">Lub wgraj własny (max 3 MB)</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try { handleUpload(file); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Nie udało się wczytać avatara."); }
                }}
              />
              {uploadPreview ? <img src={uploadPreview} alt="" className="mt-2 h-12 w-12 rounded-full border border-slate-200 object-cover" /> : null}
            </div>

            {/* Nazwa użytkownika */}
            <div className="mb-3 space-y-1">
              <label className="text-xs font-medium text-slate-600">Nazwa użytkownika</label>
              <input className={inputBase} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Twoja nazwa" />
            </div>

            {/* Email */}
            <div className="mb-4 space-y-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input className={inputBase} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Twój email" />
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-xl bg-[#178CF2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1480e0] disabled:opacity-60"
            >
              {saving ? "Zapisuję…" : "Zapisz zmiany"}
            </button>
          </section>


        </div>

        {/* Prawa kolumna: Pomoc + Konto */}
        <div className="flex flex-col">
          <section className={`${cardBase} flex-1`}>
            <h2 className={sectionLabel}>Pomoc i konto</h2>
            <p className="mb-3 text-sm text-slate-600">
              Kontakt do admina:{" "}
              <a href="mailto:michal.surmacz139@gmail.com" className="font-medium text-[#178CF2] hover:underline">
                michal.surmacz139@gmail.com
              </a>
            </p>
            <div className="mb-4 space-y-2">
              <label className="text-xs font-medium text-slate-600">Zgłoś problem lub zadaj pytanie</label>
              <textarea
                className={`${inputBase} resize-none`}
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Opisz problem lub wpisz pytanie…"
              />
              <button
                type="button"
                className={btnSecondary}
                disabled={!reportText.trim()}
                onClick={() => {
                  console.log("[settings] report", reportText);
                  setStatus("Dziękujemy! Zgłoszenie zostało zapisane.");
                  setReportText("");
                }}
              >
                Wyślij
              </button>
            </div>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <button type="button" className={btnSecondary} onClick={logoutEverywhere}>
                Wyloguj ze wszystkich sesji
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                Usuń konto
              </button>
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
