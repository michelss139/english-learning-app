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

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-900">
      {children}
    </div>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      {children}
    </div>
  );
}

function MemoryBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-800">
      {children}
    </div>
  );
}

function ZeroConstruction() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>Zero Conditional składa się z dwóch części:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>if clause</strong> — część z warunkiem
        </li>
        <li>
          <strong>main clause</strong> — część z rezultatem
        </li>
      </ul>
      <FormulaBox>If + present simple, present simple</FormulaBox>
      <ExampleBox>If you heat ice, it melts.</ExampleBox>
      <p>Możliwa jest też odwrotna kolejność:</p>
      <ExampleBox>Ice melts if you heat it.</ExampleBox>
      <MemoryBox>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Można zapamiętać jako
        </div>
        <div className="text-base font-semibold text-slate-900">A + B</div>
        <div className="text-base font-semibold text-slate-900">B + A</div>
      </MemoryBox>
    </div>
  );
}

function FirstConstruction() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>First Conditional składa się z dwóch części:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>if clause</strong> — część z warunkiem
        </li>
        <li>
          <strong>main clause</strong> — część z rezultatem
        </li>
      </ul>
      <FormulaBox>If + present simple, will + infinitive</FormulaBox>
      <ExampleBox>If you study, you will pass the exam.</ExampleBox>
      <p>Tak jak w Zero Conditional, możliwa jest też odwrotna kolejność:</p>
      <ExampleBox>You will pass the exam if you study.</ExampleBox>
      <MemoryBox>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Można zapamiętać jako
        </div>
        <div className="text-base font-semibold text-slate-900">A + B</div>
        <div className="text-base font-semibold text-slate-900">B + A</div>
      </MemoryBox>
    </div>
  );
}

function SecondConstruction() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>Second Conditional składa się z dwóch części:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>if clause</strong> — część z warunkiem
        </li>
        <li>
          <strong>main clause</strong> — część z rezultatem
        </li>
      </ul>
      <FormulaBox>If + past simple, would + infinitive</FormulaBox>
      <ExampleBox>If I knew the answer, I would tell you.</ExampleBox>
      <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
      <ExampleBox>I would tell you if I knew the answer.</ExampleBox>
      <MemoryBox>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Można zapamiętać jako
        </div>
        <div className="text-base font-semibold text-slate-900">A + B</div>
        <div className="text-base font-semibold text-slate-900">B + A</div>
      </MemoryBox>
    </div>
  );
}

function ThirdConstruction() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>Third Conditional składa się z dwóch części:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>if clause</strong> — część z warunkiem
        </li>
        <li>
          <strong>main clause</strong> — część z rezultatem
        </li>
      </ul>
      <FormulaBox>If + past perfect, would have + past participle</FormulaBox>
      <ExampleBox>If she had left earlier, she would have caught the train.</ExampleBox>
      <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
      <ExampleBox>She would have caught the train if she had left earlier.</ExampleBox>
      <MemoryBox>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Można zapamiętać jako
        </div>
        <div className="text-base font-semibold text-slate-900">A + B</div>
        <div className="text-base font-semibold text-slate-900">B + A</div>
      </MemoryBox>
    </div>
  );
}

function MixedConstruction() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>
        Mixed Conditional powstaje przez <strong>połączenie różnych typów zdań warunkowych</strong>.
        Najczęściej spotykamy dwa warianty.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Typ 1 — przeszłość → teraźniejszość
        </p>
        <p className="text-sm">
          Warunek odnosi się do <strong>przeszłości</strong>, a rezultat opisuje{" "}
          <strong>obecną sytuację</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p className="font-medium">If + past perfect, would + infinitive</p>
          <p className="mt-1">If I had studied medicine, I would be a doctor now.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Typ 2 — teraźniejszość → przeszłość
        </p>
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
    <div className="space-y-3 text-sm text-slate-700">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Unless</p>
        <p className="text-sm">
          <strong>Unless</strong> oznacza <strong>„chyba że"</strong> i używamy go, gdy mówimy, że
          coś się wydarzy, jeżeli pewien warunek <strong>nie zostanie spełniony</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          I will fail unless you help me.
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          As long as
        </p>
        <p className="text-sm">
          <strong>As long as</strong> oznacza <strong>„pod warunkiem że"</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          You can stay here as long as you are quiet.
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
      description="Zdania warunkowe. Wybierz typ z listy, aby zobaczyć budowę, formułę i przykład."
      backHref="/app/grammar"
      backLabel="← Gramatyka"
      items={topics}
      renderContent={(item) => {
        const Construction = CONSTRUCTION_MAP[item.id];
        return (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h2>
            <div>{Construction ? <Construction /> : null}</div>
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                Zobacz całą teorię →
              </Link>
            )}
          </div>
        );
      }}
    />
  );
}
