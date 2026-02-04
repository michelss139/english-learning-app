"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { DEFAULT_AVATARS, getRandomAvatar, resolveAvatarUrl } from "@/lib/avatars";

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
};

type XpInfo = {
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
};

type StreakInfo = {
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

type Badge = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  earned: boolean;
};

type ProgressSummary = {
  accuracy: {
    correct_7d: number;
    total_7d: number;
    correct_14d: number;
    total_14d: number;
  };
  todayCount: number;
  mostWrong: { term_en_norm: string; wrong_count: number }[];
  lastAttempts: { term_en_norm: string; correct: boolean; created_at: string }[];
};

type ProgressExtended = {
  accuracy: {
    correct_today: number;
    total_today: number;
    correct_3d: number;
    total_3d: number;
    correct_7d: number;
    total_7d: number;
    correct_14d: number;
    total_14d: number;
  };
  learned: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  toLearn: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  repeatSuggestions: { term_en_norm: string; last_correct_at: string }[];
};

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [autoAssigned, setAutoAssigned] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const [xp, setXp] = useState<XpInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [extended, setExtended] = useState<ProgressExtended | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
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
        setSelectedAvatar(prof.avatar_url ?? "");

        if (!prof.avatar_url && !autoAssigned) {
          const randomAvatar = getRandomAvatar();
          setSelectedAvatar(randomAvatar);
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: randomAvatar })
            .eq("id", prof.id);
          if (!updateError) {
            setProfile((prev) => (prev ? { ...prev, avatar_url: randomAvatar } : prev));
          }
          setAutoAssigned(true);
        }

        const [xpRes, streakRes, badgesRes, summaryRes, extendedRes] = await Promise.all([
          fetch("/api/profile/xp", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/streak", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/profile/badges", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/vocab/progress-summary", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/vocab/progress-extended", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const xpJson = await xpRes.json().catch(() => null);
        if (xpRes.ok && xpJson?.ok) {
          setXp({
            xp_total: xpJson.xp_total ?? 0,
            level: xpJson.level ?? 0,
            xp_in_current_level: xpJson.xp_in_current_level ?? 0,
            xp_to_next_level: xpJson.xp_to_next_level ?? 0,
          });
        }

        const streakJson = await streakRes.json().catch(() => null);
        if (streakRes.ok && streakJson?.ok) {
          setStreak({
            current_streak: streakJson.current_streak ?? 0,
            best_streak: streakJson.best_streak ?? 0,
            last_activity_date: streakJson.last_activity_date ?? null,
          });
        }

        const badgesJson = await badgesRes.json().catch(() => null);
        if (badgesRes.ok && badgesJson?.ok) {
          setBadges((badgesJson.badges ?? []) as Badge[]);
        }

        const summaryJson = await summaryRes.json().catch(() => null);
        if (summaryRes.ok && summaryJson) {
          setSummary(summaryJson as ProgressSummary);
        }

        const extendedJson = await extendedRes.json().catch(() => null);
        if (extendedRes.ok && extendedJson) {
          setExtended(extendedJson as ProgressExtended);
        }
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać profilu.");
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

      setProfile({
        ...profile,
        username: trimmedUsername,
        avatar_url: nextAvatarUrl,
      });
      setSelectedAvatar(nextAvatarUrl || "");
      setUploadFile(null);
      setUploadPreview("");
      setStatus("Zapisano");
      setEditingAvatar(false);
      setEditingName(false);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się zapisać profilu.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdits = () => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setSelectedAvatar(profile.avatar_url ?? "");
    setUploadFile(null);
    setUploadPreview("");
    setEditingAvatar(false);
    setEditingName(false);
    setStatus("");
  };

  const xpInLevel = xp?.xp_in_current_level ?? 0;
  const xpToNext = xp?.xp_to_next_level ?? 0;
  const xpPercent = xpToNext > 0 ? Math.min(Math.round((xpInLevel / xpToNext) * 100), 100) : 0;
  const currentStreak = streak?.last_activity_date ? streak.current_streak ?? 0 : 0;
  const bestStreak = streak?.best_streak ?? 0;

  const renderBadgeIcon = (badge: Badge) => {
    if (badge.icon && (badge.icon.startsWith("/") || badge.icon.startsWith("http"))) {
      return <img src={badge.icon} alt="" className="h-8 w-8" />;
    }
    if (badge.icon) return badge.icon;
    return badge.title?.slice(0, 1) || "★";
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6">
          <div className="text-sm text-emerald-100/70">Ładuję profil…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Mój profil</h1>
            <p className="text-sm text-white/75">
              Ustaw avatar i nazwę wyświetlaną.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
          >
            ← Wróć do panelu
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          <div className="flex flex-col gap-3">
            <div>{error}</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
                onClick={() => router.refresh()}
              >
                Spróbuj ponownie
              </button>
              <a
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition"
                href="/app"
              >
                Wróć do strony głównej
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-6">
            <div className="flex flex-col items-start gap-4">
              <img
                src={avatarSrc}
                alt=""
                className="h-28 w-28 rounded-full object-cover border-2 border-white/20"
              />
              <div className="space-y-2 w-full">
                <div className="text-sm font-medium text-white">Nazwa użytkownika</div>
                {editingName ? (
                  <input
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                ) : (
                  <div className="text-lg font-semibold text-white">{username || "—"}</div>
                )}
                <div className="text-xs text-white/60">{profile?.email ?? ""}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAvatar((prev) => !prev)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 transition"
                >
                  Zmień avatar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName((prev) => !prev)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 transition"
                >
                  Zmień nazwę
                </button>
              </div>
            </div>

            {editingAvatar ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">Wybierz avatar</div>
                <div className="grid grid-cols-4 gap-3">
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
                        selectedAvatar === url ? "border-emerald-300" : "border-transparent"
                      }`}
                      aria-label="Wybierz avatar"
                    >
                      <img src={url} alt="" className="h-12 w-12 rounded-full object-cover" />
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
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 transition"
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
            ) : null}

            {(editingAvatar || editingName) ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="rounded-xl border-2 border-emerald-200/30 bg-emerald-400/10 px-4 py-2 font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
                >
                  {saving ? "Zapisuję…" : "Zapisz zmiany"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdits}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
                >
                  Anuluj
                </button>
                {status ? (
                  <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-100">
                    {status}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-4">
            <div className="text-sm uppercase tracking-[0.2em] text-emerald-100/60">Postęp</div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-emerald-100/70">XP</div>
                <div className="text-2xl font-semibold text-white">{xp?.xp_total ?? 0}</div>
                <div className="text-xs text-emerald-100/60">Poziom {xp?.level ?? 0}</div>
                <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${xpPercent}%` }} />
                </div>
                <div className="mt-1 text-xs text-emerald-100/60">
                  {xpInLevel}/{xpToNext} XP do następnego poziomu
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="text-sm text-emerald-100/70">Seria</div>
                <div className="text-base font-semibold text-white">Aktualna: {currentStreak} dni</div>
                <div className="text-xs text-emerald-100/60">Rekord: {bestStreak} dni</div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section id="badges" className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-emerald-100/60">Odznaki</div>
                <div className="text-lg font-semibold text-white">Twoje osiągnięcia</div>
              </div>
            </div>
            {badges.length === 0 ? (
              <div className="text-sm text-emerald-100/60">Brak dostępnych odznak.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {badges.map((badge) => (
                  <div
                    key={badge.slug}
                    className={`rounded-2xl border p-3 text-center ${
                      badge.earned
                        ? "border-emerald-200/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-white/50"
                    }`}
                  >
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg">
                      {renderBadgeIcon(badge)}
                    </div>
                    <div className="text-xs font-semibold">{badge.title}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-6">
            <div className="text-sm uppercase tracking-[0.2em] text-emerald-100/60">Historia i statystyki</div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-medium text-white">Skuteczność</div>
                <div className="text-xs text-emerald-100/60">
                  7 dni: {summary?.accuracy?.correct_7d ?? 0}/{summary?.accuracy?.total_7d ?? 0}
                </div>
                <div className="text-xs text-emerald-100/60">
                  14 dni: {summary?.accuracy?.correct_14d ?? 0}/{summary?.accuracy?.total_14d ?? 0}
                </div>
                <div className="text-xs text-emerald-100/60">Ćwiczeń dziś: {summary?.todayCount ?? 0}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-medium text-white">Do powtórki</div>
                {extended?.repeatSuggestions?.length ? (
                  <ul className="space-y-2 text-xs text-emerald-100/70">
                    {extended.repeatSuggestions.slice(0, 5).map((row) => (
                      <li key={row.term_en_norm} className="flex items-center justify-between">
                        <span>{row.term_en_norm}</span>
                        <span className="text-emerald-100/40">{row.last_correct_at?.slice(0, 10)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-emerald-100/60">Brak sugestii powtórek.</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-medium text-white">Najczęstsze błędy</div>
                {summary?.mostWrong?.length ? (
                  <ul className="space-y-2 text-xs text-emerald-100/70">
                    {summary.mostWrong.slice(0, 5).map((row) => (
                      <li key={row.term_en_norm} className="flex items-center justify-between">
                        <span>{row.term_en_norm}</span>
                        <span className="text-emerald-100/40">{row.wrong_count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-emerald-100/60">Brak danych o błędach.</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-medium text-white">Ostatnie próby</div>
                {summary?.lastAttempts?.length ? (
                  <ul className="space-y-2 text-xs text-emerald-100/70">
                    {summary.lastAttempts.slice(0, 5).map((row, idx) => (
                      <li key={`${row.term_en_norm}-${idx}`} className="flex items-center justify-between">
                        <span>{row.term_en_norm}</span>
                        <span className={row.correct ? "text-emerald-200" : "text-rose-200"}>
                          {row.correct ? "OK" : "Błąd"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-emerald-100/60">Brak historii prób.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-sm font-medium text-white">Twoje wyniki (today / week / total)</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs text-emerald-100/70">
                <div>
                  <div className="text-emerald-100/60">Nauczone dziś</div>
                  <div className="text-white">{extended?.learned?.today?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-emerald-100/60">Nauczone w tygodniu</div>
                  <div className="text-white">{extended?.learned?.week?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-emerald-100/60">Nauczone ogółem</div>
                  <div className="text-white">{extended?.learned?.total?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-emerald-100/60">Do nauczenia dziś</div>
                  <div className="text-white">{extended?.toLearn?.today?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-emerald-100/60">Do nauczenia w tygodniu</div>
                  <div className="text-white">{extended?.toLearn?.week?.length ?? 0}</div>
                </div>
                <div>
                  <div className="text-emerald-100/60">Do nauczenia ogółem</div>
                  <div className="text-white">{extended?.toLearn?.total?.length ?? 0}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
