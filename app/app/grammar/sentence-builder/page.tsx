import SentenceBuilder from "@/components/grammar/SentenceBuilder";
import {
  SENTENCE_BUILDER_TENSES,
  SENTENCE_BUILDER_TYPES,
  type SentenceBuilderPreset,
  type SentenceBuilderTense,
  type SentenceBuilderType,
} from "@/lib/grammar/sentence-builder/types";
import { SENTENCE_BUILDER_MODALS } from "@/lib/grammar/sentence-builder/constants";
import { loadSentenceBuilderVerbs } from "@/lib/grammar/sentence-builder/verbLoader";

type SentenceBuilderPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getPreset(params: Record<string, string | string[] | undefined>): SentenceBuilderPreset {
  const type = getSingleParam(params.type);
  const tense = getSingleParam(params.tense);
  const modal = getSingleParam(params.modal);

  return {
    type:
      type && SENTENCE_BUILDER_TYPES.includes(type as SentenceBuilderType) ? (type as SentenceBuilderType) : undefined,
    tense:
      tense && SENTENCE_BUILDER_TENSES.includes(tense as SentenceBuilderTense)
        ? (tense as SentenceBuilderTense)
        : undefined,
    modal: modal && SENTENCE_BUILDER_MODALS.includes(modal as (typeof SENTENCE_BUILDER_MODALS)[number]) ? modal : undefined,
  };
}

export default async function SentenceBuilderPage({ searchParams }: SentenceBuilderPageProps) {
  const params = searchParams ? await searchParams : {};
  const verbs = await loadSentenceBuilderVerbs();
  const preset = getPreset(params);

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sentence Builder</h1>
        <p className="max-w-2xl text-sm text-slate-700">
          Tutaj możesz sprawdzić, jak wyglądają twierdzenia, przeczenia oraz pytania wykorzystując
          dowolny czas bądź dowolny czasownik modalny. Wypróbuj także &quot;challenge&quot;, żeby
          samemu takie zdania tworzyć!
        </p>
      </header>

      <section className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8">
        <SentenceBuilder
          verbs={verbs}
          presetType={preset.type}
          presetTense={preset.tense}
          presetModal={preset.modal}
        />
      </section>
    </main>
  );
}
