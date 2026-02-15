import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import IrregularVerbsTrainClient, { type Verb } from "./TrainClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ assignmentId?: string }>;
};

export default async function IrregularVerbsTrainPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const assignmentId = sp.assignmentId ?? "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pinned, error: pinnedErr } = await supabase
    .from("user_irregular_verbs")
    .select("irregular_verb_id")
    .eq("student_id", user.id);

  if (pinnedErr) {
    return <IrregularVerbsTrainClient initialVerb={null} initialError="Nie udało się wczytać przypiętych czasowników." assignmentId={assignmentId} />;
  }

  const pinnedIds = (pinned ?? []).map((p: any) => p.irregular_verb_id).filter(Boolean);
  if (pinnedIds.length === 0) {
    return (
      <IrregularVerbsTrainClient
        initialVerb={null}
        initialError="Brak przypiętych czasowników. Wróć do listy i przypnij kilka czasowników."
        assignmentId={assignmentId}
      />
    );
  }

  const selectedVerbId = pinnedIds[Math.floor(Math.random() * pinnedIds.length)];
  const { data: verbRow, error: verbErr } = await supabase
    .from("irregular_verbs")
    .select("id, base, past_simple, past_simple_variants, past_participle, past_participle_variants")
    .eq("id", selectedVerbId)
    .single();

  const initialVerb: Verb | null = verbErr || !verbRow
    ? null
    : {
        id: verbRow.id,
        base: verbRow.base,
        past_simple: verbRow.past_simple,
        past_simple_variants: verbRow.past_simple_variants ?? [],
        past_participle: verbRow.past_participle,
        past_participle_variants: verbRow.past_participle_variants ?? [],
      };

  return (
    <IrregularVerbsTrainClient
      initialVerb={initialVerb}
      initialError={initialVerb ? "" : "Nie udało się wczytać czasownika."}
      assignmentId={assignmentId}
    />
  );
}
