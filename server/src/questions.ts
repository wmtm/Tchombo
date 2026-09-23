import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, DIFFICULTIES, DODO_PENALTY, Question } from "@tchombo/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const QUESTIONS_PATH = path.join(__dirname, "..", "data", "questions.json");

let cache: Question[] | null = null;

function validate(q: unknown, index: number): Question {
  const errors: string[] = [];
  const question = q as Record<string, unknown>;

  const isString = (v: unknown) => typeof v === "string" && v.length > 0;

  if (!isString(question.id)) errors.push("id");
  if (!CATEGORIES.includes(question.category as any)) errors.push("category");
  if (!isString(question.question)) errors.push("question");
  if (typeof question.answer !== "number" || !Number.isFinite(question.answer)) errors.push("answer");
  if (typeof question.unit !== "string") errors.push("unit");
  if (typeof question.allow_decimal !== "boolean") errors.push("allow_decimal");
  if (!DIFFICULTIES.includes(question.difficulty as any)) errors.push("difficulty");
  if (typeof question.dodo_penalty !== "number") errors.push("dodo_penalty");
  if (!isString(question.source)) errors.push("source");
  if (typeof question.source_note !== "string") errors.push("source_note");
  if (typeof question.active !== "boolean") errors.push("active");
  if (question.status !== "live" && question.status !== "draft") errors.push("status");

  if (errors.length > 0) {
    throw new Error(`Question at index ${index} (id=${question.id ?? "?"}) is invalid: ${errors.join(", ")}`);
  }

  const expectedPenalty = DODO_PENALTY[question.difficulty as keyof typeof DODO_PENALTY];
  if (question.dodo_penalty !== expectedPenalty) {
    console.warn(
      `[questions] ${question.id}: dodo_penalty ${question.dodo_penalty} does not match difficulty "${question.difficulty}" (expected ${expectedPenalty})`
    );
  }

  return question as unknown as Question;
}

export async function loadAllQuestions(forceReload = false): Promise<Question[]> {
  if (cache && !forceReload) return cache;
  const raw = await readFile(QUESTIONS_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("questions.json must contain a JSON array");

  const seen = new Set<string>();
  const questions = parsed.map((q, i) => {
    const validated = validate(q, i);
    if (seen.has(validated.id)) throw new Error(`Duplicate question id: ${validated.id}`);
    seen.add(validated.id);
    return validated;
  });

  cache = questions;
  return questions;
}

export async function saveAllQuestions(questions: Question[]): Promise<void> {
  const seen = new Set<string>();
  questions.forEach((q, i) => {
    validate(q, i);
    if (seen.has(q.id)) throw new Error(`Duplicate question id: ${q.id}`);
    seen.add(q.id);
  });
  await writeFile(QUESTIONS_PATH, JSON.stringify(questions, null, 2) + "\n", "utf-8");
  cache = questions;
}

export async function getLiveQuestions(): Promise<Question[]> {
  const all = await loadAllQuestions();
  return all.filter((q) => q.active && q.status === "live");
}
