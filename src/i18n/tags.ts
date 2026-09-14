import type { Locale } from "./locales";
import { messages } from "./messages";

import type { Tag } from "../publication/entries";

export const tagLabel = (tag: Tag, locale: Locale) =>
  messages[locale].tags[tag];
export const topicUrl = (tag: Tag, locale: Locale) =>
  `/${locale}/topics/${tag}/`;
