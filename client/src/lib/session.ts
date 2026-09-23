const KEY = "tchombo.session";

export interface StoredSession {
  roomCode: string;
  playerId: string;
  name: string;
}

export function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.roomCode && parsed.playerId) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}
