"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { GlossaryTooltip, ExampleSentence, RelatedTenses, StativeVsAction } from "@/lib/grammar/components";
import Link from "next/link";

export default function StativeVerbsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialog, setAiDialog] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session?.data?.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        setProfile(prof);
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const handleGenerateAIDialog = async () => {
    setAiDialogLoading(true);
    setAiError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setAiError("Musisz być zalogowany");
        setAiDialogLoading(false);
        return;
      }

      const cacheKey = `stative-verbs__single__v1`;

      // First, try to get from cache
      const cacheRes = await fetch(`/api/grammar/ai-dialog?key=${encodeURIComponent(cacheKey)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.ok && cacheData.cached && cacheData.dialog) {
          setAiDialog(cacheData.dialog);
          setAiDialogLoading(false);
          return;
        }
      }

      // If not cached, generate new
      const genRes = await fetch("/api/grammar/ai-dialog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tense1: "stative-verbs",
          tense2: "stative-verbs",
        }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Błąd generowania dialogu");
      }

      const genData = await genRes.json();
      if (genData.ok && genData.dialog) {
        setAiDialog(genData.dialog);
      } else {
        throw new Error("Nie udało się wygenerować dialogu");
      }
    } catch (e: any) {
      setAiError(e?.message || "Błąd generowania dialogu AI");
    } finally {
      setAiDialogLoading(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  // Navigation anchors
  const sections = [
    { id: "definition", title: "Czym są stative verbs" },
    { id: "importance", title: "Dlaczego to ważne" },
    { id: "categories", title: "Główne kategorie" },
    { id: "list", title: "Lista najważniejszych" },
    { id: "confusion-warnings", title: "Uwaga! To myli" },
    { id: "continuous-exceptions", title: "Kiedy MOŻE być continuous" },
    { id: "structure", title: "Struktura" },
    { id: "common-mistakes", title: "Typowe błędy" },
    { id: "examples", title: "Przykłady zdań" },
    { id: "dialog", title: "Dialog w praktyce" },
    { id: "comparisons", title: "Porównania" },
    { id: "related", title: "Zobacz też" },
  ];

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Stative Verbs</h1>
            <p className="text-base text-emerald-100/80">
              Czasowniki stanu - klucz do naturalnego angielskiego
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/grammar"
            >
              ← Spis treści
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-6 space-y-6">
        {/* Quick navigation */}
        <div className="sticky top-4 z-10 mb-6 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* 1. Czym są stative verbs */}
        <section id="definition" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">
            Czym są <GlossaryTooltip term="stative verb">stative verbs</GlossaryTooltip> (definicja po ludzku)
          </h2>
          <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
            {`Stative verbs to czasowniki, które opisują:

stan, a nie akcję,

coś, co jest, a nie coś, co się dzieje.

One opisują:

uczucia,

myśli,

opinie,

posiadanie,

relacje,

stany umysłu.

Dlatego zwykle NIE używa się ich w formie -ing.

Nie mówimy:
❌ I am knowing him.
Bo „know" to stan, nie akcja.`}
          </div>
        </section>

        {/* 2. Dlaczego to ważne */}
        <section id="importance" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Dlaczego to ważne</h2>
          <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
            {`To jest jeden z najczęstszych powodów, dla których:

zdania brzmią „nienaturalnie",

nauczyciel mówi: „rozumiem, ale tak się nie mówi",

native speaker czuje, że coś jest „off".

Polacy bardzo często:

wrzucają wszystko do Continuous,

bo w polskim „teraz" = „robię".

Angielski działa inaczej.`}
          </div>
        </section>

        {/* 3. Główne kategorie */}
        <section id="categories" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Główne kategorie stative verbs</h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-medium text-white/90 mb-2">A) Uczucia i emocje</h3>
              <div className="flex flex-wrap gap-2">
                {["love", "like", "hate", "prefer", "need", "want", "care", "mind"].map((verb) => (
                  <span
                    key={verb}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                  >
                    {verb}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-medium text-white/90 mb-2">B) Myślenie, opinie, wiedza</h3>
              <div className="flex flex-wrap gap-2">
                {["know", "think", "believe", "understand", "remember", "forget", "agree", "mean"].map((verb) => (
                  <span
                    key={verb}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                  >
                    {verb}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-medium text-white/90 mb-2">C) Zmysły</h3>
              <div className="flex flex-wrap gap-2">
                {["see", "hear", "smell", "taste", "sound"].map((verb) => (
                  <span
                    key={verb}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                  >
                    {verb}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-medium text-white/90 mb-2">D) Posiadanie i relacje</h3>
              <div className="flex flex-wrap gap-2">
                {["have", "own", "belong", "contain", "include", "consist"].map((verb) => (
                  <span
                    key={verb}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                  >
                    {verb}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-medium text-white/90 mb-2">E) Stany i cechy</h3>
              <div className="flex flex-wrap gap-2">
                {["be", "seem", "appear", "look (w znaczeniu: wydawać się)", "feel (w znaczeniu: stan)"].map((verb) => (
                  <span
                    key={verb}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80"
                  >
                    {verb}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Lista najważniejszych */}
        <section id="list" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Najważniejsze stative verbs – lista do nauki</h2>
          <div className="space-y-3">
            <div>
              <strong className="text-emerald-300">Emotion / feeling:</strong>
              <div className="mt-1 text-white/90">love, like, hate, prefer, need, want</div>
            </div>
            <div>
              <strong className="text-emerald-300">Mind / opinion:</strong>
              <div className="mt-1 text-white/90">know, think, believe, understand, remember, forget, agree, doubt</div>
            </div>
            <div>
              <strong className="text-emerald-300">Possession:</strong>
              <div className="mt-1 text-white/90">have, own, belong, contain, include</div>
            </div>
            <div>
              <strong className="text-emerald-300">Senses:</strong>
              <div className="mt-1 text-white/90">see, hear, smell, taste, sound</div>
            </div>
            <div>
              <strong className="text-emerald-300">State:</strong>
              <div className="mt-1 text-white/90">be, seem, appear, feel</div>
            </div>
          </div>
        </section>

        {/* 5. Uwaga! To myli */}
        <section id="confusion-warnings" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Uwaga! To myli (sygnały vs pułapki)</h2>
          <div className="rounded-xl border-2 border-amber-400/30 bg-amber-400/10 p-4">
            <div className="prose prose-invert max-w-none text-amber-100 whitespace-pre-line">
              {`„now" + stative verb ≠ Continuous
❌ I am knowing the answer now.
✅ I know the answer now.

„at the moment" NIE zmienia stative w action
❌ I am liking this song at the moment.
✅ I like this song.

„today" nie oznacza automatycznie Continuous
❌ I am understanding the lesson today.
✅ I understand the lesson.

„very much" często idzie ze stative
I love this movie very much.`}
            </div>
          </div>
        </section>

        {/* 6. Kiedy MOŻE być continuous */}
        <section id="continuous-exceptions" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">
            Kiedy <GlossaryTooltip term="stative verb">stative verb</GlossaryTooltip> MOŻE być w continuous (zmiana znaczenia)
          </h2>
          <div className="prose prose-invert max-w-none text-white/90">
            <div className="space-y-4">
              <div>
                <strong>To jest krytyczne. Tu robisz jakość.</strong>
              </div>
              
              <div>
                <strong>THINK</strong>
                <div className="mt-1">I think you are right. (<GlossaryTooltip term="opinion">opinia</GlossaryTooltip>)</div>
                <div className="mt-1">I am thinking about my future. (<GlossaryTooltip term="process">proces myślenia</GlossaryTooltip>)</div>
              </div>

              <div>
                <strong>HAVE</strong>
                <div className="mt-1">I have a car. (<GlossaryTooltip term="state">posiadanie</GlossaryTooltip>)</div>
                <div className="mt-1">I am having lunch. (<GlossaryTooltip term="action verb">akcja</GlossaryTooltip>)</div>
              </div>

              <div>
                <strong>SEE</strong>
                <div className="mt-1">I see what you mean. (rozumiem)</div>
                <div className="mt-1">I am seeing my doctor tomorrow. (spotkanie)</div>
              </div>

              <div>
                <strong>FEEL</strong>
                <div className="mt-1">I feel tired. (<GlossaryTooltip term="state">stan</GlossaryTooltip>)</div>
                <div className="mt-1">I am feeling better today. (zmiana, <GlossaryTooltip term="process">proces</GlossaryTooltip>)</div>
              </div>

              <div>
                <strong>LOOK</strong>
                <div className="mt-1">You look tired. (wrażenie)</div>
                <div className="mt-1">She is looking at me. (<GlossaryTooltip term="action verb">akcja</GlossaryTooltip>)</div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Struktura */}
        <section id="structure" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Struktura (informacyjnie)</h2>
          <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
            {`Stative verbs używamy głównie w:

Present Simple

I know

She likes

They believe

Present Perfect

I have known him for years.

She has always liked coffee.

Nie budujemy ich w Continuous, chyba że zmienia się znaczenie (jak wyżej).`}
          </div>
        </section>

        {/* 8. Typowe błędy */}
        <section id="common-mistakes" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Typowe błędy (bardzo ważne)</h2>
          <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
            {`❌ I am knowing him. → ✅ I know him.

❌ She is liking this movie. → ✅ She likes this movie.

❌ We are having two brothers. → ✅ We have two brothers.

❌ I am understanding. → ✅ I understand.

❌ He is believing you. → ✅ He believes you.`}
          </div>
        </section>

        {/* 9. Przykłady zdań */}
        <section id="examples" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Przykłady zdań (kontrast)</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <ExampleSentence sentence="I know the answer." />
            <ExampleSentence sentence="I am thinking about the answer." />
            <ExampleSentence sentence="She has a dog." />
            <ExampleSentence sentence="She is having a shower." />
            <ExampleSentence sentence="We see the problem." />
            <ExampleSentence sentence="We are seeing the manager tomorrow." />
            <ExampleSentence sentence="I feel nervous." />
            <ExampleSentence sentence="I am feeling better now." />
          </div>
        </section>

        {/* 10. Dialog */}
        <section id="dialog" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Dialog w praktyce</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
              {`A: Are you okay?
B: Yes, I feel fine, just a bit tired.
A: What are you doing?
B: I am thinking about my exam.
A: Do you know the answers?
B: I know most of them, but I am still thinking about two questions.
A: You'll be fine.`}
            </div>
            <div className="mt-3 text-xs text-white/60 italic">
              (Tu masz jednocześnie stative + action – idealny kontrast)
            </div>
          </div>

          {/* AI Dialog Button */}
          <div className="pt-2">
            <button
              className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
              onClick={handleGenerateAIDialog}
              disabled={aiDialogLoading}
            >
              {aiDialogLoading ? "Generuję…" : "Wygeneruj dodatkowy dialog (AI)"}
            </button>
            {aiError && (
              <div className="mt-3 rounded-xl border-2 border-rose-400/30 bg-rose-400/10 p-3 text-rose-100 text-sm">
                {aiError}
              </div>
            )}
            {aiDialog && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
                  {aiDialog.split("\n").map((line, index) => {
                    // Highlight bold text (verb forms)
                    const highlighted = line.replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-emerald-300">$1</span>');
                    return (
                      <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 11. Porównania */}
        <section id="comparisons" className="space-y-3 scroll-mt-4">
          <StativeVsAction
            comparisons={[
              {
                stative: "I like coffee.",
                action: "I am liking this more and more.",
                explanation: "LIKE: opinia vs zmiana, proces (rzadkie, ale możliwe)",
              },
              {
                stative: "I have a problem.",
                action: "I am having a problem with my computer.",
                explanation: "HAVE: stan vs sytuacja, proces",
              },
              {
                stative: "I think it's good.",
                action: "I am thinking about moving abroad.",
                explanation: "THINK: opinia vs proces",
              },
            ]}
          />
        </section>

        {/* 12. Zobacz też */}
        <section id="related" className="space-y-3 scroll-mt-4">
          <RelatedTenses
            relatedLinks={[
              { slug: "present-simple", title: "Present Simple", description: "Podstawowy czas dla stative verbs" },
              { slug: "present-continuous", title: "Present Continuous", description: "Kontrast z action verbs" },
              { slug: "present-perfect", title: "Present Perfect", description: "Stative verbs w Perfect" },
              { slug: "present-perfect-continuous", title: "Present Perfect Continuous", description: "Kiedy stative może być continuous" },
            ]}
          />
        </section>
      </section>
    </main>
  );
}
