"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  intro_video_url: string;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,slug,description,intro_video_url")
        .order("created_at", { ascending: false });

      if (!error && data) setCourses(data as Course[]);
      setLoading(false);
    };

    run();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold">Kursy</h1>

        {loading ? <p>Ładuję…</p> : null}

        {!loading && courses.length === 0 ? (
          <p>Brak opublikowanych kursów.</p>
        ) : null}

        <div className="space-y-4">
          {courses.map((c) => (
            <a
              key={c.id}
              href={`/courses/${c.slug}`}
              className="block rounded-xl border p-4 hover:bg-black/5"
            >
              <h2 className="text-xl font-medium">{c.title}</h2>
              <p className="mt-1 text-sm opacity-80">{c.description}</p>
              <p className="mt-3 text-sm underline">Zobacz kurs</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
