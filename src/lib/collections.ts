import { getCollection } from "astro:content";
import type { Locale } from "../i18n/locales";
import { published, validatePublications } from "./publications";
export async function getPosts(locale?: Locale) {
  return published(validatePublications(await getCollection("posts")), locale);
}
export async function getNotes(locale?: Locale) {
  return published(validatePublications(await getCollection("notes")), locale);
}
