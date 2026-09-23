import { useState } from "react";
import type { PublicGameState, Category } from "@tchombo/shared";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { PlayerList } from "../components/PlayerList";
import { CategoryPicker } from "../components/CategoryPicker";
import { SoundToggle } from "../components/SoundToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { LeaveMenu } from "../components/LeaveMenu";
import { useT } from "../lib/i18n";

interface Props {
  state: PublicGameState;
  myPlayerId: string;
  onStart: () => void;
  onRemovePlayer: (playerId: string) => void;
  onSetCategories: (categories: Category[]) => void;
  onLeave: () => void;
}

export function Lobby({ state, myPlayerId, onStart, onRemovePlayer, onSetCategories, onLeave }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === myPlayerId;
  const canStart = state.players.length >= 2;

  function copyLink() {
    const url = `${window.location.origin}/join/${state.roomCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function toggleCategory(cat: Category) {
    if (!isHost) return;
    const has = state.categories.includes(cat);
    const next = has ? state.categories.filter((c) => c !== cat) : [...state.categories, cat];
    if (next.length === 0) return;
    onSetCategories(next);
  }

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <SoundToggle />
            <LeaveMenu
              onExit={onLeave}
              exitTitle={t("nav.confirmLeaveLobbyTitle")}
              exitBody={t("nav.confirmLeaveLobbyBody")}
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-navy/40 text-xs uppercase tracking-widest font-semibold">{t("lobby.title")}</p>
          <button
            onClick={copyLink}
            className="mt-1 font-display text-5xl tracking-[0.15em] text-navy tabular-nums"
          >
            {state.roomCode}
          </button>
          <p className="text-navy/40 text-xs mt-1.5">
            {copied ? t("lobby.linkCopied") : t("lobby.shareCode")}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-navy/60 mb-2">
            {state.players.length === 1
              ? t("lobby.playerConnected")
              : t("lobby.playersConnected", { count: state.players.length })}
          </p>
          <PlayerList
            players={state.players}
            myPlayerId={myPlayerId}
            hostControls={isHost ? { onRemove: onRemovePlayer } : undefined}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-navy/60 mb-2">{t("lobby.categories")}</p>
          <CategoryPicker selected={state.categories} onToggle={toggleCategory} disabled={!isHost} />
        </div>

        {isHost ? (
          <Button full disabled={!canStart} onClick={onStart}>
            {canStart ? t("lobby.start") : t("lobby.needMorePlayers")}
          </Button>
        ) : (
          <p className="text-center text-navy/50 text-sm py-2 animate-pulse">{t("lobby.waitingForHost")}</p>
        )}
      </div>
    </div>
  );
}
