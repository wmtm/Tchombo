import {
  Category,
  DODOS_TO_LOSE,
  DODO_PENALTY,
  EndReason,
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
  history: RevealResult[];
  loserOfGame: string | null;
  winnerOfGame: string | null;
  endReason: EndReason | null;
  categories: Category[];
  createdAt: number;
}

const EPSILON = 1e-9;

export function createGame(
  roomCode: string,
  host: Omit<Player, "isHost" | "connected" | "dodos" | "order" | "eliminated">,
  categories: Category[]
): Game {
  return {
    roomCode,
    status: "lobby",
    players: [{ ...host, isHost: true, connected: true, dodos: 0, order: 0, eliminated: false }],
    hostId: host.id,
    currentPlayerIndex: 0,
    startingPlayerIndex: 0,
    questionNumber: 0,
    currentQuestion: null,
    entries: [],
    usedQuestionIds: new Set(),
    lastReveal: null,
    history: [],
    loserOfGame: null,
    winnerOfGame: null,
    endReason: null,
    categories,
    createdAt: Date.now(),
  };
}

export function addPlayer(
  game: Game,
  player: Omit<Player, "isHost" | "connected" | "dodos" | "order" | "eliminated">
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
    eliminated: false,
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

function activePlayers(game: Game): Player[] {
  return game.players.filter((p) => !p.eliminated);
}

// Ends the game if too few players remain to continue, either because most of
// the room left entirely, or because eliminations have worn the field down to
// a single survivor (who wins by default). Returns true if it ended the game.
// Never called from inside callTchombo -- the reveal must be shown first.
function checkGameEnd(game: Game): boolean {
  if (game.status === "finished") return true;
  const active = activePlayers(game);

  if (game.players.length < 2) {
    game.status = "finished";
    game.endReason = "not_enough_players";
    game.winnerOfGame = active[0]?.id ?? null;
    return true;
  }
  if (active.length <= 1) {
    game.status = "finished";
    game.endReason = "dodo_limit";
    game.winnerOfGame = active[0]?.id ?? null;
    game.loserOfGame = game.lastReveal?.loserId ?? game.loserOfGame;
    return true;
  }
  return false;
}

// Steps forward from `fromIndex` and returns the index of the next player who
// hasn't been eliminated. Assumes at least one active player exists.
function nextActiveIndex(game: Game, fromIndex: number): number {
  const n = game.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!game.players[idx].eliminated) return idx;
  }
  return fromIndex;
}

// Fully removes a player from a game that has already started (playing/reveal/finished),
// unlike a disconnect (setPlayerConnected), which preserves their seat for reconnecting.
// Re-indexes turn order and currentPlayerIndex so play continues seamlessly for the rest.
export function removePlayerMidGame(game: Game, playerId: string): Game {
  const idx = game.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return game;

  const wasHost = game.hostId === playerId;

  game.players.splice(idx, 1);
  game.players.forEach((p, i) => (p.order = i));

  // Reassign host before the game-end check returns early -- otherwise a host
  // who leaves and ends the game would leave hostId pointing at someone no
  // longer in the room, and nobody could ever trigger a restart.
  if (wasHost && game.players.length > 0) {
    game.players[0].isHost = true;
    game.hostId = game.players[0].id;
  }

  if (checkGameEnd(game)) return game;

  // Splicing shifts every later index down by one. If the removed player was BEFORE
  // the current turn, shift the pointer down to keep tracking the same player. If they
  // WERE the current turn, leave the (now out-of-date) index as-is: the player who used
  // to be next has slid into that exact slot, which is exactly who should act next.
  if (idx < game.currentPlayerIndex) game.currentPlayerIndex -= 1;
  if (idx < game.startingPlayerIndex) game.startingPlayerIndex -= 1;
  game.currentPlayerIndex = wrap(game.currentPlayerIndex, game.players.length);
  game.startingPlayerIndex = wrap(game.startingPlayerIndex, game.players.length);

  // The player who now occupies currentPlayerIndex might themselves be
  // eliminated (spectating) -- if so, hand the turn to the next active player.
  if (game.status === "playing" && game.players[game.currentPlayerIndex]?.eliminated) {
    game.currentPlayerIndex = nextActiveIndex(game, game.currentPlayerIndex);
  }

  return game;
}

