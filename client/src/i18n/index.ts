import en from "./en.json";
import fr from "./fr.json";

const dictionaries = { en, fr } as const;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_LABELS: Record<Locale, string> = { en: "EN", fr: "FR" };

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export function createTranslator(locale: Locale = DEFAULT_LOCALE) {
  const dict: Record<string, string> = dictionaries[locale] ?? dictionaries.en;
  return function t(key: string, vars?: Vars): string {
    const template = dict[key] ?? dictionaries.en[key as keyof typeof dictionaries.en] ?? key;
    return interpolate(template, vars);
  };
}
