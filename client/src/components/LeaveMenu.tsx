import { useState } from "react";
import { Button } from "./Button";
import { useT } from "../lib/i18n";

interface Props {
  onExit: () => void;
  /** Pass only when the current player is host AND a restart is currently allowed (not in the lobby). */
  onRestart?: () => void;
  exitTitle: string;
  exitBody?: string;
}

export function LeaveMenu({ onExit, onRestart, exitTitle, exitBody }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  function close() {
    setOpen(false);
    setConfirmingRestart(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("nav.leave")}
        className="grid place-items-center w-10 h-10 rounded-full bg-white/70 text-navy/60 hover:bg-white hover:text-coral transition-colors shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 bg-navy/50 backdrop-blur-sm grid place-items-center px-6 z-50">
          <div className="bg-white rounded-xl2 shadow-card p-6 max-w-xs w-full flex flex-col gap-4 animate-pop-in">
            {confirmingRestart ? (
              <>
                <p className="font-display text-xl text-ink leading-snug">{t("nav.confirmRestartTitle")}</p>
                <p className="text-sm text-navy/50">{t("nav.confirmRestartBody")}</p>
                <div className="flex gap-3">
                  <Button variant="secondary" full onClick={() => setConfirmingRestart(false)}>
                    {t("game.cancel")}
                  </Button>
                  <Button
                    variant="gold"
                    full
                    onClick={() => {
                      close();
                      onRestart?.();
                    }}
                  >
                    {t("nav.startNewGame")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-display text-xl text-ink leading-snug">{exitTitle}</p>
                {exitBody && <p className="text-sm text-navy/50">{exitBody}</p>}
                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="danger"
                    full
                    onClick={() => {
                      close();
                      onExit();
                    }}
                  >
                    {t("nav.leave")}
                  </Button>
                  {onRestart && (
                    <Button variant="gold" full onClick={() => setConfirmingRestart(true)}>
                      {t("nav.startNewGame")}
                    </Button>
                  )}
                  <Button variant="ghost" full onClick={close}>
                    {t("game.cancel")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
