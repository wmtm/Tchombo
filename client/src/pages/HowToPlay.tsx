import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";

interface Props {
  onDone: () => void;
}

export function HowToPlay({ onDone }: Props) {
  const t = useT();

  const steps = [
    { emoji: "🦤", title: t("howto.step1Title"), body: t("howto.step1Body") },
    { emoji: "📈", title: t("howto.step2Title"), body: t("howto.step2Body") },
    { emoji: "🚨", title: t("howto.step3Title"), body: t("howto.step3Body") },
    { emoji: "😅", title: t("howto.step4Title"), body: t("howto.step4Body") },
    { emoji: "🎯", title: t("howto.step5Title"), body: t("howto.step5Body") },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 relative">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <Logo size="sm" />

        <div className="text-center">
          <p className="font-display text-3xl text-ink">{t("howto.title")}</p>
          <p className="text-ink/50 text-sm mt-1">{t("howto.subtitle")}</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="bg-white rounded-xl2 shadow-card p-4 flex items-start gap-3 text-left">
              <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{step.emoji}</span>
              <div>
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="text-sm text-ink/60 mt-0.5 leading-snug">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="success" full onClick={onDone}>
          {t("howto.start")}
        </Button>
      </div>
    </div>
  );
}
