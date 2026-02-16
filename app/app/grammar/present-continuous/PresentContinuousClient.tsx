"use client";

import Link from "next/link";
import { Coach } from "./Coach";

export function PresentContinuousClient() {
  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Present Continuous</h1>
          <p className="max-w-3xl text-sm text-white/80">
            Present Continuous opisuje czynność, która trwa w tej chwili albo w aktualnym okresie czasu.
            Interesuje nas coś, co dzieje się teraz, zmienia się albo ma charakter tymczasowy.
            To czas ruchu, procesu i sytuacji „w trakcie”.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/present-continuous/practice"
              className="inline-flex w-fit rounded-xl border-2 border-emerald-400/50 bg-emerald-500/20 px-4 py-2 font-medium text-white transition hover:bg-emerald-500/30"
            >
              Ćwicz Present Continuous
            </Link>
            <Link
              href="/app/courses/present-continuous"
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
                  I <span className="auxiliary">am</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                  <br />
                  You <span className="auxiliary">are</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                  <br />
                  He <span className="auxiliary">is</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">She is working in the office right now.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  I <span className="auxiliary">am not</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I am not working tonight.</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Are</span> you <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                  <br />
                  <span className="auxiliary">Is</span> she <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Are you working on this task now?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">KONSTRUKCJA: BE + -ING</h2>
        <p className="text-white/85">
          W tym czasie zawsze potrzebujemy odmienionego czasownika „be” oraz formy z końcówką -ing. Oba elementy
          są obowiązkowe.
        </p>
        <div className="mt-3 space-y-2 text-sm text-white/90">
          <p>❌ She working.</p>
          <p>✔ She is working.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">KIEDY UŻYWAMY</h2>
        <ul className="space-y-3 text-white/90">
          <li>
            <p className="font-medium text-white">• Czynność dzieje się teraz</p>
            <p className="example-muted">She is talking on the phone.</p>
          </li>
          <li>
            <p className="font-medium text-white">• Tymczasowa sytuacja</p>
            <p className="example-muted">I am living in Warsaw this year.</p>
            <p className="example-muted">(Situation that is not permanent.)</p>
          </li>
          <li>
            <p className="font-medium text-white">• Coś się zmienia</p>
            <p className="example-muted">The weather is getting colder.</p>
          </li>
          <li>
            <p className="font-medium text-white">• Zaplanowana przyszłość (indywidualny plan)</p>
            <p className="example-muted">I am meeting her tomorrow.</p>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">PRZYSZŁOŚĆ — WAŻNA RÓŻNICA</h2>
        <p className="whitespace-pre-line text-white/85">
          {"Present Continuous jest naturalny przy konkretnych, indywidualnych planach, które już zostały ustalone.\n\nI am meeting her tomorrow.\nWe are flying to Paris next week.\n\nPresent Simple stosujemy przy terminach ogólnie ustalonych (np. rozkład jazdy, harmonogramy).\nPresent Continuous używamy, gdy mówimy o czyimś osobistym planie.\n\nTo nie jest kwestia czasu przyszłego — to kwestia rodzaju planu."}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">NAJCZĘSTSZE BŁĘDY</h2>
        <ul className="space-y-2 text-sm text-white/90">
          <li>❌ I am knowing him.</li>
          <li>✔ I know him.</li>
          <li>❌ I am loving this song.</li>
          <li>✔ I love this song.</li>
        </ul>
        <p className="mt-3 text-sm example-muted">Nie wszystkie czasowniki naturalnie występują w formie -ing.</p>
        <Link href="/app/grammar/stative-verbs" className="mt-2 inline-block text-sm text-white/60 underline hover:text-white/80">
          Zobacz stative verbs
        </Link>
      </section>

      <section className="rounded-xl border border-white/15 bg-white/5 p-4">
        <h2 className="mb-2 text-lg font-semibold text-white">PORÓWNAJ</h2>
        <p className="text-sm text-white/85">
          Present Simple mówi o tym, co stałe.
          <br />
          Present Continuous mówi o tym, co trwa lub jest tymczasowe.
        </p>
        <Link
          href="/app/grammar/compare?tense1=present-continuous&tense2=present-simple"
          className="mt-2 inline-block text-white/80 underline hover:text-white"
        >
          Present Continuous vs Present Simple
        </Link>
      </section>

      <Coach />
    </main>
  );
}

