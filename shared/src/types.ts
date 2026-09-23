// Shared types for TCHOMBO — used by both server and (indirectly) client via socket payloads.

export const CATEGORIES = [
  "history",
  "nature_environment",
  "culture_music",
  "geography",
  "mauritian_life",
  "sports_random",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DIFFICULTIES = ["easy", "medium", "hard", "very_hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DODO_PENALTY: Record<Difficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
  very_hard: 5,
};

export const DODOS_TO_LOSE = 30;

export interface Question {
  id: string;
  category: Category;
  question: string;
  answer: number;
  unit: string;
  allow_decimal: boolean;
  difficulty: Difficulty;
  dodo_penalty: number;
  source: string;
  source_note: string;
  active: boolean;
  status: "live" | "draft";
}

export type GameStatus = "lobby" | "playing" | "reveal" | "finished";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  dodos: number;
  order: number;
}

export interface TurnEntry {
  playerId: string;
  playerName: string;
  value: number;
}

export interface RevealResult {
  question: Question;
  entries: TurnEntry[];
  callerId: string;
  callerName: string;
  loserId: string;
  loserName: string;
  loserValue: number;
  correctAnswer: number;
  callerWasCorrect: boolean;
  dodosAwarded: number;
}

export interface PublicGameState {
  roomCode: string;
  status: GameStatus;
  players: Player[];
  hostId: string;
  turnOrder: string[];
  currentPlayerId: string | null;
  startingPlayerIndex: number;
  questionNumber: number;
  currentQuestion: Omit<Question, "answer"> | null;
  entries: TurnEntry[];
  highestValue: number | null;
  lastReveal: RevealResult | null;
  loserOfGame: string | null;
  categories: Category[];
}
