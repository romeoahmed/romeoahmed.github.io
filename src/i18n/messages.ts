import en from "./en";
import zh from "./zh-hans";
import type { Locale } from "./locales";
import type { Messages } from "./en";

export const messages: Readonly<Record<Locale, Messages>> = {
  en,
  "zh-hans": zh,
};
