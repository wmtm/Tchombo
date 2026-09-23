import { Game } from "@tchombo/shared";

// Games are meant to be playable asynchronously -- answer now, someone else
// answers in an hour, you both come back tonight -- so "everyone's tab is
// closed" is completely normal mid-game, not a sign of an abandoned room.
// Only real long-term inactivity (nobody has touched the room in a week)
// should free it up.
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days of inactivity
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // hourly is plenty at this TTL

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
        if (now - entry.lastActivity > ROOM_TTL_MS) {
          this.rooms.delete(code);
        }
      }
    }, SWEEP_INTERVAL_MS).unref();
  }
}
