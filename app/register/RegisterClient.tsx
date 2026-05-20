"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { DEFAULT_AVATARS } from "@/lib/avatars";
import { AuthShell } from "@/components/auth/AuthShell";

export default function RegisterClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const avatarRequired = useMemo(() => {
    return !selectedAvatar && !uploadFile;
  }, [selectedAvatar, uploadFile]);

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Avatar musi być obrazem (image/*).");
    }
    if (file.size > 3 * 1024 * 1024) {
      throw new Error("Maksymalny rozmiar avatara to 3 MB.");
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadFile(file);
    setUploadPreview(previewUrl);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error("Podaj nazwę użytkownika.");
      }
      if (avatarRequired) {
        throw new Error("Wybierz avatar przed rejestracją.");
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/app`,
          data: {
            username: trimmedUsername,
            avatar_url: selectedAvatar || null,
            app_role: "student",
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Nie udało się utworzyć użytkownika.");

      let finalAvatarUrl = selectedAvatar || null;
      if (uploadFile && data.session) {
        finalAvatarUrl = await uploadAvatarToStorage(data.user.id, uploadFile);
      }

      if (data.session) {
        await getOrCreateProfile({
          username: trimmedUsername,
          avatar_url: finalAvatarUrl,
          role: "student",
        });
        router.push("/app");
        router.refresh();
        return;
      }

      setStatus("success");
      setMessage(
        "Konto utworzone. Otwórz wiadomość e-mail i potwierdź adres — dopiero wtedy profil i avatar zostaną dokończone. Potem zaloguj się."
      );
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Nieznany błąd");
    }
  };

  return (
    <AuthShell
      title="Załóż konto"
      subtitle="Dołącz do LANGBracket — wybierz typ konta, uzupełnij dane i avatar. To zajmie około minuty."
      footer={
        <p>
          Masz już konto?{" "}
          <Link href="/login" className="font-medium text-sky-700 underline-offset-2 hover:underline">
            Zaloguj się
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-7">
        <div className="space-y-2">
          <label htmlFor="reg-user" className="text-sm font-medium text-slate-800">
            Nazwa użytkownika
          </label>
          <input
            id="reg-user"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            autoComplete="username"
          />
          <p className="text-xs text-slate-500">
            Wyświetlana na platformie — możesz ją później zmienić w ustawieniach.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-email" className="text-sm font-medium text-slate-800">
            E-mail
          </label>
          <input
            id="reg-email"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-pass" className="text-sm font-medium text-slate-800">
            Hasło
          </label>
          <input
            id="reg-pass"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner shadow-slate-900/5 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-500/15"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-500">Co najmniej 6 znaków.</p>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-6">
          <div className="text-sm font-semibold text-slate-900">Avatar</div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
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
                  selectedAvatar === url ? "border-sky-400 ring-2 ring-sky-200" : "border-transparent hover:border-slate-200"
                }`}
                aria-label="Wybierz domyślny avatar"
              >
                <img src={url} alt="" className="h-16 w-16 rounded-full object-cover" />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-file" className="text-sm font-medium text-slate-800">
              Lub wgraj własny (max 3 MB)
            </label>
            <input
              id="reg-file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  handleUpload(file);
                } catch (err: unknown) {
                  setMessage(err instanceof Error ? err.message : "Nie udało się wczytać avatara.");
                  setStatus("error");
                }
              }}
            />
            {uploadPreview ? (
              <img src={uploadPreview} alt="" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
            ) : null}
          </div>
        </div>

        <button
          className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Tworzę konto…" : "Załóż konto"}
        </button>

        {status === "success" && message ? (
          <p className="text-sm leading-relaxed text-emerald-800" role="status">
            {message}
          </p>
        ) : null}

        {status === "error" && message ? (
          <p className="text-sm text-red-600" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
