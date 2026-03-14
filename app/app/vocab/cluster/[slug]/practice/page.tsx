import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClusterClient from "../ClusterClient";
import { loadClusterPageData } from "@/lib/vocab/clusterLoader";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ limit?: string; assignmentId?: string }>;
};

function clampLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(Math.max(n, 2), 20);
}

export default async function VocabClusterPracticePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const limit = clampLimit(sp.limit);
  const assignmentId = sp.assignmentId ?? "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let result: Awaited<ReturnType<typeof loadClusterPageData>>;
  try {
    result = await loadClusterPageData({
      supabase,
      studentId: user!.id,
      slug,
      limit,
      includeAnswers: true,
    });
  } catch {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Nie udało się wczytać pytań.
          </div>
        </section>
      </main>
    );
  }

  if (result.status === "not_found") {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Nie znaleziono clustera.
          </div>
        </section>
      </main>
    );
  }

  return (
    <ClusterClient
      slug={slug}
      limit={limit}
      assignmentId={assignmentId}
      initialCluster={result.data.cluster}
      initialPatterns={result.data.patterns}
      initialQuestions={result.data.tasks}
      view="practice"
    />
  );
}
