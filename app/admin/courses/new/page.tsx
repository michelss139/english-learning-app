"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replaceAll("ą", "a")
    .replaceAll("ć", "c")
    .replaceAll("ę", "e")
    .replaceAll("ł", "l")
    .replaceAll("ń", "n")
    .replaceAll("ó", "o")
    .replaceAll("ś", "s")
    .replaceAll("ż", "z")
    .replaceAll("ź", "z")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminCourseNewPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = useMemo(() => slugify(title), [title]);

  useEffect(() => {
    if (!slug) setSlug(autoSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSlug]);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const p = await getOrCreateProfile();
        if (!p || p.role !== "admin") {
          router.push("/app");
          return;
        }

        setProfile(p);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const onSave = async () => {
    setError("");

    if (!title.trim()) {
      setError("Podaj tytuł kursu.");
      return;
    }
    if (!slug.trim()) {
      setError("Podaj slug kursu.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("courses").insert({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        intro_video_url: introVideoUrl.trim() || null,
        is_published: isPublished,
      });

      if (error) throw error;

      router.push("/admin/courses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Nieznany błąd");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="min-h-screen p-8">Ładuję…</main>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Nowy kurs</h1>
        </div>

        {error ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              <span className="font-semibold">Błąd: </span>
              {error}
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tytuł kursu</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. English for Beginners"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Slug (URL)</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="np. english-for-beginners"
            />
            <p className="text-xs opacity-70">Podpowiedź: {autoSlug || "—"}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Opis</label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border bg-transparent px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis kursu (opcjonalnie)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Intro video URL (opcjonalnie)</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              value={introVideoUrl}
              onChange={(e) => setIntroVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Opublikowany
          </label>

          <div className="flex gap-3">
            <a
              className="rounded-lg border px-4 py-2 font-medium"
              href="/admin/courses"
            >
              Anuluj
            </a>
            <button
              className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Zapisuję…" : "Zapisz kurs"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
