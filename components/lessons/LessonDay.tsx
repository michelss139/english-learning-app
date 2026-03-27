"use client";

function formatLessonCountLabel(n: number): string {
  if (n <= 1) return "Lekcja";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} lekcje`;
  return `${n} lekcji`;
}

const microLabelClass =
  "shrink-0 text-left text-xs font-medium uppercase tracking-wide text-slate-500";

type LessonDayProps = {
  dayNumber: number;
  dateIso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  lessonCount: number;
  previewTopic?: string;
  /** When exactly one lesson that day: distinguishes teacher vs self session. */
  previewKind?: "teacher" | "self";
  disabled?: boolean;
  onClick: (dateIso: string) => void;
};

export default function LessonDay({
  dayNumber,
  dateIso,
  isCurrentMonth,
  isToday,
  lessonCount,
  previewTopic,
  previewKind,
  disabled = false,
  onClick,
}: LessonDayProps) {
  const hasLesson = lessonCount > 0;
  const selfSingle = hasLesson && lessonCount === 1 && previewKind === "self";

  const baseClasses =
    "relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-lg border px-1.5 pt-1 pb-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10";

  const transitionCell =
    "transition-[border-color,background-color] duration-200 ease-out";

  let stateClasses: string;
  if (!isCurrentMonth) {
    if (hasLesson) {
      stateClasses = selfSingle
        ? `${transitionCell} border-slate-100 bg-slate-50 text-slate-400 cursor-pointer group hover:border-slate-200/90 hover:bg-slate-50/[0.65]`
        : `${transitionCell} border-slate-100 bg-slate-50 text-slate-400 cursor-pointer group hover:border-slate-200 hover:bg-slate-50/90`;
    } else {
      stateClasses = `${transitionCell} border-slate-100 bg-slate-50 text-slate-300 cursor-pointer hover:border-slate-200 hover:bg-slate-50/80`;
    }
  } else if (hasLesson) {
    const todayBg = isToday ? "bg-slate-50/95" : "bg-white";
    stateClasses = selfSingle
      ? `${transitionCell} ${todayBg} border-slate-200 text-slate-800 cursor-pointer group hover:border-slate-200/95 hover:bg-slate-50/[0.72]`
      : `${transitionCell} ${todayBg} border-slate-200 text-slate-800 cursor-pointer group hover:border-slate-300 hover:bg-slate-50/80`;
  } else {
    const todayEmpty = isToday
      ? "border-slate-200 bg-slate-50/95 text-slate-800"
      : "border-slate-200 bg-white text-slate-800";
    stateClasses = `${transitionCell} ${todayEmpty} cursor-pointer hover:border-slate-300 hover:bg-slate-50/80`;
  }

  const topicTrimmed = previewTopic?.trim() ?? "";
  const topicMotion = selfSingle
    ? "min-w-0 max-w-full break-words text-left text-xs font-semibold leading-[1.38] text-slate-800 line-clamp-2 transition-[color] duration-150 ease-out group-hover:text-slate-900"
    : "min-w-0 max-w-full break-words text-left text-xs font-semibold leading-[1.38] text-slate-800 line-clamp-2 transition-[transform,color] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-slate-900";

  const countLabel = lessonCount > 0 ? formatLessonCountLabel(lessonCount) : "";
  const singleTypeLabel = lessonCount === 1 ? (previewKind === "self" ? "Twoja sesja" : "Lekcja") : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(dateIso)}
      className={`${baseClasses} ${stateClasses}${disabled ? " cursor-not-allowed opacity-70" : ""}`}
      title={
        hasLesson
          ? lessonCount > 1
            ? `${lessonCount} lekcji${topicTrimmed ? ` · ${topicTrimmed}` : ""}`
            : topicTrimmed || (previewKind === "self" ? "Twoja sesja" : "Lekcja")
          : "Otwórz dzień"
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">
          {String(dayNumber).padStart(2, "0")}
        </span>

        {hasLesson ? (
          <>
            <div className="mt-1 flex min-h-0 min-w-0 flex-col gap-1">
              {lessonCount === 1 && singleTypeLabel ? (
                <span className={microLabelClass}>{singleTypeLabel}</span>
              ) : lessonCount > 1 ? (
                <span className="shrink-0 text-[15px] font-[520] uppercase leading-none text-slate-500">
                  {countLabel}
                </span>
              ) : null}
              {lessonCount === 1 && topicTrimmed ? <p className={topicMotion}>{topicTrimmed}</p> : null}
              {lessonCount > 1 && topicTrimmed ? (
                <p className="min-w-0 max-w-full truncate text-left text-[11px] font-medium leading-snug text-slate-600">
                  {topicTrimmed}
                </p>
              ) : null}
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </>
        ) : null}
      </div>
    </button>
  );
}
