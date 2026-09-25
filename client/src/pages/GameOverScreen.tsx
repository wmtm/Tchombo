import { useEffect } from "react";
import type { PublicGameState } from "@tchombo/shared";
import { livesRemaining } from "@tchombo/shared";
import { AyoMascot, DodoCount } from "../components/Dodo";
import { Button } from "../components/Button";
import { HistoryButton } from "../components/HistoryPanel";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";
import { sound } from "../lib/sound";

interface Props {
  state: PublicGameState;
  isHost: boolean;
  onRestart: () => void;
  onHome: () => void;
}

export function GameOverScreen({ state, isHost, onRestart, onHome }: Props) {
  const t = useT();
  const loser = state.players.find((p) => p.id === state.loserOfGame);
  const winner = state.players.find((p) => p.id === state.winnerOfGame);
  const standings = [...state.players].sort((a, b) => a.dodos - b.dodos);

  useEffect(() => {
    sound.gameOver();
  }, []);

  const reason = state.endReason ?? "dodo_limit";

  return (
    <div className="min-h-screen px-5 py-10 flex flex-col items-center justify-center">
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
        <div className="w-full flex justify-end gap-2 -mb-4">
          <HistoryButton history={state.history} />
          <LanguageToggle />
        </div>

        {reason === "dodo_limit" ? (
          <AyoMascot className="w-32 h-32 animate-pop-in" />
        ) : (
          <span className="text-5xl animate-pop-in">🦤</span>
        )}
        <div>
          <p className="font-display text-3xl text-navy">
            {reason === "dodo_limit" && winner ? t("gameover.winnerTitle", { name: winner.name }) : t(`gameover.title.${reason}`)}
          </p>
          {reason === "dodo_limit" && loser && (
            <p className="text-ink/60 mt-2">{t("gameover.defeated", { name: loser.name })}</p>
          )}
          {reason === "not_enough_players" && (
            <p className="text-ink/60 mt-2">{t("gameover.notEnoughPlayers")}</p>
          )}
          {reason === "no_questions_left" && (
            <p className="text-ink/60 mt-2">{t("gameover.noQuestionsLeft")}</p>
          )}
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-5 w-full">
          <p className="text-xs uppercase tracking-widest text-navy/40 font-semibold mb-3">
            {t("gameover.standings")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {standings.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {p.id === state.winnerOfGame ? (
                    <span className="text-xs bg-leaf-soft text-leaf px-2 py-0.5 rounded-full font-semibold">{t("gameover.winnerBadge")}</span>
                  ) : (
                    !state.winnerOfGame && i === 0 && (
                      <span className="text-xs bg-leaf-soft text-leaf px-2 py-0.5 rounded-full font-semibold">{t("gameover.survivedBest")}</span>
                    )
                  )}
                  {p.eliminated && (
                    <span className="text-xs bg-coral/10 text-coral px-2 py-0.5 rounded-full font-semibold">{t("game.out")}</span>
                  )}
                  <span className="font-medium text-ink">{p.name}</span>
                </span>
                <DodoCount count={livesRemaining(p.dodos)} />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {isHost && (
            <Button full onClick={onRestart}>
              {t("gameover.playAgain")}
            </Button>
          )}
          <Button variant="ghost" full onClick={onHome}>
            {t("gameover.backHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
