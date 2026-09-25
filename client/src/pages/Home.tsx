import tchomboMascot from "../assets/tchombo-mascot.png";
import { Button } from "../components/Button";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";

interface Props {
  onCreate: () => void;
  onJoin: () => void;
  onHowToPlay: () => void;
}

export function Home({ onCreate, onJoin, onHowToPlay }: Props) {
  const t = useT();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-3">
        <img src={tchomboMascot} alt="TCHOMBO" className="w-52 h-52 object-contain -mb-1" />
        <p className="font-display text-2xl text-ink/80 mt-2">{t("app.tagline")}</p>
        <p className="text-ink/50 text-sm leading-relaxed mt-1">{t("home.subtitle")}</p>

        <div className="w-full flex flex-col gap-3 mt-8">
          <Button variant="primary" full onClick={onCreate}>
            {t("home.create")}
          </Button>
          <Button variant="secondary" full onClick={onJoin}>
            {t("home.join")}
          </Button>
          <Button variant="ghost" full onClick={onHowToPlay}>
            {t("home.howToPlay")}
          </Button>
        </div>

        <div className="mt-10 flex items-center gap-1.5 text-ink/30 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-coral" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          <span className="w-1.5 h-1.5 rounded-full bg-leaf" />
          <span className="w-1.5 h-1.5 rounded-full bg-navy" />
        </div>
      </div>
    </div>
  );
}
