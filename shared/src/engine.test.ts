import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advanceToNextQuestion,
  callExact,
  callTchombo,
  createGame,
  Game,
  GameError,
  removePlayer,
  removePlayerFromLobby,
  removePlayerMidGame,
  restartGame,
  setPlayerConnected,
  startGame,
  submitNumber,
  toPublicState,
} from "./engine.js";
import { DODOS_TO_LOSE, livesRemaining, Question } from "./types.js";

function q(overrides: Partial<Question> = {}): Question {
  return {
    id: overrides.id ?? "TEST-001",
    category: "geography",
    question: "Test question?",
    answer: 226,
    unit: "km",
    allow_decimal: false,
    difficulty: "hard",
    dodo_penalty: 4,
    source: "Test source",
    source_note: "",
    active: true,
    status: "live",
    ...overrides,
  };
}

function queuePicker(questions: Question[]) {
  let i = 0;
  return (_used: Set<string>) => {
    if (i >= questions.length) return null;
    return questions[i++];
  };
}

function makeGame(names: string[], categories = ["geography"] as any) {
  let game = createGame("4827", { id: "p0", name: names[0] }, categories);
  for (let i = 1; i < names.length; i++) {
    game = addPlayer(game, { id: `p${i}`, name: names[i] });
  }
  return game;
}

describe("lobby & players", () => {
  it("host is first player and is marked host", () => {
    const game = makeGame(["Gaëlle", "Mathieu"]);
    expect(game.hostId).toBe("p0");
    expect(game.players[0].isHost).toBe(true);
  });

  it("caps room at 6 players", () => {
    const game = makeGame(["A", "B", "C", "D", "E", "F"]);
    expect(() => addPlayer(game, { id: "p6", name: "G" })).toThrow(GameError);
  });

  it("removing the host transfers host to next player", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex"]);
    game = removePlayerFromLobby(game, "p0");
    expect(game.hostId).toBe("p1");
    expect(game.players.find((p) => p.id === "p1")!.isHost).toBe(true);
  });

  it("disconnecting the host transfers host to a connected player", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex"]);
    game = setPlayerConnected(game, "p0", false);
    expect(game.hostId).toBe("p1");
  });
});

describe("core turn mechanic (RULE 1-4)", () => {
  it("first player may submit any valid number, then turn passes in fixed order", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex", "Florian"]);
    game = startGame(game, queuePicker([q({ answer: 226 })]));
    expect(game.players[game.currentPlayerIndex].id).toBe("p0");

    game = submitNumber(game, "p0", 150);
    expect(game.players[game.currentPlayerIndex].id).toBe("p1");
  });

  it("rejects a submission out of turn", () => {
    let game = makeGame(["Gaëlle", "Mathieu"]);
    game = startGame(game, queuePicker([q()]));
    expect(() => submitNumber(game, "p1", 100)).toThrow("not your turn");
  });

  it("requires a strictly increasing value", () => {
    let game = makeGame(["Gaëlle", "Mathieu"]);
    game = startGame(game, queuePicker([q({ answer: 226 })]));
    game = submitNumber(game, "p0", 150);
    expect(() => submitNumber(game, "p1", 150)).toThrow(GameError);
    expect(() => submitNumber(game, "p1", 149)).toThrow(GameError);
    game = submitNumber(game, "p1", 151);
    expect(game.entries[1].value).toBe(151);
  });

  it("rejects decimals when the question forbids them", () => {
    let game = makeGame(["Gaëlle", "Mathieu"]);
    game = startGame(game, queuePicker([q({ allow_decimal: false })]));
    expect(() => submitNumber(game, "p0", 10.5)).toThrow(GameError);
  });

  it("accepts decimals when the question allows them", () => {
    let game = makeGame(["Gaëlle", "Mathieu"]);
    game = startGame(game, queuePicker([q({ allow_decimal: true, answer: 100 })]));
    game = submitNumber(game, "p0", 10.5);
    expect(game.entries[0].value).toBe(10.5);
  });

  it("rejects negative numbers", () => {
    let game = makeGame(["Gaëlle", "Mathieu"]);
    game = startGame(game, queuePicker([q()]));
    expect(() => submitNumber(game, "p0", -5)).toThrow(GameError);
  });
});

