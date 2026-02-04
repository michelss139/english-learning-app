"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { DEFAULT_AVATARS } from "@/lib/avatars";

export default function RegisterPage() {
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: trimmedUsername,
            avatar_url: selectedAvatar || null,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Nie udało się utworzyć użytkownika.");

      let finalAvatarUrl = selectedAvatar || null;
      if (uploadFile) {
        finalAvatarUrl = await uploadAvatarToStorage(data.user.id, uploadFile);
      }

      if (data.session) {
        await getOrCreateProfile({
          username: trimmedUsername,
          avatar_url: finalAvatarUrl,
        });
      }

      setStatus("success");
      setMessage(
        "Konto utworzone. Jeśli Supabase wymaga potwierdzenia email, sprawdź skrzynkę. Następnie zaloguj się."
      );
      router.push("/login");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Nieznany błąd");
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Rejestracja</h1>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nazwa użytkownika</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
            />
            <div className="text-xs text-slate-500">
              To nazwa wyświetlana na stronie. Możesz ją zmienić później w profilu.
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hasło</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            className="w-full rounded-lg border px-3 py-2 font-medium"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Tworzę konto…" : "Załóż konto"}
          </button>

          <div className="space-y-3">
            <div className="text-sm font-medium">Wybierz avatar</div>
            <div className="grid grid-cols-3 gap-3">
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
                    selectedAvatar === url ? "border-sky-400" : "border-transparent"
                  }`}
                  aria-label="Wybierz avatar"
                >
                  <img src={url} alt="" className="h-16 w-16 rounded-full object-cover" />
                </button>
              ))}
            </div>

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
                    setMessage(err?.message ?? "Nie udało się wczytać avatara.");
                    setStatus("error");
                  }
                }}
              />
              {uploadPreview ? (
                <img src={uploadPreview} alt="" className="h-16 w-16 rounded-full object-cover border" />
              ) : null}
            </div>
          </div>

          {message && (
            <p className="text-sm">
              <span className="font-semibold">
                {status === "error" ? "Błąd: " : "Info: "}
              </span>
              {message}
            </p>
          )}
        </form>

        <p className="text-sm">
          Masz już konto? <a className="underline" href="/login">Zaloguj się</a>
        </p>
      </div>
    </main>
  );
}
