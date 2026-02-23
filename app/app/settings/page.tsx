"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { DEFAULT_AVATARS, getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

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
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        if (!prof) {
          router.push("/login");
          return;
        }

        setProfile({
          id: prof.id,
          email: prof.email ?? null,
          username: prof.username ?? null,
          avatar_url: prof.avatar_url ?? null,
        });
        setUsername(prof.username ?? "");
        setEmail(prof.email ?? "");
        setSelectedAvatar(prof.avatar_url ?? "");
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać ustawień.");
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
    if (!file.type.startsWith("image/")) {
      throw new Error("Avatar musi być obrazem (image/*).");
    }
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error("Maksymalny rozmiar avatara to 3 MB.");
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setSelectedAvatar("");
  };

  const uploadAvatarToStorage = async (userId: string, file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error("Nazwa użytkownika jest wymagana.");
      }
      if (trimmedUsername.toLowerCase() !== (profile.username ?? "").toLowerCase()) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", trimmedUsername)
          .limit(1)
          .maybeSingle();

        if (existing && existing.id !== profile.id) {
          throw new Error("Ta nazwa użytkownika jest już zajęta.");
        }
      }

      let nextAvatarUrl = selectedAvatar || profile.avatar_url || null;
      if (uploadFile) {
        nextAvatarUrl = await uploadAvatarToStorage(profile.id, uploadFile);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: trimmedUsername,
          avatar_url: nextAvatarUrl,
        })
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      if (email.trim() && email.trim() !== (profile.email ?? "")) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailErr) {
          throw emailErr;
        }
      }

      setProfile({
        ...profile,
        username: trimmedUsername,
        avatar_url: nextAvatarUrl,
        email: email.trim(),
      });
      setSelectedAvatar(nextAvatarUrl || "");
      setUploadFile(null);
      setUploadPreview("");
      setStatus("Zapisano");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  };

  const logoutEverywhere = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      router.push("/login");
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się wylogować.");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Czy na pewno chcesz usunąć konto? Tej operacji nie można cofnąć.")) return;
    console.warn("[settings] delete account requested (placeholder)");
    setStatus("Usuwanie konta jest w przygotowaniu.");
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="text-sm text-slate-600">Ładuję ustawienia…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ustawienia</h1>
            <p className="text-base text-slate-700/80">Zarządzaj profilem i kontem.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            ← Wróć do strony głównej
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">{error}</div>
      ) : null}
      {status ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          {status}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-700/60">Profil</div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <img src={avatarSrc} alt="" className="h-20 w-20 rounded-full object-cover border border-white/20" />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-900">Avatar</div>
              <div className="grid grid-cols-6 gap-2">
                {DEFAULT_AVATARS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(url);
                      setUploadFile(null);
                      setUploadPreview("");
                    }}
                    className={`rounded-full border-2 p-1 transition ${
                      selectedAvatar === url ? "border-slate-900" : "border-transparent"
                    }`}
                  >
                    <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const randomAvatar = getRandomAvatar();
                  setSelectedAvatar(randomAvatar);
                  setUploadFile(null);
                  setUploadPreview("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 transition"
              >
                Losuj avatar
              </button>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lub wgraj własny (max 3 MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      handleUpload(file);
                    } catch (err: any) {
                      setError(err?.message ?? "Nie udało się wczytać avatara.");
                    }
                  }}
                />
                {uploadPreview ? (
                  <img src={uploadPreview} alt="" className="h-16 w-16 rounded-full object-cover border" />
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nazwa użytkownika</label>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-emerald-400/20 transition disabled:opacity-60"
            >
              {saving ? "Zapisuję…" : "Zapisz zmiany"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-700/60">Konto</div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
            onClick={deleteAccount}
          >
            Usuń konto
          </button>
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            onClick={logoutEverywhere}
          >
            Wyloguj się ze wszystkich sesji
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-700/60">Pomoc</div>
        <div className="text-sm text-slate-600">Kontakt do admina: admin@example.com</div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Zgłoś problem</label>
          <textarea
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            rows={3}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Opisz problem..."
          />
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            onClick={() => {
              console.log("[settings] report", reportText);
              setStatus("Dziękujemy! Zgłoszenie zostało zapisane (tymczasowo w logach).");
              setReportText("");
            }}
            disabled={!reportText.trim()}
          >
            Wyślij zgłoszenie
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-700/60">Przyszłość</div>
        <div className="flex flex-col gap-2 text-sm text-slate-500">
          <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left" disabled>
            Motyw jasny/ciemny (wkrótce)
          </button>
          <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left" disabled>
            Preferencje wyświetlania (wkrótce)
          </button>
        </div>
      </section>
    </main>
  );
}
