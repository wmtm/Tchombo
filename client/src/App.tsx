import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, PublicGameState } from "@tchombo/shared";
import { socket } from "./lib/socket";
import { loadSession, saveSession, clearSession } from "./lib/session";
import { sound } from "./lib/sound";
import { useT } from "./lib/i18n";
import { Home } from "./pages/Home";
import { EntryForm } from "./pages/EntryForm";
import { Lobby } from "./pages/Lobby";
import { GameScreen } from "./pages/GameScreen";
import { RevealScreen } from "./pages/RevealScreen";
import { GameOverScreen } from "./pages/GameOverScreen";

type View = "home" | "create" | "join" | "room";

function parseJoinCodeFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/join\/(\d{4})$/);
  return match ? match[1] : null;
}

export default function App() {
  const t = useT();
  const [view, setView] = useState<View>("home");
  const [state, setState] = useState<PublicGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const initialCodeRef = useRef<string | null>(parseJoinCodeFromUrl());
  const triedRejoinRef = useRef(false);

  useEffect(() => {
    function onState(next: PublicGameState) {
      setState(next);
    }
    function onErrorMessage(payload: { message: string }) {
      setError(payload.message);
    }
    function onDisconnect() {
      setConnectionLost(true);
    }
    function onConnect() {
      if (connectionLost) setConnectionLost(false);
      const session = loadSession();
      if (session && !triedRejoinRef.current) {
        triedRejoinRef.current = true;
        socket.emit("rejoin_room", { roomCode: session.roomCode, playerId: session.playerId }, (res) => {
          if (res.ok) {
            setMyPlayerId(session.playerId);
            setState(res.state);
            setView("room");
          } else {
            clearSession();
          }
        });
      } else if (session) {
        // reconnect after a drop while already in a room
        socket.emit("rejoin_room", { roomCode: session.roomCode, playerId: session.playerId }, (res) => {
          if (res.ok) setState(res.state);
        });
      }
    }

    socket.on("state", onState);
    socket.on("error_message", onErrorMessage);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off("state", onState);
      socket.off("error_message", onErrorMessage);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionLost]);

  const handleCreate = useCallback((name: string) => {
    sound.unlock();
    setBusy(true);
    setError(null);
    socket.emit("create_room", { name }, (res) => {
      setBusy(false);
      if (res.ok) {
        saveSession({ roomCode: res.roomCode, playerId: res.playerId, name });
        setMyPlayerId(res.playerId);
        setState(res.state);
        window.history.replaceState(null, "", "/");
        setView("room");
      } else {
        setError(res.error);
      }
    });
  }, []);

  const handleJoin = useCallback((name: string, code?: string) => {
    sound.unlock();
    setBusy(true);
    setError(null);
    socket.emit("join_room", { roomCode: code ?? "", name }, (res) => {
      setBusy(false);
      if (res.ok) {
        saveSession({ roomCode: code ?? "", playerId: res.playerId, name });
        setMyPlayerId(res.playerId);
        setState(res.state);
        window.history.replaceState(null, "", "/");
        setView("room");
      } else {
        setError(res.error);
      }
    });
  }, []);

  function goHome() {
    clearSession();
    socket.emit("leave_room");
    setState(null);
    setMyPlayerId(null);
    setView("home");
  }

  if (connectionLost) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
          <p className="text-navy/60 font-medium">{t("error.connectionLost")}</p>
        </div>
      </div>
    );
  }

  if (view === "room" && state && myPlayerId) {
    return (
      <RoomRouter
        state={state}
        myPlayerId={myPlayerId}
        onHome={goHome}
      />
    );
  }

  if (view === "create") {
    return (
      <EntryForm
        mode="create"
        error={error}
        busy={busy}
        onBack={() => {
          setError(null);
          setView("home");
        }}
        onSubmit={handleCreate}
      />
    );
  }

  if (view === "join") {
    return (
      <EntryForm
        mode="join"
        initialCode={initialCodeRef.current ?? undefined}
        error={error}
        busy={busy}
        onBack={() => {
          setError(null);
          setView("home");
        }}
        onSubmit={handleJoin}
      />
    );
  }

  return (
    <Home
      onCreate={() => {
        setError(null);
        setView("create");
      }}
      onJoin={() => {
        setError(null);
        setView("join");
      }}
    />
  );
}

function RoomRouter({
  state,
  myPlayerId,
  onHome,
}: {
  state: PublicGameState;
  myPlayerId: string;
  onHome: () => void;
}) {
  const isHost = state.hostId === myPlayerId;

  function submitNumber(value: number) {
    return new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
      socket.emit("submit_number", { value }, (res) => resolve(res ?? { ok: false, error: "No response." }));
    });
  }

  function callTchombo() {
    return new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
      socket.emit("call_tchombo", (res) => resolve(res ?? { ok: false, error: "No response." }));
    });
  }

  switch (state.status) {
    case "lobby":
      return (
        <Lobby
          state={state}
          myPlayerId={myPlayerId}
          onStart={() => socket.emit("start_game")}
          onRemovePlayer={(playerId) => socket.emit("remove_player", { playerId })}
          onSetCategories={(categories: Category[]) => socket.emit("set_categories", { categories })}
        />
      );
    case "playing":
      return (
        <GameScreen state={state} myPlayerId={myPlayerId} onSubmit={submitNumber} onTchombo={callTchombo} />
      );
    case "reveal":
      return <RevealScreen state={state} />;
    case "finished":
      return (
        <GameOverScreen
          state={state}
          isHost={isHost}
          onRestart={() => socket.emit("restart_game")}
          onHome={onHome}
        />
      );
    default:
      return null;
  }
}
