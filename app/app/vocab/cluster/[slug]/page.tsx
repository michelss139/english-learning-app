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
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
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
          <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-white">Typowe błędy: {cluster.title}</h1>
                <p className="text-base text-emerald-100/80">Ten cluster jest zablokowany.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
                  href="/app/vocab/clusters"
                >
                  ← Lista clusterów
                </a>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border-2 border-amber-400/30 bg-amber-400/10 p-5">
            <div className="text-sm text-amber-100">
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
        <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
          <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
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
