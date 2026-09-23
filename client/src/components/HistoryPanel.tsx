import { useState } from "react";
import type { RevealResult } from "@tchombo/shared";
import { CATEGORY_EMOJI } from "./CategoryPicker";
import { useT } from "../lib/i18n";

export function HistoryButton({ history }: { history: RevealResult[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("history.title")}
        className="relative grid place-items-center w-10 h-10 rounded-full bg-white/70 text-navy/60 hover:bg-white hover:text-navy transition-colors shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-coral text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">
            {history.length}
          </span>
        )}
      </button>
      {open && <HistoryPanel history={history} onClose={() => setOpen(false)} />}
    </>
  );
}

function HistoryPanel({ history, onClose }: { history: RevealResult[]; onClose: () => void }) {
  const t = useT();
  const reversed = [...history].reverse();

  return (
    <div className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-xl2 sm:rounded-xl2 shadow-card w-full sm:max-w-md max-h-[85vh] flex flex-col animate-pop-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy/10 flex-shrink-0">
          <p className="font-display text-lg text-ink">{t("history.title")}</p>
          <button onClick={onClose} aria-label={t("game.cancel")} className="text-navy/40 hover:text-navy text-2xl leading-none px-2">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {reversed.length === 0 ? (
            <p className="text-sm text-navy/40 text-center py-8">{t("history.empty")}</p>
          ) : (
            reversed.map((r, i) => (
              <div key={i} className="rounded-xl bg-navy/5 p-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-leaf uppercase tracking-wide">
                  {CATEGORY_EMOJI[r.question.category]} {t(`category.${r.question.category}`)}
                </span>
                <p className="text-sm text-ink leading-snug">{r.question.question}</p>
                <p className="text-sm font-semibold text-navy">
                  {t("history.answer")}: {r.correctAnswer} {r.question.unit}
                </p>
                {r.question.source_note && (
                  <p className="text-xs text-navy/50 italic leading-snug">{r.question.source_note}</p>
                )}
                <p className="text-xs text-navy/50">
                  {t("history.outcome", { name: r.loserName, dodos: r.dodosAwarded })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
