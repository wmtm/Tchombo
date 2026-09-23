import { Button } from "./Button";

interface Props {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger }: Props) {
  return (
    <div className="fixed inset-0 bg-navy/50 backdrop-blur-sm grid place-items-center px-6 z-50">
      <div className="bg-white rounded-xl2 shadow-card p-6 max-w-xs w-full flex flex-col gap-4 animate-pop-in">
        <p className="font-display text-xl text-ink leading-snug">{title}</p>
        {body && <p className="text-sm text-navy/50">{body}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" full onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} full onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
