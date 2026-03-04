"use client";

type LessonDayProps = {
  dayNumber: number;
  dateIso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasLesson: boolean;
  lessonTopic?: string;
  vocabCount?: number;
  assignmentCount?: number;
  topicType?: "conversation" | "grammar" | "mixed" | "none";
  disabled?: boolean;
  onClick: (dateIso: string) => void;
};

export default function LessonDay({
  dayNumber,
  dateIso,
  isCurrentMonth,
  isToday,
  hasLesson,
  lessonTopic,
  vocabCount = 0,
  assignmentCount = 0,
  topicType = "none",
  disabled = false,
  onClick,
}: LessonDayProps) {
  const baseClasses =
    "group relative min-h-24 rounded-xl border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400/40";
  const stateClasses = !isCurrentMonth
    ? "border-slate-100 bg-slate-50 text-slate-300"
    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  const todayClasses = isToday ? " ring-2 ring-slate-300" : "";
  const indicatorColorByType: Record<NonNullable<LessonDayProps["topicType"]>, string> = {
    conversation: "#22c55e",
    grammar: "#3b82f6",
    mixed: "#f97316",
    none: "#9ca3af",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(dateIso)}
      className={`${baseClasses}${stateClasses}${todayClasses}${disabled ? " cursor-not-allowed opacity-70" : ""}`}
      title={hasLesson ? lessonTopic || "Lekcja" : "Dodaj lekcję"}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{String(dayNumber).padStart(2, "0")}</span>
          {hasLesson ? (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: indicatorColorByType[topicType] }}
              aria-label={`topic type ${topicType}`}
            />
          ) : null}
        </div>

        {hasLesson ? (
          <div className="space-y-0.5">
            <p className="truncate text-[11px] text-slate-500">{lessonTopic?.trim() || "Lesson"}</p>
            {vocabCount > 0 ? <p className="text-[11px] text-slate-500">{vocabCount} words</p> : null}
            {assignmentCount > 0 ? (
              <p className="text-[11px] text-slate-500">{assignmentCount} homework</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
