import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PackTrainingClient, { type PackItemDto, type PackMetaDto } from "./PackTrainingClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    direction?: string;
    limit?: string;
    autostart?: string;
    assignmentId?: string;
    mode?: string;
  }>;
};

type Direction = "en-pl" | "pl-en" | "mix";
type CountChoice = "5" | "10" | "all";
type VocabMode = "daily" | "mixed" | "precise";

function parseDirection(raw: string | undefined): Direction {
  const v = (raw ?? "").toLowerCase();
  return v === "pl-en" || v === "en-pl" || v === "mix" ? (v as Direction) : "en-pl";
}

function parseCountChoice(limitRaw: string | undefined): CountChoice {
  const n = Number(limitRaw);
  if (n === 5) return "5";
  if (n === 10) return "10";
  return "all";
}

function parseVocabMode(raw: string | undefined): VocabMode | null {
  const v = (raw ?? "").toLowerCase();
  return v === "daily" || v === "mixed" || v === "precise" ? (v as VocabMode) : null;
}

function pickTranslationPl(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0]?.translation_pl ?? null;
  if (typeof embed === "object") return embed.translation_pl ?? null;
  return null;
}

function pickExampleEn(embed: any): string | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0]?.example_en ?? null;
  if (typeof embed === "object") return embed.example_en ?? null;
  return null;
}

export default async function VocabPackPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const initialDirection = parseDirection(sp.direction);
  const initialCountChoice = parseCountChoice(sp.limit);
  const autoStart = sp.autostart === "1";
  const assignmentId = sp.assignmentId ?? "";
  const modeFromUrl = parseVocabMode(sp.mode);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: packRow, error: packErr } = await supabase
    .from("vocab_packs")
    .select("id, slug, title, description, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (packErr || !packRow || !packRow.is_published) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Pack nie istnieje lub nie jest opublikowany.
          </div>
        </section>
      </main>
    );
  }

  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("vocab_pack_items")
    .select(
      `
      id,
      sense_id,
      order_index,
      lexicon_senses(
        id,
        definition_en,
        lexicon_entries(lemma),
        lexicon_translations(translation_pl),
        lexicon_examples(example_en)
      )
    `,
    )
    .eq("pack_id", packRow.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsErr) {
    return (
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            Nie udało się wczytać fiszek.
          </div>
        </section>
      </main>
    );
  }

  const items: PackItemDto[] = (itemsRaw ?? []).map((item: any) => {
    const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
    const entry = sense?.lexicon_entries;
    const translationEmbed = sense?.lexicon_translations;
    const exampleEmbed = sense?.lexicon_examples;

    return {
      id: item.id,
      sense_id: item.sense_id,
      lemma: entry?.lemma ?? null,
      translation_pl: pickTranslationPl(translationEmbed),
      example_en: pickExampleEn(exampleEmbed),
      definition_en: sense?.definition_en ?? null,
      order_index: item.order_index ?? 0,
    };
  });

  const pack: PackMetaDto = {
    id: packRow.id,
    slug: packRow.slug,
    title: packRow.title,
    description: packRow.description ?? null,
  };

  return (
    <PackTrainingClient
      slug={slug}
      pack={pack}
      initialItems={items}
      initialDirection={initialDirection}
      initialCountChoice={initialCountChoice}
      autoStart={autoStart}
      assignmentId={assignmentId}
      modeFromUrl={modeFromUrl}
    />
  );
}

