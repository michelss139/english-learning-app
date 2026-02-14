"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coach } from "./Coach";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function PresentSimpleClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          router.push("/login");
          return;
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  if (loading) {
    return <main className="text-white/80">Ładuję…</main>;
  }

  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Present Simple</h1>
          <p className="max-w-xl text-sm text-white/80">
            To podstawowy czas teraźniejszy: używasz go, gdy mówisz o faktach, rutynach i ogólnych prawdach.
            Poniżej masz zwięzłą mapę: intuicja, mechanika i najczęstsze pułapki.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/present-simple/practice"
              className="inline-flex w-fit rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 px-4 py-2 font-medium text-white transition hover:bg-emerald-500/30"
            >
              Ćwicz Present Simple
            </Link>
            <Link
              href="/app/courses/present-simple"
              className="text-sm text-white/60 underline hover:text-white/80"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar"
          className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          ← Spis treści
        </Link>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Intuicja</h2>
        <p className="text-white/85">
          Present Simple służy do mówienia o rzeczach, które są stałe, powtarzalne albo ogólnie prawdziwe:
          fakty (np. Ziemia krąży wokół Słońca), rutyny (co robisz zwykle), ogólne prawdy oraz stany i preferencje,
          które traktujesz jako „na stałe”. Jeśli możesz powiedzieć „zawsze / zwykle / ogólnie”, a nie „właśnie teraz”,
          to ten czas jest na miejscu.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Mechanika</h2>
        <div className="overflow-x-auto rounded-xl border border-white/15">
          <table className="w-full min-w-[400px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 bg-white/5">
                <th className="p-3 font-medium text-white">Typ zdania</th>
                <th className="p-3 font-medium text-white">Schemat</th>
                <th className="p-3 font-medium text-white">Przykład</th>
              </tr>
            </thead>
            <tbody className="text-white/90">
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Twierdzenie</td>
                <td className="p-3">
                  I / You / We / They → <span className="verb-main">work</span>
                  <br />
                  He / She / It → <span className="verb-main">work</span>
                  <span className="verb-ending">s</span>
                </td>
                <td className="p-3 example-muted">She works in a bank.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">do</span> not (don&apos;t) + <span className="verb-main">work</span>
                  <br />
                  <span className="auxiliary">does</span> not (doesn&apos;t) + <span className="verb-main">work</span>
                </td>
                <td className="p-3 example-muted">She doesn&apos;t work on Sundays.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Do</span> + I/you/we/they + <span className="verb-main">work</span>?
                  <br />
                  <span className="auxiliary">Does</span> + he/she/it + <span className="verb-main">work</span>?
                </td>
                <td className="p-3 example-muted">Does she work here?</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm example-muted">
          WH-questions: Where do you work? Why does she work so much?
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Słowo pomocnicze: DO</h2>
        <p className="text-white/85">
          DO i DOES używamy w pytaniach oraz w przeczeniach; w twierdzeniach ich nie używamy.
          Główny czasownik po DO/DOES zawsze w formie podstawowej (bez -s). Typowy błąd: <span className="verb-main">DO</span> + works ❌ —
          nigdy nie łączymy pomocniczego DO z czasownikiem z końcówką -s.
        </p>
        <Link
          href="/app/courses/present-simple"
          className="mt-2 inline-block text-sm text-white/60 underline hover:text-white/80"
        >
          Pełne omówienie w kursie →
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Charakterystyczne sygnały</h2>
        <ul className="list-inside list-disc space-y-1 text-white/85">
          <li><strong className="text-white">always</strong> — She always has coffee at nine.</li>
          <li><strong className="text-white">usually</strong> — I usually finish work at five.</li>
          <li><strong className="text-white">often</strong> — They often go to the cinema.</li>
          <li><strong className="text-white">every day</strong> — He runs every day.</li>
          <li><strong className="text-white">on Mondays</strong> — We meet on Mondays.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Najczęstsze błędy</h2>
        <ul className="space-y-2 text-sm text-white/90">
          <li>❌ Does she works? → ✔ Does she work?</li>
          <li>❌ She don&apos;t like coffee. → ✔ She doesn&apos;t like coffee.</li>
          <li>❌ He work here. → ✔ He works here.</li>
          <li>❌ Do he like it? → ✔ Does he like it?</li>
        </ul>
        <Link
          href="/app/vocab/cluster/tenses"
          className="mt-3 inline-block rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
        >
          Potrenuj typowe błędy
        </Link>
      </section>

      <section className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-sm text-white/85">
          Present Simple używamy też przy stałych planach (np. rozkład jazdy). <em>The train leaves at 6am.</em>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Porównaj z innym czasem</h2>
        <Link
          href="/app/grammar/compare?tense1=present-simple&tense2=present-continuous"
          className="text-white/80 underline hover:text-white"
        >
          Present Simple vs Present Continuous
        </Link>
      </section>

      <Coach />
    </main>
  );
}
