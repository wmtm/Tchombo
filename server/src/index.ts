import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import {
  addPlayer,
  advanceToNextQuestion,
  callTchombo,
  CATEGORIES,
  Category,
  ClientToServerEvents,
  createGame,
  Game,
  makeQuestionPicker,
  removePlayerFromLobby,
  restartGame,
  ServerToClientEvents,
  setPlayerConnected,
  startGame,
  submitNumber,
  toPublicState,
} from "@tchombo/shared";
import { RoomManager } from "./rooms.js";
import { getLiveQuestions } from "./questions.js";
import { adminRouter } from "./admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const REVEAL_DELAY_MS = process.env.REVEAL_DELAY_MS ? Number(process.env.REVEAL_DELAY_MS) : 6500;

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*" },
});

const rooms = new RoomManager();
rooms.startSweeper();

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/admin", adminRouter);

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/admin") || req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

function broadcastState(roomCode: string) {
  const game = rooms.get(roomCode);
  if (!game) return;
  io.to(roomCode).emit("state", toPublicState(game));
}

async function pickerFor(game: Game) {
  const all = await getLiveQuestions();
  return makeQuestionPicker(all, game.categories);
}

function scheduleAutoAdvance(roomCode: string) {
  setTimeout(async () => {
    const game = rooms.get(roomCode);
    if (!game || game.status !== "reveal") return;
    try {
      const picker = await pickerFor(game);
      advanceToNextQuestion(game, picker);
      broadcastState(roomCode);
    } catch (err) {
      // Ran out of questions for the selected categories: end the game gracefully.
      if (game.status === "reveal") {
        game.status = "finished";
      }
      broadcastState(roomCode);
    }
  }, REVEAL_DELAY_MS).unref();
}

