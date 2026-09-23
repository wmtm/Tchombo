import { useEffect, useMemo, useState } from "react";
import type { PublicGameState } from "@tchombo/shared";
import { Button } from "../components/Button";
import { SoundToggle } from "../components/SoundToggle";
import { LeaveButton } from "../components/LeaveButton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DodoCount } from "../components/Dodo";
import { CATEGORY_EMOJI } from "../components/CategoryPicker";
import { useT } from "../lib/i18n";
import { sound } from "../lib/sound";

interface Props {
  state: PublicGameState;
  myPlayerId: string;
  onSubmit: (value: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onTchombo: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onLeave: () => void;
}

export function GameScreen({ state, myPlayerId, onSubmit, onTchombo, onLeave }: Props) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const question = state.currentQuestion!;
  const isMyTurn = state.currentPlayerId === myPlayerId;
  const previous = state.entries[state.entries.length - 1] ?? null;
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);

  const nextInfo = useMemo(() => {
    const order = state.turnOrder;
    const idx = order.indexOf(state.currentPlayerId ?? "");
    if (idx === -1) return null;
    const nextId = order[(idx + 1) % order.length];
    const nextPlayer = state.players.find((p) => p.id === nextId);
    if (!nextPlayer) return null;
    return { id: nextId, name: nextPlayer.name };
  }, [state.currentPlayerId, state.turnOrder, state.players]);

  useEffect(() => {
    setValue("");
    setError(null);
    if (isMyTurn) sound.turn();
  }, [state.currentPlayerId, state.questionNumber]);

  async function handleSubmit() {
    setError(null);
    const num = Number(value);
    if (value.trim() === "" || Number.isNaN(num)) {
      setError(
        previous
          ? t("game.mustBeHigherThan", { value: previous.value, unit: question.unit })
          : t("game.inputPlaceholder")
      );
      return;
    }
    setBusy(true);
    const res = await onSubmit(num);
    setBusy(false);
    if (res.ok) {
      sound.submit();
      setValue("");
    } else {
      setError(res.error);
    }
  }

  async function handleTchombo() {
    setConfirmOpen(false);
    setBusy(true);
    const res = await onTchombo();
    setBusy(false);
    if (res.ok) {
      sound.tchomboCall();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="min-h-screen px-5 py-6 flex flex-col">
      <div className="flex items-center justify-between max-w-sm w-full mx-auto">
        <span className="text-xs font-semibold text-navy/40 uppercase tracking-widest">
          {t("game.questionNumber", { number: state.questionNumber })}
        </span>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <LeaveButton
            onLeave={onLeave}
            title={t("nav.confirmLeaveGameTitle")}
            body={t("nav.confirmLeaveGameBody")}
          />
        </div>
      </div>

      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col gap-5 mt-4">
        <div
          className={`rounded-xl2 px-5 py-2.5 text-center font-semibold text-sm ${
            isMyTurn ? "bg-leaf text-white animate-pop-in" : "bg-white text-navy/60"
          }`}
        >
          {isMyTurn ? `🟢 ${t("game.yourTurn")}` : `⏳ ${t("game.waitingFor", { name: currentPlayer?.name ?? "…" })}`}
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-6 flex flex-col gap-3">
          <span className="text-xs font-semibold text-leaf uppercase tracking-wide">
            {CATEGORY_EMOJI[question.category]} {t(`category.${question.category}`)}
          </span>
          <p className="font-display text-xl leading-snug text-ink">{question.question}</p>
        </div>

        <div className="bg-navy/5 rounded-xl2 px-5 py-3.5 flex items-center justify-between">
          <span className="text-sm text-navy/50">{t("game.previousAnswer")}</span>
          <span className="font-display text-lg text-navy tabular-nums">
            {previous ? `${previous.value} ${question.unit}` : t("game.noAnswerYet")}
          </span>
        </div>

        {isMyTurn ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-white rounded-2xl border-2 border-navy/10 focus-within:border-gold px-4 py-3.5">
                <input
                  autoFocus
                  inputMode={question.allow_decimal ? "decimal" : "numeric"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t("game.inputPlaceholder")}
                  className="flex-1 min-w-0 text-3xl font-display tabular-nums focus:outline-none bg-transparent"
                />
                <span className="text-navy/40 font-semibold flex-shrink-0">{question.unit}</span>
              </div>
              <span className="text-xs italic text-navy/40 pl-1">
                {question.allow_decimal ? t("game.decimalsAllowed") : t("game.wholeNumbersOnly")}
              </span>
            </div>

            {error && <p className="text-coral text-sm font-medium text-center">{error}</p>}

            <Button full disabled={busy || value.trim() === ""} onClick={handleSubmit}>
              ↑ {t("game.increase")}
            </Button>

            {previous && (
              <Button variant="danger" full disabled={busy} onClick={() => setConfirmOpen(true)}>
                {t("game.tchombo")}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-navy/50 py-3">
            {nextInfo?.id === myPlayerId
              ? <span className="font-semibold text-leaf">{t("game.youAreNext")}</span>
              : nextInfo && <span>{t("game.nextPlayer", { name: nextInfo.name })}</span>}
          </div>
        )}
      </div>

      {confirmOpen && previous && (
        <ConfirmDialog
          title={t("game.confirmTchomboTitle", { name: previous.playerName, value: previous.value, unit: question.unit })}
          body={t("game.confirmTchomboBody")}
          confirmLabel={t("game.confirm")}
          cancelLabel={t("game.cancel")}
          danger
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleTchombo}
        />
      )}

      <div className="max-w-sm w-full mx-auto mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {state.players.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1">
            <span className={`text-xs font-medium truncate max-w-[3.5rem] ${p.id === state.currentPlayerId ? "text-leaf" : "text-navy/40"}`}>
              {p.name}
            </span>
            <DodoCount count={p.dodos} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
