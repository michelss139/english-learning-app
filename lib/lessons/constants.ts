/** Debounce for both teacher_note and student_note autosave (aligned). */
export const LESSON_NOTE_AUTOSAVE_DEBOUNCE_MS = 1000;

/** Delay before one retry after a failed teacher_note autosave (network only; 409 is not retried). */
export const TEACHER_NOTE_AUTOSAVE_RETRY_DELAY_MS = 1500;

/**
 * Student poll interval: pulls lesson row to sync teacher_note when the teacher edits elsewhere.
 * Not realtime collaboration — intentional MVP tradeoff.
 */
export const STUDENT_LESSON_POLL_INTERVAL_MS = 3000;
