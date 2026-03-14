"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../_components/TileWithSidebar";

const topics: SidebarItem<string>[] = [
  { id: "zero", title: "Zero Conditional", href: "/app/grammar/conditionals/zero" },
  { id: "first", title: "First Conditional", href: "/app/grammar/conditionals/first" },
  { id: "second", title: "Second Conditional", href: "/app/grammar/conditionals/second" },
  { id: "third", title: "Third Conditional", href: "/app/grammar/conditionals/third" },
  { id: "mixed", title: "Mixed Conditionals", href: "/app/grammar/conditionals/mixed" },
  { id: "connectors", title: "Conditional Connectors", href: "/app/grammar/conditionals/connectors" },
];

function ZeroConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>Zero Conditional składa się z dwóch części:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>if clause</strong> – część z warunkiem</li>
        <li><strong>main clause</strong> – część z rezultatem</li>
      </ul>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
        <p className="font-medium">If + present simple, present simple</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>If you heat ice, it melts.</p>
      </div>
      <p>Możliwa jest też odwrotna kolejność:</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>Ice melts if you heat it.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800">
        <p className="font-medium">Można to zapamiętać jako:</p>
        <p className="font-medium">A + B</p>
        <p className="font-medium">B + A</p>
      </div>
    </div>
  );
}

function FirstConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>First Conditional składa się z dwóch części:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>if clause</strong> – część z warunkiem</li>
        <li><strong>main clause</strong> – część z rezultatem</li>
      </ul>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
        <p className="font-medium">If + present simple, will + infinitive</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>If you study, you will pass the exam.</p>
      </div>
      <p>Tak jak w Zero Conditional, możliwa jest też odwrotna kolejność:</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>You will pass the exam if you study.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800">
        <p className="font-medium">Można to zapamiętać jako:</p>
        <p className="font-medium">A + B</p>
        <p className="font-medium">B + A</p>
      </div>
    </div>
  );
}

function SecondConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>Second Conditional składa się z dwóch części:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>if clause</strong> – część z warunkiem</li>
        <li><strong>main clause</strong> – część z rezultatem</li>
      </ul>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
        <p className="font-medium">If + past simple, would + infinitive</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>If I knew the answer, I would tell you.</p>
      </div>
      <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>I would tell you if I knew the answer.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800">
        <p className="font-medium">Można to zapamiętać jako:</p>
        <p className="font-medium">A + B</p>
        <p className="font-medium">B + A</p>
      </div>
    </div>
  );
}

function ThirdConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>Third Conditional składa się z dwóch części:</p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>if clause</strong> – część z warunkiem</li>
        <li><strong>main clause</strong> – część z rezultatem</li>
      </ul>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
        <p className="font-medium">If + past perfect, would have + past participle</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>If she had left earlier, she would have caught the train.</p>
      </div>
      <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
        <p>She would have caught the train if she had left earlier.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800">
        <p className="font-medium">Można to zapamiętać jako:</p>
        <p className="font-medium">A + B</p>
        <p className="font-medium">B + A</p>
      </div>
    </div>
  );
}

function MixedConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>
        Mixed Conditional powstaje przez <strong>połączenie różnych typów zdań warunkowych</strong>.
        Najczęściej spotykamy dwa warianty.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <p className="font-medium text-slate-900">Typ 1 — przeszłość → teraźniejszość</p>
        <p className="text-sm">
          Warunek odnosi się do <strong>przeszłości</strong>, a rezultat opisuje{" "}
          <strong>obecną sytuację</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p className="font-medium">If + past perfect, would + infinitive</p>
          <p className="mt-1">If I had studied medicine, I would be a doctor now.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <p className="font-medium text-slate-900">Typ 2 — teraźniejszość → przeszłość</p>
        <p className="text-sm">
          Warunek odnosi się do <strong>teraźniejszości</strong>, a rezultat opisuje{" "}
          <strong>przeszłość</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p className="font-medium">If + past simple, would have + past participle</p>
          <p className="mt-1">If I were more careful, I would not have made that mistake.</p>
        </div>
      </div>
    </div>
  );
}

function ConnectorsConstruction() {
  return (
    <div className="space-y-4 text-slate-700">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
        <p className="font-medium text-slate-900">Unless</p>
        <p className="text-sm">
          <strong>Unless</strong> oznacza <strong>„chyba że”</strong> i używamy go, gdy mówimy, że
          coś się wydarzy, jeżeli pewien warunek <strong>nie zostanie spełniony</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p className="font-medium">I will fail unless you help me.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
        <p className="font-medium text-slate-900">As long as</p>
        <p className="text-sm">
          <strong>As long as</strong> oznacza <strong>„pod warunkiem że”</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p>You can stay here as long as you are quiet.</p>
        </div>
      </div>
    </div>
  );
}

const CONSTRUCTION_MAP: Record<string, () => React.ReactNode> = {
  zero: ZeroConstruction,
  first: FirstConstruction,
  second: SecondConstruction,
  third: ThirdConstruction,
  mixed: MixedConstruction,
  connectors: ConnectorsConstruction,
};

export function ConditionalsClient() {
  return (
    <TileWithSidebar
      title="Conditionals"
      description="Zdania warunkowe. Wybierz typ z listy."
      backHref="/app/grammar"
      backLabel="← Wróć do gramatyki"
      items={topics}
      renderContent={(item) => {
        const Construction = CONSTRUCTION_MAP[item.id];
        return (
          <div className="flex flex-col gap-3">
            <h2 className="text-center text-2xl font-semibold text-slate-900">{item.title}</h2>
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
              {Construction ? <Construction /> : null}
            </div>
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex w-fit rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Zobacz całą teorię
              </Link>
            )}
          </div>
        );
      }}
    />
  );
}