describe("TCHOMBO resolution (RULE 5-7) and the boundary case", () => {
  it("previous player exceeding the answer means THEY receive the dodos (spec example 1)", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex", "Florian"]);
    game = startGame(game, queuePicker([q({ answer: 226, difficulty: "hard", dodo_penalty: 4 })]));

    game = submitNumber(game, "p0", 150); // Gaëlle
    game = submitNumber(game, "p1", 190); // Mathieu
    game = submitNumber(game, "p2", 220); // Alex
    game = submitNumber(game, "p3", 250); // Florian — exceeds 226

    // it's Gaëlle's turn again (wrapped around); she calls TCHOMBO on Florian
    expect(game.players[game.currentPlayerIndex].id).toBe("p0");
    game = callTchombo(game, "p0");

    expect(game.status).toBe("reveal");
    expect(game.lastReveal!.loserId).toBe("p3"); // Florian
    expect(game.lastReveal!.callerWasCorrect).toBe(true);
    expect(game.lastReveal!.dodosAwarded).toBe(4);
    expect(game.players.find((p) => p.id === "p3")!.dodos).toBe(4);
  });

  it("exact answer is SAFE — wrongly calling TCHOMBO penalizes the caller (spec example 2)", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex", "Florian"]);
    game = startGame(game, queuePicker([q({ answer: 226, difficulty: "hard", dodo_penalty: 4 })]));

    game = submitNumber(game, "p0", 150); // Gaëlle
    game = submitNumber(game, "p1", 226); // Mathieu — exactly correct, still SAFE
    // Alex is next; Alex calls TCHOMBO believing 226 is too high
    game = callTchombo(game, "p2");

    expect(game.lastReveal!.callerWasCorrect).toBe(false);
    expect(game.lastReveal!.loserId).toBe("p2"); // Alex pays
    expect(game.players.find((p) => p.id === "p2")!.dodos).toBe(4);
    expect(game.players.find((p) => p.id === "p1")!.dodos).toBe(0); // Mathieu untouched
  });

  it("boundary: answer=100, no decimals — 100 is safe, 101 is exceeded", () => {
    let g1 = makeGame(["A", "B"]);
    g1 = startGame(g1, queuePicker([q({ answer: 100, allow_decimal: false })]));
    g1 = submitNumber(g1, "p0", 100);
    g1 = callTchombo(g1, "p1");
    expect(g1.lastReveal!.callerWasCorrect).toBe(false); // 100 was safe

    let g3 = makeGame(["A", "B"]);
    g3 = startGame(g3, queuePicker([q({ answer: 100, allow_decimal: false })]));
    g3 = submitNumber(g3, "p0", 99);
    g3 = submitNumber(g3, "p1", 101);
    g3 = callTchombo(g3, "p0");
    expect(g3.lastReveal!.callerWasCorrect).toBe(true);
    expect(g3.lastReveal!.loserId).toBe("p1");
  });

  it("boundary with decimals: answer=100, 100.00 safe, 100.01 exceeded", () => {
    let gSafe = makeGame(["A", "B"]);
    gSafe = startGame(gSafe, queuePicker([q({ answer: 100, allow_decimal: true })]));
    gSafe = submitNumber(gSafe, "p0", 100);
    gSafe = callTchombo(gSafe, "p1");
    expect(gSafe.lastReveal!.callerWasCorrect).toBe(false);

    let gExceed = makeGame(["A", "B"]);
    gExceed = startGame(gExceed, queuePicker([q({ answer: 100, allow_decimal: true })]));
    gExceed = submitNumber(gExceed, "p0", 100.01);
    gExceed = callTchombo(gExceed, "p1");
    expect(gExceed.lastReveal!.callerWasCorrect).toBe(true);
    expect(gExceed.lastReveal!.loserId).toBe("p0");
  });

  it("rejects TCHOMBO when there is no previous entry yet", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q()]));
    expect(() => callTchombo(game, "p0")).toThrow(GameError);
  });

  it("rejects TCHOMBO from someone who isn't the current player", () => {
    let game = makeGame(["A", "B", "C"]);
    game = startGame(game, queuePicker([q({ answer: 100 })]));
    game = submitNumber(game, "p0", 50);
    expect(() => callTchombo(game, "p2")).toThrow(GameError);
  });
});

