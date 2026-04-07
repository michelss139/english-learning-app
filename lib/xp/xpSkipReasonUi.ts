import type { XpSkipReasonCode } from "@/lib/xp/award";

/** Polish copy when `xp_awarded === 0` (maps backend `xp_skip_reason`). */
export function xpZeroSessionMessage(reason: XpSkipReasonCode | string | null | undefined): string {
  switch (reason) {
    case "already_awarded_today":
      return "Masz już XP za ten zestaw dziś";
    case "repeat_not_qualified":
      return "Brak nowych rzeczy do nauki w tej sesji";
    case "not_eligible_for_award":
      return "Za mała sesja, żeby przyznać XP";
    case "session_already_completed":
      return "Ta sesja została już ukończona";
    case "isolated_lesson_no_xp":
      return "Ta sesja lekcyjna nie daje XP";
    default:
      return "Brak XP za tę sesję";
  }
}