// Removes a player from a game in any status, dispatching to the right strategy.
export function removePlayer(game: Game, playerId: string): Game {
  if (game.status === "lobby") return removePlayerFromLobby(game, playerId);
  if (game.status === "finished") {
    game.players = game.players.filter((p) => p.id !== playerId);
    game.players.forEach((p, i) => (p.order = i));
    if (game.hostId === playerId && game.players.length > 0) {
      game.players[0].isHost = true;
      game.hostId = game.players[0].id;
    }
    return game;
  }
  return removePlayerMidGame(game, playerId);
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
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
  game.currentPlayerIndex = nextActiveIndex(game, game.currentPlayerIndex);
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

// Resolves a challenge the normal TCHOMBO way: the previous player loses if
// their number already exceeded the real answer, otherwise the challenger
// loses for calling too early. Shared by callTchombo and by callExact's
// fallback when a guessed-exact number turns out not to be exact after all.
function resolveAsTchombo(game: Game, caller: Player, previous: TurnEntry, question: Question): RevealResult {
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
  game.history.push(reveal);
  game.status = "reveal";

  // Mark them out, but DON'T end the game here -- the reveal (the answer, who
  // lost, how many dodos) must always be shown first. Whether the game is
  // actually over is decided in advanceToNextQuestion, once the reveal has
  // had its moment.
  if (loser.dodos >= DODOS_TO_LOSE) {
    loser.eliminated = true;
  }

  return reveal;
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
  resolveAsTchombo(game, caller, previous, game.currentQuestion);
  return game;
}

// Bets that the previous player's number is the EXACT correct answer, not just
// safe. Right: nobody loses any dodos. Wrong: it resolves exactly like a normal
// failed/won TCHOMBO call (the caller pays for the wrong guess, unless the
// previous number had actually already gone over).
export function callExact(game: Game, callerId: string): Game {
  if (game.status !== "playing") {
    throw new GameError("No active question right now.");
  }
  const caller = currentPlayer(game);
  if (caller.id !== callerId) {
    throw new GameError("It's not your turn to call this.");
  }
  if (game.entries.length === 0) {
    throw new GameError("There's no previous answer to challenge yet.");
  }
  if (!game.currentQuestion) {
    throw new GameError("No active question right now.");
  }

  const previous = game.entries[game.entries.length - 1];
  const question = game.currentQuestion;
  const isExact = Math.abs(previous.value - question.answer) <= EPSILON;

  if (!isExact) {
    resolveAsTchombo(game, caller, previous, question);
    return game;
  }

  const reveal: RevealResult = {
    question,
    entries: [...game.entries],
    callerId: caller.id,
    callerName: caller.name,
    loserId: null,
    loserName: null,
    loserValue: previous.value,
    correctAnswer: question.answer,
    callerWasCorrect: true,
    dodosAwarded: 0,
  };

  game.lastReveal = reveal;
  game.history.push(reveal);
  game.status = "reveal";

  return game;
}

export function advanceToNextQuestion(
  game: Game,
  pickQuestion: (used: Set<string>) => Question | null
): Game {
  if (game.status !== "reveal") {
    throw new GameError("Can't start a new question right now.");
  }
  if (checkGameEnd(game)) return game;
  game.startingPlayerIndex = nextActiveIndex(game, game.startingPlayerIndex);
  return beginQuestion(game, pickQuestion);
}

export function restartGame(
  game: Game,
  pickQuestion: (used: Set<string>) => Question | null
): Game {
  game.players.forEach((p) => {
    p.dodos = 0;
    p.eliminated = false;
  });
  game.usedQuestionIds.clear();
  game.questionNumber = 0;
  game.startingPlayerIndex = 0;
  game.loserOfGame = null;
  game.winnerOfGame = null;
  game.endReason = null;
  game.lastReveal = null;
  game.history = [];
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
    history: game.history,
    loserOfGame: game.loserOfGame,
    winnerOfGame: game.winnerOfGame,
    endReason: game.endReason,
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
