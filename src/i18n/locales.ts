export const locales = ["en", "zh-hans"] as const;
export type Locale = (typeof locales)[number];
export const localeInfo = {
  en: { tag: "en", label: "English", other: "zh-hans" },
  "zh-hans": { tag: "zh-Hans", label: "简体中文", other: "en" },
} as const satisfies Record<
  Locale,
  { tag: string; label: string; other: Locale }
>;
export const isLocale = (value: unknown): value is Locale =>
  locales.some((locale) => locale === value);
export const home = (locale: Locale) => `/${locale}/`;
export const dateLabel = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(localeInfo[locale].tag, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
export const localePaths = () =>
  locales.map((locale) => ({ params: { locale }, props: { locale } }));
