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

// Every player starts a game with this many "lives" (displayed as dodos) and
// loses dodo_penalty points each time they lose a TCHOMBO challenge. Reaching
// 0 means you're out. Internally a player's score (Player.dodos) still counts
// UP from 0 (dodos collected) — livesRemaining() is the display-facing flip.
export const DODOS_TO_LOSE = 15;

export function livesRemaining(dodosCollected: number): number {
  return Math.max(0, DODOS_TO_LOSE - dodosCollected);
}

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

export type EndReason = "dodo_limit" | "not_enough_players" | "no_questions_left";

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
  history: RevealResult[];
  loserOfGame: string | null;
  endReason: EndReason | null;
  categories: Category[];
}
