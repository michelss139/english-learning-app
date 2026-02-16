"use client";

import Link from "next/link";
import { Coach } from "./Coach";

export function PastSimpleClient() {
  return (
    <main className="space-y-8">
      {/* 0. HERO */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Past Simple</h1>
          <p className="max-w-3xl text-sm text-white/80">
            Past Simple to czas, którego używamy, gdy opowiadamy o konkretnych wydarzeniach z przeszłości.
            Mówimy o czymś, co się wydarzyło i zostało zakończone. To czas historii, faktów z przeszłości
            i pojedynczych zdarzeń, które miały swój moment.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/past-simple/practice"
              className="inline-flex w-fit rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 px-4 py-2 font-medium text-white transition hover:bg-emerald-500/30"
            >
              Ćwicz Past Simple
            </Link>
            <Link
              href="/app/courses/past-simple"
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

      {/* 1. MECHANIKA */}
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
                  I <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                  <br />
                  She <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                  <br />
                  They went
                </td>
                <td className="p-3 example-muted">She worked in London last year.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">did not</span> + base form
                </td>
                <td className="p-3 example-muted">She did not work yesterday.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Did</span> + podmiot + base form?
                </td>
                <td className="p-3 example-muted">Did she work yesterday?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. KONSTRUKCJA — FORMA CZASOWNIKA */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Konstrukcja — forma czasownika</h2>
        <p className="text-white/85">
          W Past Simple czasownik przyjmuje formę przeszłą.
        </p>
        <p className="mt-2 text-white/85">Regular verbs:</p>
        <ul className="mt-1 space-y-1 text-white/90">
          <li>work → <span className="verb-main">work</span><span className="verb-ending">ed</span></li>
          <li>play → <span className="verb-main">play</span><span className="verb-ending">ed</span></li>
          <li>finish → <span className="verb-main">finish</span><span className="verb-ending">ed</span></li>
        </ul>
        <p className="mt-3 text-white/85">
          Końcówka -ed jest wyraźnym sygnałem przeszłości.
        </p>
        <p className="mt-3 text-white/85">
          Nie wszystkie czasowniki tworzą przeszłość przez -ed. Część z nich ma własne, nieregularne formy,
          których trzeba nauczyć się na pamięć.
        </p>
        <ul className="mt-1 space-y-1 text-white/90">
          <li>go → went</li>
          <li>see → saw</li>
          <li>take → took</li>
        </ul>
        <Link
          href="/app/irregular-verbs"
          className="mt-2 inline-block text-sm text-white/60 underline hover:text-white/80"
        >
          Zobacz czasowniki nieregularne
        </Link>
      </section>

      {/* 3. SŁOWO POMOCNICZE — DID */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Słowo pomocnicze — DID</h2>
        <p className="text-white/85">
          W pytaniach i przeczeniach używamy słowa pomocniczego did.
        </p>
        <p className="mt-2 example-muted">
          Did she <span className="verb-main">go</span> there?
          <br />
          She did not <span className="verb-main">go</span> home.
        </p>
        <p className="mt-3 text-white/85">
          Po słowie did czasownik zawsze wraca do formy podstawowej. Jeśli pojawia się did,
          forma przeszła znika z czasownika głównego.
        </p>
      </section>

      {/* 4. KIEDY UŻYWAMY */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Kiedy używamy</h2>
        <ul className="space-y-3 text-white/90">
          <li>
            <p className="font-medium text-white">• Konkretne wydarzenie w przeszłości</p>
            <p className="example-muted">I met her yesterday.</p>
          </li>
          <li>
            <p className="font-medium text-white">• Określony moment w przeszłości</p>
            <p className="example-muted">We moved here in 2019.</p>
          </li>
          <li>
            <p className="font-medium text-white">• Opowiadanie historii krok po kroku</p>
            <p className="example-muted">I opened the door, walked inside and sat down.</p>
          </li>
        </ul>
      </section>

      {/* 5. CHARAKTERYSTYCZNE SYGNAŁY */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Charakterystyczne sygnały</h2>
        <p className="text-sm text-white/85">
          Past Simple często występuje z określeniami wskazującymi konkretny moment w przeszłości.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/90">
          <li><strong className="text-white">yesterday</strong> — I saw him yesterday.</li>
          <li><strong className="text-white">last week / last year</strong> — She left last year.</li>
          <li><strong className="text-white">two days ago</strong> — They called two days ago.</li>
          <li><strong className="text-white">in 2018</strong> — We met in 2018.</li>
        </ul>
      </section>

      {/* 6. NAJCZĘSTSZE BŁĘDY */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Najczęstsze błędy</h2>
        <ul className="space-y-2 text-sm text-white/90">
          <li>❌ Did she went there?</li>
          <li>✔ Did she go there.</li>
          <li>❌ She didn&apos;t went home.</li>
          <li>✔ She didn&apos;t go home.</li>
          <li>❌ I have seen him yesterday.</li>
          <li>✔ I saw him yesterday.</li>
        </ul>
      </section>

      {/* 7. PORÓWNAJ */}
      <section className="rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="mb-2 text-lg font-semibold text-white">Porównaj</h2>
        <p className="text-sm text-white/85">
          Past Simple mówi o konkretnym wydarzeniu w przeszłości.
          <br />
          Present Perfect mówi o doświadczeniu lub efekcie, bez podawania momentu.
        </p>
        <Link
          href="/app/grammar/compare?tense1=past-simple&tense2=present-perfect"
          className="mt-2 inline-block text-white/80 underline hover:text-white"
        >
          Past Simple vs Present Perfect
        </Link>
      </section>

      {/* 8. COACH */}
      <Coach />
    </main>
  );
}
