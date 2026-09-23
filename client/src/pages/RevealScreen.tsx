import { useEffect, useState } from "react";
import type { PublicGameState } from "@tchombo/shared";
import { DodoIcon } from "../components/Dodo";
import { useT } from "../lib/i18n";
import { sound } from "../lib/sound";

const REVEAL_SECONDS = 7;

export function RevealScreen({ state }: { state: PublicGameState }) {
  const t = useT();
  const reveal = state.lastReveal!;
  const lastEntry = reveal.entries[reveal.entries.length - 1];
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
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">
        <span className="font-display text-3xl tracking-wide text-coral animate-pop-in">TCHOMBO!</span>

        <div className="bg-white rounded-xl2 shadow-card p-6 w-full flex flex-col gap-4 animate-float-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-navy/40 font-semibold">{t("reveal.correctAnswer")}</p>
            <p className="font-display text-4xl text-navy tabular-nums mt-1">
              {reveal.correctAnswer} {reveal.question.unit}
            </p>
          </div>

          <div className="h-px bg-navy/10" />

          <div>
            <p className="text-xs uppercase tracking-widest text-navy/40 font-semibold">
              {t("reveal.said", { name: lastEntry?.playerName ?? "" })}
            </p>
            <p className="font-display text-2xl text-ink tabular-nums mt-1">
              {lastEntry?.playerName}: {reveal.loserValue} {reveal.question.unit}
            </p>
          </div>

          <p className={`font-semibold ${reveal.callerWasCorrect ? "text-leaf" : "text-coral"}`}>
            {reveal.callerWasCorrect
              ? t("reveal.exceeded", { name: lastEntry?.playerName ?? "" })
              : t("reveal.safe", { name: lastEntry?.playerName ?? "" })}
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-navy text-cream rounded-full px-5 py-3 animate-pop-in">
          <DodoIcon className="w-6 h-6 text-gold" />
          <span className="font-semibold">
            {t("reveal.collects", { name: reveal.loserName })} {reveal.dodosAwarded}{" "}
            {reveal.dodosAwarded === 1 ? t("reveal.dodo") : t("reveal.dodos")}
          </span>
        </div>

        <p className="text-navy/40 text-sm">{t("reveal.nextQuestionIn", { seconds: secondsLeft })}</p>
      </div>
    </div>
  );
}
