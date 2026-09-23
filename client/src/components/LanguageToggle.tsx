import { useLocale } from "../lib/i18n";
import { LOCALE_LABELS, type Locale } from "../i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const other: Locale = locale === "en" ? "fr" : "en";

  return (
    <button
      onClick={() => setLocale(other)}
      aria-label={`Switch to ${LOCALE_LABELS[other]}`}
      className="grid place-items-center w-10 h-10 rounded-full bg-white/70 text-navy/70 hover:bg-white transition-colors shadow-sm text-xs font-bold tracking-wide"
    >
      {LOCALE_LABELS[locale]}
    </button>
  );
}
