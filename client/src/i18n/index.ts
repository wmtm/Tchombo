import en from "./en.json";

const dictionaries = { en } as const;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = "en";

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
