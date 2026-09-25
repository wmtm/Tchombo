import { useEffect, useState } from "react";
import type { PublicGameState } from "@tchombo/shared";
import { livesRemaining } from "@tchombo/shared";
import { AyoIcon, AyoMascot } from "../components/Dodo";
import { LeaveMenu } from "../components/LeaveMenu";
import { HistoryButton } from "../components/HistoryPanel";
import { useT, useLocale } from "../lib/i18n";
import { localizeQuestion } from "../lib/question";
import { sound } from "../lib/sound";

const REVEAL_SECONDS = 7;

interface Props {
  state: PublicGameState;
  isHost: boolean;
  onLeave: () => void;
  onRestart: () => void;
}

export function RevealScreen({ state, isHost, onLeave, onRestart }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const reveal = state.lastReveal!;
  const localizedUnit = localizeQuestion(reveal.question, locale).unit;
  const lastEntry = reveal.entries[reveal.entries.length - 1];
  const noOneLost = reveal.loserId === null;
  const loser = state.players.find((p) => p.id === reveal.loserId);
  const loserLivesLeft = livesRemaining(loser?.dodos ?? 0);
  const loserEliminated = loser?.eliminated ?? false;
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_SECONDS);

  useEffect(() => {
    sound.tchomboCall();
    const timeout = setTimeout(() => {
      (reveal.callerWasCorrect ? sound.success : sound.fail)();
      setTimeout(() => sound.dodoAwarded(reveal.dodosAwarded), 500);
    }, 900);
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [reveal]);

  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center justify-center">
      <div className="max-w-sm w-full flex justify-end gap-2 -mb-2">
        <HistoryButton history={state.history} />
        <LeaveMenu
          onExit={onLeave}
          onRestart={isHost ? onRestart : undefined}
          exitTitle={t("nav.confirmLeaveGameTitle")}
          exitBody={t("nav.confirmLeaveGameBody")}
        />
      </div>
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
        <span className="font-display text-3xl tracking-wide text-coral animate-pop-in">TCHOMBO!</span>

        <div className="bg-white rounded-xl2 shadow-card p-6 w-full flex flex-col gap-4 animate-float-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-navy/40 font-semibold">{t("reveal.correctAnswer")}</p>
            <p className="font-display text-4xl text-navy tabular-nums mt-1">
              {reveal.correctAnswer} {localizedUnit}
            </p>
            {reveal.question.source_note && (
              <p className="text-xs text-navy/50 italic leading-snug mt-1.5">{reveal.question.source_note}</p>
            )}
          </div>

          <div className="h-px bg-navy/10" />

          <div>
            <p className="text-xs uppercase tracking-widest text-navy/40 font-semibold">
              {t("reveal.said", { name: lastEntry?.playerName ?? "" })}
            </p>
            <p className="font-display text-2xl text-ink tabular-nums mt-1">
              {lastEntry?.playerName}: {reveal.loserValue} {localizedUnit}
            </p>
          </div>

          <p className={`font-semibold ${noOneLost || reveal.callerWasCorrect ? "text-leaf" : "text-coral"}`}>
            {noOneLost
              ? t("reveal.exactCall", { name: reveal.callerName })
              : reveal.callerWasCorrect
                ? t("reveal.exceeded", { name: lastEntry?.playerName ?? "" })
                : t("reveal.safe", { name: lastEntry?.playerName ?? "" })}
          </p>
        </div>

        <AyoMascot className="w-28 h-28 animate-pop-in" />

        <div
          className={`flex items-center gap-2.5 rounded-full px-5 py-3 animate-pop-in ${
            noOneLost ? "bg-leaf text-white" : loserEliminated ? "bg-coral text-white" : "bg-navy text-cream"
          }`}
        >
          <AyoIcon className="w-6 h-6" />
          <span className="font-semibold">
            {noOneLost
              ? t("reveal.noOneLoses")
              : loserEliminated
                ? t("reveal.eliminated", { name: reveal.loserName! })
                : `${t("reveal.loses", { name: reveal.loserName! })} ${reveal.dodosAwarded} ${
                    reveal.dodosAwarded === 1 ? t("reveal.dodo") : t("reveal.dodos")
                  } — ${t("reveal.livesLeft", { count: loserLivesLeft })}`}
          </span>
        </div>

        <p className="text-navy/40 text-sm">{t("reveal.nextQuestionIn", { seconds: secondsLeft })}</p>
      </div>
    </div>
  );
}
