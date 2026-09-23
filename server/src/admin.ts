import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, DIFFICULTIES, DODO_PENALTY, Question } from "@tchombo/shared";
import { loadAllQuestions, saveAllQuestions } from "./questions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "tchombo-dodo";

export const adminRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="TCHOMBO admin"');
    return res.status(401).send("Authentication required.");
  }
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const [, password] = decoded.split(":");
  if (password !== ADMIN_PASSWORD) {
    res.set("WWW-Authenticate", 'Basic realm="TCHOMBO admin"');
    return res.status(401).send("Wrong password.");
  }
  next();
}

adminRouter.use(requireAuth);
adminRouter.use((req, res, next) => {
  // small note in every response header so it's obvious this is a hobby admin, not a real backend
  res.set("X-Tchombo-Admin", "1");
  next();
});

adminRouter.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

adminRouter.get("/api/meta", (_req, res) => {
  res.json({ categories: CATEGORIES, difficulties: DIFFICULTIES, dodoPenalty: DODO_PENALTY });
});

adminRouter.get("/api/questions", async (_req, res) => {
  try {
    const questions = await loadAllQuestions(true);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load questions." });
  }
});

adminRouter.post("/api/questions", async (req, res) => {
  try {
    const questions = await loadAllQuestions(true);
    const incoming = req.body as Question;
    if (questions.some((q) => q.id === incoming.id)) {
      return res.status(400).json({ error: `Question id "${incoming.id}" already exists.` });
    }
    questions.push(incoming);
    await saveAllQuestions(questions);
    res.status(201).json(incoming);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to add question." });
  }
});

adminRouter.put("/api/questions/:id", async (req, res) => {
  try {
    const questions = await loadAllQuestions(true);
    const index = questions.findIndex((q) => q.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Question not found." });
    questions[index] = { ...questions[index], ...req.body, id: questions[index].id };
    await saveAllQuestions(questions);
    res.json(questions[index]);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update question." });
  }
});

adminRouter.delete("/api/questions/:id", async (req, res) => {
  try {
    const questions = await loadAllQuestions(true);
    const next = questions.filter((q) => q.id !== req.params.id);
    if (next.length === questions.length) return res.status(404).json({ error: "Question not found." });
    await saveAllQuestions(next);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete question." });
  }
});