describe("call exact (bet the previous number is precisely the answer)", () => {
  it("correct exact call: nobody loses any dodos", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 226, dodo_penalty: 4 })]));
    game = submitNumber(game, "p0", 226); // exactly right
    game = callExact(game, "p1");

    expect(game.status).toBe("reveal");
    expect(game.lastReveal!.loserId).toBeNull();
    expect(game.lastReveal!.loserName).toBeNull();
    expect(game.lastReveal!.dodosAwarded).toBe(0);
    expect(game.lastReveal!.callerWasCorrect).toBe(true);
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBe(0);
    expect(game.players.find((p) => p.id === "p1")!.dodos).toBe(0);
  });

  it("wrong exact call on a number that actually exceeded: resolves like a normal TCHOMBO (previous player pays)", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 226, dodo_penalty: 4 })]));
    game = submitNumber(game, "p0", 250); // exceeded, not exact
    game = callExact(game, "p1");

    expect(game.lastReveal!.loserId).toBe("p0");
    expect(game.lastReveal!.dodosAwarded).toBe(4);
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBe(4);
  });

  it("wrong exact call on a number that was merely safe (under, not exact): the caller pays, like a failed TCHOMBO", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 226, dodo_penalty: 4 })]));
    game = submitNumber(game, "p0", 150); // safe, but not exact
    game = callExact(game, "p1");

    expect(game.lastReveal!.loserId).toBe("p1");
    expect(game.lastReveal!.dodosAwarded).toBe(4);
    expect(game.players.find((p) => p.id === "p1")!.dodos).toBe(4);
  });

  it("rejects call-exact when there is no previous entry yet", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q()]));
    expect(() => callExact(game, "p0")).toThrow(GameError);
  });

  it("rejects call-exact from someone who isn't the current player", () => {
    let game = makeGame(["A", "B", "C"]);
    game = startGame(game, queuePicker([q({ answer: 100 })]));
    game = submitNumber(game, "p0", 50);
    expect(() => callExact(game, "p2")).toThrow(GameError);
  });
});

describe("dodo penalties map to difficulty (inverted: easy hurts most)", () => {
  const cases: Array<[Question["difficulty"], number]> = [
    ["easy", 5],
    ["medium", 4],
    ["hard", 3],
    ["very_hard", 2],
  ];
  it.each(cases)("difficulty=%s awards %i dodos", (difficulty, penalty) => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 10, difficulty, dodo_penalty: penalty })]));
    game = submitNumber(game, "p0", 20); // exceeds
    game = callTchombo(game, "p1");
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBe(penalty);
  });
});

describe(`dodo-limit loss condition (RULE 15, threshold=${DODOS_TO_LOSE})`, () => {
  it(`ends the game the moment a player reaches ${DODOS_TO_LOSE} dodos`, () => {
    let game = makeGame(["A", "B"]);
    const questions = Array.from({ length: 20 }, (_, i) =>
      q({ id: `Q${i}`, answer: 10, difficulty: "very_hard", dodo_penalty: 5 })
    );
    const picker = queuePicker(questions);
    game = startGame(game, picker);

    for (let i = 0; i < 20 && game.status !== "finished"; i++) {
      const submitterId = game.players[game.currentPlayerIndex].id;
      game = submitNumber(game, submitterId, 20); // always exceeds
      const callerId = game.players[game.currentPlayerIndex].id;
      game = callTchombo(game, callerId); // the caller correctly calls; submitter gets dodos
      if (game.status === "finished") break;
      game = advanceToNextQuestion(game, picker);
    }

    expect(game.status).toBe("finished");
    expect(game.endReason).toBe("dodo_limit");
    expect(game.loserOfGame).not.toBeNull();
    const loser = game.players.find((p) => p.id === game.loserOfGame)!;
    expect(loser.dodos).toBeGreaterThanOrEqual(DODOS_TO_LOSE);
  });

  it("livesRemaining counts down from the threshold to 0 and never goes negative", () => {
    expect(livesRemaining(0)).toBe(DODOS_TO_LOSE);
    expect(livesRemaining(DODOS_TO_LOSE)).toBe(0);
    expect(livesRemaining(DODOS_TO_LOSE + 5)).toBe(0);
  });
});

