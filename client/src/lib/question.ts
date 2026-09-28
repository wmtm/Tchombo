import type { Question } from "@tchombo/shared";
import type { Locale } from "../i18n";

// Question content (unlike UI chrome) is only translated per-question when a
// `question_fr`/`unit_fr` was written for it, so this always falls back to
// the English original rather than showing nothing.
export function localizeQuestion<Q extends Pick<Question, "question" | "unit" | "question_fr" | "unit_fr">>(
  question: Q,
  locale: Locale
): { text: string; unit: string } {
  if (locale === "fr" && question.question_fr) {
    return { text: question.question_fr, unit: question.unit_fr ?? question.unit };
  }
  return { text: question.question, unit: question.unit };
}

// Same fallback rule as localizeQuestion, for the after-the-fact sourcing
// note shown on the History panel and the reveal screen.
export function localizeSourceNote<Q extends Pick<Question, "source_note" | "source_note_fr">>(
  question: Q,
  locale: Locale
): string {
  if (locale === "fr" && question.source_note_fr) return question.source_note_fr;
  return question.source_note;
}
