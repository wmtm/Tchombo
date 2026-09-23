import {
  Category,
  DODOS_TO_LOSE,
  DODO_PENALTY,
  GameStatus,
  Player,
  PublicGameState,
  Question,
  RevealResult,
  TurnEntry,
} from "./types.js";

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

export interface Game {
  roomCode: string;
  status: GameStatus;
  players: Player[]; // order === turn order, index-based
  hostId: string;
  currentPlayerIndex: number; // index into players
  startingPlayerIndex: number;
  questionNumber: number;
  currentQuestion: Question | null;
  entries: TurnEntry[];
  usedQuestionIds: Set<string>;
  lastReveal: RevealResult | null;
  loserOfGame: string | null;
  categories: Category[];
  createdAt: number;
}

const EPSILON = 1e-9;

export function createGame(
  roomCode: string,
  host: Omit<Player, "isHost" | "connected" | "dodos" | "order">,
  categories: Category[]
): Game {
  return {
    roomCode,
    status: "lobby",
    players: [{ ...host, isHost: true, connected: true, dodos: 0, order: 0 }],
    hostId: host.id,
    currentPlayerIndex: 0,
    startingPlayerIndex: 0,
    questionNumber: 0,
    currentQuestion: null,
    entries: [],
    usedQuestionIds: new Set(),
    lastReveal: null,
    loserOfGame: null,
    categories,
    createdAt: Date.now(),
  };
}

export function addPlayer(
  game: Game,
  player: Omit<Player, "isHost" | "connected" | "dodos" | "order">
): Game {
  if (game.status !== "lobby") {
    throw new GameError("This game has already started.");
  }
  if (game.players.length >= 6) {
    throw new GameError("This room is full (6 players maximum).");
  }
  if (game.players.some((p) => p.id === player.id)) {
    return game;
  }
  game.players.push({
    ...player,
    isHost: false,
    connected: true,
    dodos: 0,
    order: game.players.length,
  });
  return game;
}

export function setPlayerConnected(game: Game, playerId: string, connected: boolean): Game {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return game;
  player.connected = connected;

  if (!connected && player.isHost) {
    const nextHost = game.players.find((p) => p.connected && p.id !== playerId);
    if (nextHost) {
      player.isHost = false;
      nextHost.isHost = true;
      game.hostId = nextHost.id;
    }
  }
  return game;
}

export function removePlayerFromLobby(game: Game, playerId: string): Game {
  if (game.status !== "lobby") {
    throw new GameError("Cannot remove a player after the game has started.");
  }
  game.players = game.players.filter((p) => p.id !== playerId);
  game.players.forEach((p, i) => (p.order = i));
  if (game.hostId === playerId && game.players.length > 0) {
    game.players[0].isHost = true;
    game.hostId = game.players[0].id;
  }
  return game;
}

export function canStart(game: Game): boolean {
  return game.status === "lobby" && game.players.length >= 2;
}

export function startGame(game: Game, pickQuestion: (used: Set<string>) => Question | null): Game {
  if (!canStart(game)) {
    throw new GameError("Need at least 2 players to start.");
  }
  game.status = "playing";
  game.startingPlayerIndex = 0;
  game.currentPlayerIndex = 0;
  return beginQuestion(game, pickQuestion);
}

function beginQuestion(game: Game, pickQuestion: (used: Set<string>) => Question | null): Game {
  const question = pickQuestion(game.usedQuestionIds);
  if (!question) {
    throw new GameError("No more questions available in the selected categories.");
  }
  game.usedQuestionIds.add(question.id);
  game.currentQuestion = question;
  game.entries = [];
  game.questionNumber += 1;
  game.currentPlayerIndex = game.startingPlayerIndex;
  game.status = "playing";
  game.lastReveal = null;
  return game;
}

function currentPlayer(game: Game): Player {
  return game.players[game.currentPlayerIndex];
}

function assertConnectedPlayers(game: Game) {
  // no-op placeholder for future disconnect-aware turn skipping
}

