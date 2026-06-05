type WeekDay = {
  label: string;
  done: boolean;
};

type Props = {
  currentStreak: number;
  bestStreak: number;
  weekActivity: WeekDay[];
};

export default function StreakWidget({ currentStreak, bestStreak, weekActivity }: Props) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-slate-900">{currentStreak}</span>
          <span className="text-base font-medium text-slate-500">
            {currentStreak === 1 ? "dzień" : "dni"}
          </span>
        </div>
        {bestStreak > 0 && (
          <div className="text-right">
            <div className="text-xs font-medium text-slate-400">rekord</div>
            <div className="text-base font-bold text-slate-700">{bestStreak} dni</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {weekActivity.map((day) => (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-2 w-full rounded-full transition-colors duration-300 ${
                day.done ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-slate-100"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
