import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClusterClient, { type ClusterMeta, type QuestionDto } from "./ClusterClient";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ limit?: string; assignmentId?: string }>;
};

function clampLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(Math.max(n, 2), 20);
}

export default async function VocabClusterPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const limit = clampLimit(sp.limit);
  const assignmentId = sp.assignmentId ?? "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cluster, error: clusterErr } = await supabase
    .from("vocab_clusters")
    .select("id, slug, title, is_recommended, is_unlockable")
    .eq("slug", slug)
    .maybeSingle();

  if (clusterErr || !cluster) {
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

  // Lock check mirrors API semantics
  if (!cluster.is_recommended && cluster.is_unlockable) {
    const { data: unlockedRow } = await supabase
      .from("user_unlocked_vocab_clusters")
      .select("unlocked_at")
      .eq("student_id", user.id)
      .eq("cluster_id", cluster.id)
      .maybeSingle();

    if (!unlockedRow) {
      return (
        <main className="space-y-6">
          <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Typowe błędy: {cluster.title}</h1>
                <p className="text-base text-slate-600">Ten cluster jest zablokowany.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="tile-frame"
                  href="/app/vocab/clusters"
                >
                  <span className="tile-core inline-flex items-center rounded-[11px] px-4 py-2 font-medium text-slate-700">
                    ← Lista clusterów
                  </span>
                </a>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm text-amber-800">
              Dodaj wszystkie słowa z tego clustera do puli, aby odblokować ćwiczenie.
            </div>
          </section>
        </main>
      );
    }
  }

  const { data: questionsRaw, error: questionsErr } = await supabase
    .from("vocab_cluster_questions")
    .select("id, prompt, slot, choices, explanation, correct_choice, last_used_at")
    .eq("cluster_id", cluster.id)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (questionsErr) {
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

  const initialQuestions: QuestionDto[] = (questionsRaw ?? []).map((q: any) => ({
    id: q.id,
    prompt: q.prompt,
    choices: q.choices ?? [],
    slot: q.slot ?? undefined,
    explanation: q.explanation ?? null,
    correct_choice: q.correct_choice,
  }));

  // Best-effort rotation marker (same behavior as API)
  if (initialQuestions.length > 0) {
    try {
      await supabase
        .from("vocab_cluster_questions")
        .update({ last_used_at: new Date().toISOString() })
        .in(
          "id",
          initialQuestions.map((q) => q.id),
        );
    } catch {
      // ignore
    }
  }

  const initialCluster: ClusterMeta = {
    id: cluster.id,
    slug: cluster.slug,
    title: cluster.title,
  };

  return (
    <ClusterClient
      slug={slug}
      limit={limit}
      assignmentId={assignmentId}
      initialCluster={initialCluster}
      initialQuestions={initialQuestions}
    />
  );
}
