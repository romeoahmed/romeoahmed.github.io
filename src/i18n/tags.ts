import type { Locale } from "./locales";
import { messages } from "./messages";

export const tags = [
  "design",
  "web",
  "mathematics",
  "interaction",
  "engineering",
] as const;
export type Tag = (typeof tags)[number];
export const tagLabel = (tag: Tag, locale: Locale) =>
  messages[locale].tags[tag];