export function submitNumber(game: Game, playerId: string, value: number): Game {
  if (game.status !== "playing") {
    throw new GameError("No active question right now.");
  }
  const player = currentPlayer(game);
  if (player.id !== playerId) {
    throw new GameError("It's not your turn.");
  }
  if (!game.currentQuestion) {
    throw new GameError("No active question right now.");
  }
  if (!Number.isFinite(value)) {
    throw new GameError("Please enter a valid number.");
  }
  if (value < 0) {
    throw new GameError("The number can't be negative.");
  }
  if (!game.currentQuestion.allow_decimal && !Number.isInteger(value)) {
    throw new GameError("This question only accepts whole numbers.");
  }
  if (game.currentQuestion.allow_decimal) {
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded - value) > EPSILON) {
      throw new GameError("Please use at most 2 decimal places.");
    }
  }

  const previous = game.entries[game.entries.length - 1];
  if (previous && value <= previous.value + EPSILON) {
    throw new GameError(
      `Your number must be higher than ${formatValue(previous.value)} ${game.currentQuestion.unit}.`
    );
  }

  game.entries.push({ playerId: player.id, playerName: player.name, value });
  advanceTurn(game);
  return game;
}

function advanceTurn(game: Game) {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function callTchombo(game: Game, callerId: string): Game {
  if (game.status !== "playing") {
    throw new GameError("No active question right now.");
  }
  const caller = currentPlayer(game);
  if (caller.id !== callerId) {
    throw new GameError("It's not your turn to call TCHOMBO.");
  }
  if (game.entries.length === 0) {
    throw new GameError("There's no previous answer to challenge yet.");
  }
  if (!game.currentQuestion) {
    throw new GameError("No active question right now.");
  }

  const previous = game.entries[game.entries.length - 1];
  const question = game.currentQuestion;
  const previousExceeded = previous.value > question.answer + EPSILON;

  const loserId = previousExceeded ? previous.playerId : caller.id;
  const loserName = previousExceeded ? previous.playerName : caller.name;
  const loser = game.players.find((p) => p.id === loserId)!;
  loser.dodos += question.dodo_penalty;

  const reveal: RevealResult = {
    question,
    entries: [...game.entries],
    callerId: caller.id,
    callerName: caller.name,
    loserId,
    loserName,
    loserValue: previous.value,
    correctAnswer: question.answer,
    callerWasCorrect: previousExceeded,
    dodosAwarded: question.dodo_penalty,
  };

  game.lastReveal = reveal;
  game.status = "reveal";

  if (loser.dodos >= DODOS_TO_LOSE) {
    game.status = "finished";
    game.loserOfGame = loser.id;
  }

  return game;
}

export function advanceToNextQuestion(
  game: Game,
  pickQuestion: (used: Set<string>) => Question | null
): Game {
  if (game.status !== "reveal") {
    throw new GameError("Can't start a new question right now.");
  }
  game.startingPlayerIndex = (game.startingPlayerIndex + 1) % game.players.length;
  return beginQuestion(game, pickQuestion);
}

export function restartGame(
  game: Game,
  pickQuestion: (used: Set<string>) => Question | null
): Game {
  game.players.forEach((p) => (p.dodos = 0));
  game.usedQuestionIds.clear();
  game.questionNumber = 0;
  game.startingPlayerIndex = 0;
  game.loserOfGame = null;
  game.lastReveal = null;
  game.status = "playing";
  return beginQuestion(game, pickQuestion);
}

export function toPublicState(game: Game): PublicGameState {
  const currentQuestionPublic = game.currentQuestion
    ? stripAnswer(game.currentQuestion)
    : null;
  const highestValue =
    game.entries.length > 0 ? game.entries[game.entries.length - 1].value : null;

  return {
    roomCode: game.roomCode,
    status: game.status,
    players: game.players,
    hostId: game.hostId,
    turnOrder: game.players.map((p) => p.id),
    currentPlayerId:
      game.status === "playing" ? game.players[game.currentPlayerIndex]?.id ?? null : null,
    startingPlayerIndex: game.startingPlayerIndex,
    questionNumber: game.questionNumber,
    currentQuestion: currentQuestionPublic,
    entries: game.entries,
    highestValue,
    lastReveal: game.lastReveal,
    loserOfGame: game.loserOfGame,
    categories: game.categories,
  };
}

function stripAnswer(q: Question): Omit<Question, "answer"> {
  const { answer, ...rest } = q;
  return rest;
}

export function nextPlayerName(game: Game): string | null {
  if (game.status !== "playing" || game.players.length < 2) return null;
  const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
  return game.players[nextIndex].name;
}

export { DODO_PENALTY };
