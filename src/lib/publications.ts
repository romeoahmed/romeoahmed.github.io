import type { Locale } from "../i18n/locales";

export interface Publication {
  readonly id: string;
  readonly data: {
    readonly locale: Locale;
    readonly translationKey: string;
    readonly slug: string;
    readonly publishedAt: Date;
    readonly draft: boolean;
  };
}
export const postUrl = (entry: Publication) =>
  `/${entry.data.locale}/posts/${entry.data.slug}/`;
export const published = <T extends Publication>(
  entries: readonly T[],
  locale?: Locale,
) =>
  entries
    .filter(({ data }) => !data.draft && (!locale || data.locale === locale))
    .toSorted(
      (a, b) =>
        b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
        a.id.localeCompare(b.id, "en"),
    );

/**
 * Validates publication identities within each locale, including drafts.
 *
 * @returns The original collection, unchanged.
 * @throws Error if a locale has duplicate slugs or translation keys.
 */
export function validatePublications<T extends Publication>(
  entries: readonly T[],
): readonly T[] {
  const identities = new Set<string>();
  const slugs = new Set<string>();
  for (const { data } of entries) {
    const identity = `${data.locale}:${data.translationKey}`;
    const slug = `${data.locale}:${data.slug}`;
    if (identities.has(identity))
      throw new Error(`Duplicate translation identity: ${identity}`);
    if (slugs.has(slug)) throw new Error(`Duplicate publication slug: ${slug}`);
    identities.add(identity);
    slugs.add(slug);
  }
  return entries;
}
export const counterpart = <T extends Publication>(
  entry: T,
  entries: readonly T[],
  locale: Locale,
): T | undefined =>
  entries.find(
    ({ data }) =>
      !data.draft &&
      data.locale === locale &&
      data.translationKey === entry.data.translationKey,
  );
/** Estimates minutes from source text, including Markdown and code, with a minimum of one. */
export const readingMinutes = (body: string) => {
  const chinese = body.match(/[\p{Script=Han}]/gu)?.length ?? 0;
  const words =
    body.replace(/[\p{Script=Han}]/gu, "").match(/[\p{L}\p{N}]+/gu)?.length ??
    0;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
};