io.on("connection", (socket) => {
  let currentRoom: string | null = null;
  let currentPlayerId: string | null = null;

  function bind(roomCode: string, playerId: string) {
    currentRoom = roomCode;
    currentPlayerId = playerId;
    socket.join(roomCode);
  }

  socket.on("create_room", async ({ name, categories }, ack) => {
    try {
      const cleanName = (name || "").trim().slice(0, 24);
      if (!cleanName) return ack({ ok: false, error: "Please enter a name." });

      const roomCode = rooms.reserveCode();
      const playerId = nanoid();
      const validCategories =
        categories && categories.length > 0
          ? categories.filter((c) => (CATEGORIES as readonly string[]).includes(c))
          : [...CATEGORIES];

      const game = createGame(roomCode, { id: playerId, name: cleanName }, validCategories as Category[]);
      rooms.set(roomCode, game);
      bind(roomCode, playerId);

      ack({ ok: true, roomCode, playerId, state: toPublicState(game) });
      broadcastState(roomCode);
    } catch (err) {
      ack({ ok: false, error: err instanceof Error ? err.message : "Could not create room." });
    }
  });

  socket.on("join_room", async ({ roomCode, name }, ack) => {
    try {
      const code = (roomCode || "").trim();
      const game = rooms.get(code);
      if (!game) return ack({ ok: false, error: "That room code doesn't exist." });

      const cleanName = (name || "").trim().slice(0, 24);
      if (!cleanName) return ack({ ok: false, error: "Please enter a name." });

      const playerId = nanoid();
      addPlayer(game, { id: playerId, name: cleanName });
      bind(code, playerId);

      ack({ ok: true, playerId, state: toPublicState(game) });
      broadcastState(code);
    } catch (err) {
      ack({ ok: false, error: err instanceof Error ? err.message : "Could not join room." });
    }
  });

  socket.on("rejoin_room", async ({ roomCode, playerId }, ack) => {
    try {
      const code = (roomCode || "").trim();
      const game = rooms.get(code);
      if (!game) return ack({ ok: false, error: "That room no longer exists." });
      const player = game.players.find((p) => p.id === playerId);
      if (!player) return ack({ ok: false, error: "You're not part of that room." });

      setPlayerConnected(game, playerId, true);
      bind(code, playerId);

      ack({ ok: true, state: toPublicState(game) });
      broadcastState(code);
    } catch (err) {
      ack({ ok: false, error: err instanceof Error ? err.message : "Could not reconnect." });
    }
  });

  socket.on("set_categories", ({ categories }) => {
    if (!currentRoom || !currentPlayerId) return;
    const game = rooms.get(currentRoom);
    if (!game || game.hostId !== currentPlayerId || game.status !== "lobby") return;
    const valid = categories.filter((c) => (CATEGORIES as readonly string[]).includes(c));
    if (valid.length === 0) return;
    game.categories = valid;
    broadcastState(currentRoom);
  });

  socket.on("remove_player", ({ playerId }) => {
    if (!currentRoom || !currentPlayerId) return;
    const game = rooms.get(currentRoom);
    if (!game || game.hostId !== currentPlayerId) return;
    try {
      removePlayerFromLobby(game, playerId);
      broadcastState(currentRoom);
    } catch {
      /* ignore */
    }
  });

  socket.on("start_game", async () => {
    if (!currentRoom || !currentPlayerId) return;
    const game = rooms.get(currentRoom);
    if (!game || game.hostId !== currentPlayerId) return;
    try {
      const picker = await pickerFor(game);
      startGame(game, picker);
      broadcastState(currentRoom);
    } catch (err) {
      socket.emit("error_message", { message: err instanceof Error ? err.message : "Could not start game." });
    }
  });

  socket.on("submit_number", ({ value }, ack) => {
    if (!currentRoom || !currentPlayerId) return ack?.({ ok: false, error: "Not in a room." });
    const game = rooms.get(currentRoom);
    if (!game) return ack?.({ ok: false, error: "Room not found." });
    try {
      submitNumber(game, currentPlayerId, Number(value));
      broadcastState(currentRoom);
      ack?.({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid submission.";
      ack?.({ ok: false, error: message });
      socket.emit("error_message", { message });
    }
  });

  socket.on("call_tchombo", (ack) => {
    if (!currentRoom || !currentPlayerId) return ack?.({ ok: false, error: "Not in a room." });
    const game = rooms.get(currentRoom);
    if (!game) return ack?.({ ok: false, error: "Room not found." });
    try {
      callTchombo(game, currentPlayerId);
      broadcastState(currentRoom);
      ack?.({ ok: true });
      if (game.status === "reveal") scheduleAutoAdvance(currentRoom);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not call TCHOMBO.";
      ack?.({ ok: false, error: message });
      socket.emit("error_message", { message });
    }
  });

  socket.on("restart_game", async () => {
    if (!currentRoom || !currentPlayerId) return;
    const game = rooms.get(currentRoom);
    if (!game || game.hostId !== currentPlayerId || game.status !== "finished") return;
    try {
      const picker = await pickerFor(game);
      restartGame(game, picker);
      broadcastState(currentRoom);
    } catch (err) {
      socket.emit("error_message", { message: err instanceof Error ? err.message : "Could not restart." });
    }
  });

  socket.on("leave_room", () => {
    handleDisconnect();
  });

  socket.on("disconnect", () => {
    handleDisconnect();
  });

  function handleDisconnect() {
    if (!currentRoom || !currentPlayerId) return;
    const game = rooms.get(currentRoom);
    if (game) {
      // Keep the player's seat (name, order, host status, dodos) on any disconnect —
      // including from the lobby — so a brief network drop never bumps them from the
      // room. The host can still remove someone explicitly via remove_player.
      setPlayerConnected(game, currentPlayerId, false);
      broadcastState(currentRoom);
    }
    // Explicit leave keeps the socket alive (unlike a real disconnect, which auto-leaves
    // every room), so we must leave the Socket.IO room ourselves — otherwise this socket
    // keeps receiving state broadcasts for a room it just walked away from.
    socket.leave(currentRoom);
    currentRoom = null;
    currentPlayerId = null;
  }
});

// Once the reveal auto-advance runs out of fresh questions mid-game, callers above
// already flip the game to "finished" so the UI can show a graceful end screen.

httpServer.listen(PORT, () => {
  console.log(`TCHOMBO server listening on :${PORT}`);
});
