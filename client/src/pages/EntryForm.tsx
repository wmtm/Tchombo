import { FormEvent, useState } from "react";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { useT } from "../lib/i18n";

interface Props {
  mode: "create" | "join";
  initialCode?: string;
  error?: string | null;
  busy?: boolean;
  onBack: () => void;
  onSubmit: (name: string, code?: string) => void;
}

export function EntryForm({ mode, initialCode, error, busy, onBack, onSubmit }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "join" && code.trim().length !== 4) return;
    onSubmit(name.trim(), code.trim());
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex justify-center mb-2">
          <Logo size="sm" />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy/70">{t("form.yourName")}</span>
          <input
            autoFocus
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("form.namePlaceholder")}
            className="rounded-2xl border-2 border-navy/10 bg-white px-4 py-3.5 text-lg focus:border-gold focus:outline-none"
          />
        </label>

        {mode === "join" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-navy/70">{t("form.roomCode")}</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              maxLength={4}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder={t("form.roomCodePlaceholder")}
              className="rounded-2xl border-2 border-navy/10 bg-white px-4 py-3.5 text-lg tracking-[0.3em] text-center font-display focus:border-gold focus:outline-none"
            />
          </label>
        )}

        {error && <p className="text-coral text-sm font-medium text-center">{error}</p>}

        <Button
          type="submit"
          full
          disabled={busy || !name.trim() || (mode === "join" && code.trim().length !== 4)}
        >
          {mode === "create" ? t("form.create") : t("form.join")}
        </Button>
        <Button type="button" variant="ghost" full onClick={onBack}>
          {t("form.back")}
        </Button>
      </form>
    </div>
  );
}
