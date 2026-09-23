import { Game } from "@tchombo/shared";

const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours of inactivity
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

interface RoomEntry {
  game: Game;
  lastActivity: number;
}

export class RoomManager {
  private rooms = new Map<string, RoomEntry>();

  private generateCode(): string {
    let code: string;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (this.rooms.has(code));
    return code;
  }

  reserveCode(): string {
    return this.generateCode();
  }

  set(roomCode: string, game: Game) {
    this.rooms.set(roomCode, { game, lastActivity: Date.now() });
  }

  get(roomCode: string): Game | undefined {
    const entry = this.rooms.get(roomCode);
    if (!entry) return undefined;
    entry.lastActivity = Date.now();
    return entry.game;
  }

  has(roomCode: string): boolean {
    return this.rooms.has(roomCode);
  }

  delete(roomCode: string) {
    this.rooms.delete(roomCode);
  }

  startSweeper() {
    setInterval(() => {
      const now = Date.now();
      for (const [code, entry] of this.rooms) {
        const allDisconnected = entry.game.players.every((p) => !p.connected);
        const stale = now - entry.lastActivity > ROOM_TTL_MS;
        if (stale || (allDisconnected && now - entry.lastActivity > 10 * 60 * 1000)) {
          this.rooms.delete(code);
        }
      }
    }, SWEEP_INTERVAL_MS).unref();
  }
}
