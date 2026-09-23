import { Category, PublicGameState } from "./types.js";

// Client -> Server
export interface ClientToServerEvents {
  create_room: (
    payload: { name: string; categories?: Category[] },
    ack: (res: { ok: true; roomCode: string; playerId: string; state: PublicGameState } | { ok: false; error: string }) => void
  ) => void;
  join_room: (
    payload: { roomCode: string; name: string },
    ack: (res: { ok: true; playerId: string; state: PublicGameState } | { ok: false; error: string }) => void
  ) => void;
  rejoin_room: (
    payload: { roomCode: string; playerId: string },
    ack: (res: { ok: true; state: PublicGameState } | { ok: false; error: string }) => void
  ) => void;
  set_categories: (payload: { categories: Category[] }) => void;
  remove_player: (payload: { playerId: string }) => void;
  start_game: () => void;
  submit_number: (payload: { value: number }, ack?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  call_tchombo: (ack?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  call_exact: (ack?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  restart_game: () => void;
  leave_room: () => void;
}

// Server -> Client
export interface ServerToClientEvents {
  state: (state: PublicGameState) => void;
  error_message: (payload: { message: string }) => void;
  room_closed: () => void;
}
