"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type CourseMini = {
  id: string;
  title: string;
};

export default function AdminLessonNewPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = (params?.courseId as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState<CourseMini | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [position, setPosition] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");

  const [isPublished, setIsPublished] = useState(false);
  const [isFreePreview, setIsFreePreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = useMemo(() => slugify(title), [title]);

  useEffect(() => {
    // autouzupełnij slug tylko jeśli user jeszcze nic nie wpisał
    if (!slug) setSlug(autoSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSlug]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!courseId) {
          setError("Brak courseId w URL.");
          return;
        }

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
        if (p.role !== "admin") {
          router.push("/app");
          return;
        }
        setProfile(p);

        // pobierz kurs (tylko do nagłówka)
        const courseRes = await supabase
          .from("courses")
          .select("id,title")
          .eq("id", courseId)
          .single();

        if (courseRes.error) throw courseRes.error;
        setCourse(courseRes.data as CourseMini);

        // ustaw domyślną pozycję na "ostatnia + 1"
        const lastRes = await supabase
          .from("lessons")
          .select("position")
          .eq("course_id", courseId)
          .order("position", { ascending: false })
          .limit(1);

        if (lastRes.error) throw lastRes.error;
        const lastPos = lastRes.data?.[0]?.position ?? 0;
        setPosition(lastPos + 1);
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, courseId]);

  const onSave = async () => {
    setError("");
    if (!title.trim()) {
      setError("Podaj tytuł lekcji.");
      return;
    }
    if (!slug.trim()) {
      setError("Podaj slug (np. present-simple-1).");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("lessons").insert({
        course_id: courseId,
        title: title.trim(),
        slug: slug.trim(),
        position,
        video_url: videoUrl.trim() || null,
        content: content || null,
        is_published: isPublished,
        is_free_preview: isFreePreview,
      });

      if (error) throw error;

      router.push(`/admin/courses/${courseId}/lessons`);
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
          <h1 className="text-2xl font-semibold">Admin — Nowa lekcja</h1>
          <p className="text-sm opacity-80">
            Kurs: <span className="font-medium">{course?.title ?? "—"}</span>
          </p>
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
            <label className="text-sm font-medium">Tytuł</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Present Simple — podstawy"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Slug (URL)</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="np. present-simple-1"
            />
            <p className="text-xs opacity-70">
              Podpowiedź: {autoSlug || "—"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Pozycja w kursie</label>
              <input
                className="w-full rounded-lg border bg-transparent px-3 py-2"
                type="number"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                min={0}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Video URL (opcjonalnie)</label>
              <input
                className="w-full rounded-lg border bg-transparent px-3 py-2"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Treść (content)</label>
            <textarea
              className="min-h-[180px] w-full rounded-lg border bg-transparent px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Może być zwykły tekst albo markdown."
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                />
                Darmowy preview
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Opublikowana
              </label>
            </div>

            <div className="flex gap-3">
              <a
                className="rounded-lg border px-4 py-2 font-medium"
                href={`/admin/courses/${courseId}/lessons`}
              >
                Anuluj
              </a>
              <button
                className="rounded-lg border px-4 py-2 font-medium disabled:opacity-60"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Zapisuję…" : "Zapisz lekcję"}
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm">
          <a className="underline" href={`/admin/courses/${courseId}/lessons`}>
            ← Lekcje
          </a>
        </div>
      </div>
    </main>
  );
}
