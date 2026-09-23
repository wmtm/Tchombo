import { Category, Question } from "./types.js";

export function makeQuestionPicker(
  allQuestions: Question[],
  categories: Category[]
): (used: Set<string>) => Question | null {
  return (used: Set<string>) => {
    const pool = allQuestions.filter(
      (q) => q.active && q.status === "live" && categories.includes(q.category) && !used.has(q.id)
    );
    if (pool.length === 0) return null;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  };
}
