import type { Player } from "@tchombo/shared";
import { livesRemaining } from "@tchombo/shared";
import { DodoCount } from "./Dodo";
import { useT } from "../lib/i18n";

interface Props {
  players: Player[];
  myPlayerId: string | null;
  currentPlayerId?: string | null;
  showDodos?: boolean;
  hostControls?: { onRemove: (playerId: string) => void };
}

export function PlayerList({ players, myPlayerId, currentPlayerId, showDodos, hostControls }: Props) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-2">
      {players.map((p, i) => (
        <li
          key={p.id}
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
            currentPlayerId === p.id ? "bg-gold-soft ring-2 ring-gold" : "bg-white"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                p.connected ? "bg-leaf" : "bg-navy/20"
              }`}
              title={p.connected ? "Online" : t("lobby.disconnected")}
            />
            <span className="text-xs font-semibold text-navy/40 w-5 flex-shrink-0">{i + 1}</span>
            <span className="font-semibold text-navy truncate">
              {p.name}
              {p.id === myPlayerId && <span className="text-navy/50 font-normal"> ({t("lobby.you")})</span>}
            </span>
            {p.isHost && (
              <span className="text-[11px] uppercase tracking-wide bg-navy text-cream px-2 py-0.5 rounded-full flex-shrink-0">
                {t("lobby.host")}
              </span>
            )}
            {!p.connected && (
              <span className="text-[11px] text-navy/40 flex-shrink-0">{t("lobby.disconnected")}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {showDodos && <DodoCount count={livesRemaining(p.dodos)} size="sm" />}
            {hostControls && p.id !== myPlayerId && (
              <button
                onClick={() => hostControls.onRemove(p.id)}
                className="text-xs text-coral/70 hover:text-coral"
              >
                {t("lobby.remove")}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