describe("elimination & game continuation (RULE 15 revisited)", () => {
  it("always shows the reveal before ending the game -- status stays 'reveal' even when the loser hits the limit", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 10, dodo_penalty: DODOS_TO_LOSE })]));
    game = submitNumber(game, "p0", 20); // A exceeds badly enough to hit the limit in one go
    game = callTchombo(game, "p1");

    // this used to jump straight to "finished", hiding the reveal (the actual bug)
    expect(game.status).toBe("reveal");
    expect(game.lastReveal).not.toBeNull();
    expect(game.lastReveal!.correctAnswer).toBe(10);
    expect(game.players.find((p) => p.id === "p0")!.eliminated).toBe(true);
    // game only actually ends once the reveal has been advanced past
    const picker = queuePicker([]);
    game = advanceToNextQuestion(game, picker);
    expect(game.status).toBe("finished");
  });

  it("eliminates a player without ending the game while others remain active, and skips them in turn order", () => {
    let game = makeGame(["A", "B", "C"]);
    const picker = queuePicker(
      Array.from({ length: 10 }, (_, i) => q({ id: `Q${i}`, answer: 10, dodo_penalty: DODOS_TO_LOSE }))
    );
    game = startGame(game, picker);

    game = submitNumber(game, "p0", 20); // A exceeds enough to be eliminated outright
    game = callTchombo(game, "p1"); // B correctly calls
    expect(game.players.find((p) => p.id === "p0")!.eliminated).toBe(true);

    game = advanceToNextQuestion(game, picker);
    expect(game.status).toBe("playing"); // game continues: B and C are still active
    // A must never get a turn again
    expect(game.players[game.currentPlayerIndex].id).not.toBe("p0");
    expect(game.players.find((p) => p.id === "p0")!.eliminated).toBe(true);
    // A is still IN the game (visible, spectating), not removed
    expect(game.players).toHaveLength(3);
  });

  it("ends the game once only one active player remains, crowning them the winner", () => {
    let game = makeGame(["A", "B", "C"]);
    const picker = queuePicker(
      Array.from({ length: 10 }, (_, i) => q({ id: `Q${i}`, answer: 10, dodo_penalty: DODOS_TO_LOSE }))
    );
    game = startGame(game, picker);

    // Round 1: A submits big, B calls correctly -> A eliminated. Next turn is C (B, A skipped... A eliminated).
    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    game = advanceToNextQuestion(game, picker);
    expect(game.status).toBe("playing");

    // Round 2: whoever is current submits big, the next active player calls -> eliminates a 2nd player
    const submitter = game.players[game.currentPlayerIndex].id;
    game = submitNumber(game, submitter, 20);
    const caller = game.players[game.currentPlayerIndex].id;
    game = callTchombo(game, caller);
    expect(game.status).toBe("reveal");

    game = advanceToNextQuestion(game, picker);
    expect(game.status).toBe("finished");
    expect(game.endReason).toBe("dodo_limit");
    expect(game.winnerOfGame).not.toBeNull();
    const winner = game.players.find((p) => p.id === game.winnerOfGame)!;
    expect(winner.eliminated).toBe(false);
    // both losers are still present in the roster, just eliminated
    expect(game.players).toHaveLength(3);
    expect(game.players.filter((p) => p.eliminated)).toHaveLength(2);
  });

  it("exposes eliminated and winnerOfGame on the public state", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 10, dodo_penalty: DODOS_TO_LOSE })]));
    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    game = advanceToNextQuestion(game, queuePicker([]));

    const publicState = toPublicState(game);
    expect(publicState.players.find((p) => p.id === "p0")!.eliminated).toBe(true);
    expect(publicState.winnerOfGame).toBe("p1");
  });
});

