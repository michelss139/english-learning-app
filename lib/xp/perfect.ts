type PerfectInput = {
  totalCount: number;
  wrongCount: number;
  minAnswers?: number;
};

export function isPerfectSession({ totalCount, wrongCount, minAnswers = 1 }: PerfectInput): boolean {
  return totalCount >= minAnswers && wrongCount === 0;
}
