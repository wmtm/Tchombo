import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { useT } from "../lib/i18n";

interface Props {
  onLeave: () => void;
  title: string;
  body?: string;
}

export function LeaveButton({ onLeave, title, body }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

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
        <ConfirmDialog
          title={title}
          body={body}
          confirmLabel={t("nav.leave")}
          cancelLabel={t("game.cancel")}
          danger
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            onLeave();
          }}
        />
      )}
    </>
  );
}