describe("reveal history log", () => {
  it("records every resolved question and clears on restart", () => {
    let game = makeGame(["A", "B"]);
    const picker = queuePicker([
      q({ id: "Q1", answer: 10 }),
      q({ id: "Q2", answer: 10 }),
      q({ id: "Q3", answer: 10 }),
    ]);
    game = startGame(game, picker);

    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    expect(game.history).toHaveLength(1);
    expect(game.history[0].correctAnswer).toBe(10);

    game = advanceToNextQuestion(game, picker);
    game = submitNumber(game, game.players[game.currentPlayerIndex].id, 20);
    game = callTchombo(game, game.players[game.currentPlayerIndex].id);
    expect(game.history).toHaveLength(2);

    game = restartGame(game, picker);
    expect(game.history).toHaveLength(0);
  });
});

describe("mid-game player removal (explicit exit, not disconnect)", () => {
  it("removing a player before the current turn shifts the pointer down but keeps the same player current", () => {
    let game = makeGame(["A", "B", "C", "D"]);
    game = startGame(game, queuePicker([q({ answer: 10 })]));
    game = submitNumber(game, "p0", 5); // A submits; now it's B's (index 1) turn
    expect(game.currentPlayerIndex).toBe(1);

    // A (index 0, before the current turn) explicitly leaves
    game = removePlayerMidGame(game, "p0");
    expect(game.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    // B is still the current player, now at index 0
    expect(game.players[game.currentPlayerIndex].id).toBe("p1");
  });

  it("removing the current player advances turn to whoever was next, with the game continuing", () => {
    let game = makeGame(["A", "B", "C", "D"]);
    game = startGame(game, queuePicker([q({ answer: 10 })]));
    expect(game.players[game.currentPlayerIndex].id).toBe("p0"); // A's turn

    game = removePlayerMidGame(game, "p0"); // A leaves mid-turn
    expect(game.status).toBe("playing"); // game continues, not finished
    expect(game.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(game.players[game.currentPlayerIndex].id).toBe("p1"); // B is now current

    // play continues normally with the remaining players
    game = submitNumber(game, "p1", 5);
    expect(game.players[game.currentPlayerIndex].id).toBe("p2");
  });

  it("transfers host when the host leaves mid-game", () => {
    let game = makeGame(["A", "B", "C"]);
    game = startGame(game, queuePicker([q({ answer: 10 })]));
    expect(game.hostId).toBe("p0");
    game = removePlayerMidGame(game, "p0");
    expect(game.hostId).toBe("p1");
    expect(game.players.find((p) => p.id === "p1")!.isHost).toBe(true);
  });

  it("ends the game gracefully (no loser, endReason set) when fewer than 2 players remain", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 10 })]));
    game = removePlayerMidGame(game, "p1");
    expect(game.status).toBe("finished");
    expect(game.endReason).toBe("not_enough_players");
    expect(game.loserOfGame).toBeNull();
    expect(game.players).toHaveLength(1);
  });

  it("preserves dodo counts and rotation sanity for remaining players", () => {
    let game = makeGame(["A", "B", "C", "D"]);
    game = startGame(game, queuePicker([q({ id: "Q1", answer: 10, dodo_penalty: 3, difficulty: "medium" })]));
    game = submitNumber(game, "p0", 20); // A exceeds
    game = callTchombo(game, "p1"); // B correctly calls; A gets 3 dodos
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBe(3);

    // C (not involved in the turn, not current) leaves during the reveal
    game = removePlayerMidGame(game, "p2");
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBe(3); // untouched
    expect(game.players.map((p) => p.id)).toEqual(["p0", "p1", "p3"]);
  });

  it("ends the game with a winner if a voluntary exit drops ACTIVE players to 1, even with 3+ still in the roster", () => {
    let game = makeGame(["A", "B", "C"]);
    const picker = queuePicker([q({ id: "Q1", answer: 10, dodo_penalty: DODOS_TO_LOSE })]);
    game = startGame(game, picker);
    // A gets eliminated by the dodo limit
    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    expect(game.players.find((p) => p.id === "p0")!.eliminated).toBe(true);
    // now B (still active) explicitly leaves -- only C remains active, though A is still in the roster
    game = removePlayerMidGame(game, "p1");
    expect(game.status).toBe("finished");
    expect(game.endReason).toBe("dodo_limit");
    expect(game.winnerOfGame).toBe("p2");
    expect(game.players.map((p) => p.id)).toEqual(["p0", "p2"]); // A (eliminated) still visible
  });

  it("removePlayer dispatches to the lobby path before the game starts", () => {
    let game = makeGame(["A", "B", "C"]);
    game = removePlayer(game, "p1");
    expect(game.players.map((p) => p.id)).toEqual(["p0", "p2"]);
    expect(game.status).toBe("lobby");
  });
});

describe("starting player rotation (RULE 14)", () => {
  it("rotates the starting player each question, wrapping around", () => {
    let game = makeGame(["Gaëlle", "Mathieu", "Alex", "Florian"]);
    const questions = [
      q({ id: "Q1", answer: 10 }),
      q({ id: "Q2", answer: 10 }),
      q({ id: "Q3", answer: 10 }),
      q({ id: "Q4", answer: 10 }),
      q({ id: "Q5", answer: 10 }),
    ];
    const picker = queuePicker(questions);
    game = startGame(game, picker);
    expect(game.players[game.startingPlayerIndex].name).toBe("Gaëlle");

    for (const expectedStarter of ["Mathieu", "Alex", "Florian", "Gaëlle"]) {
      game = submitNumber(game, game.players[game.currentPlayerIndex].id, 20);
      const callerId = game.players[game.currentPlayerIndex].id;
      game = callTchombo(game, callerId);
      game = advanceToNextQuestion(game, picker);
      expect(game.players[game.startingPlayerIndex].name).toBe(expectedStarter);
    }
  });
});

describe("question repetition prevention", () => {
  it("never reuses a question id within the same game", () => {
    let game = makeGame(["A", "B"]);
    const questions = [q({ id: "Q1", answer: 10 }), q({ id: "Q2", answer: 10 })];
    const picker = queuePicker(questions);
    game = startGame(game, picker);
    expect(game.usedQuestionIds.has("Q1")).toBe(true);
    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    game = advanceToNextQuestion(game, picker);
    expect(game.usedQuestionIds.has("Q2")).toBe(true);
    expect(game.currentQuestion!.id).toBe("Q2");
  });

  it("throws a friendly error when the category runs out of fresh questions", () => {
    let game = makeGame(["A", "B"]);
    const picker = queuePicker([]); // no questions available at all
    expect(() => startGame(game, picker)).toThrow(GameError);
  });
});

describe("reconnection & disconnect", () => {
  it("marks a player disconnected and reconnected without losing their state", () => {
    let game = makeGame(["A", "B"]);
    game = startGame(game, queuePicker([q({ answer: 10 })]));
    game = submitNumber(game, "p0", 5);
    game = setPlayerConnected(game, "p1", false);
    expect(game.players.find((p) => p.id === "p1")!.connected).toBe(false);
    game = setPlayerConnected(game, "p1", true);
    expect(game.players.find((p) => p.id === "p1")!.connected).toBe(true);
    // game state (entries, dodos, turn) survives untouched
    expect(game.entries[0].value).toBe(5);
  });
});

describe("restart", () => {
  it("resets dodos, used questions and question number", () => {
    let game = makeGame(["A", "B"]);
    const picker = queuePicker([q({ id: "Q1", answer: 10 }), q({ id: "Q2", answer: 10 })]);
    game = startGame(game, picker);
    game = submitNumber(game, "p0", 20);
    game = callTchombo(game, "p1");
    expect(game.players.find((p) => p.id === "p0")!.dodos).toBeGreaterThan(0);

    game = restartGame(game, picker);
    expect(game.players.every((p) => p.dodos === 0)).toBe(true);
    expect(game.questionNumber).toBe(1);
    expect(game.status).toBe("playing");
  });
});

describe("player counts 2, 4 and 6", () => {
  it.each([2, 4, 6])("plays a full round with %i players", (n) => {
    const names = Array.from({ length: n }, (_, i) => `P${i}`);
    let game = makeGame(names);
    game = startGame(game, queuePicker([q({ answer: 50 })]));
    // each player in turn order submits an increasing value
    for (let i = 0; i < n; i++) {
      game = submitNumber(game, game.players[i].id, 50 + i);
    }
    const callerId = game.players[game.currentPlayerIndex].id;
    game = callTchombo(game, callerId);
    expect(game.status).toBe("reveal");
    const publicState = toPublicState(game);
    expect(publicState.currentQuestion).not.toHaveProperty("answer");
  });
});
