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

/** Ranks same-edition posts by shared topics, breaking ties by publication order. */
export const relatedPosts = <
  T extends Publication & {
    readonly data: { readonly tags: readonly string[] };
  },
>(
  post: T,
  entries: readonly T[],
) => {
  const topics = new Set(post.data.tags);
  return published(entries, post.data.locale)
    .filter((entry) => entry.id !== post.id)
    .map((entry) => ({
      entry,
      shared: topics.intersection(new Set(entry.data.tags)).size,
    }))
    .toSorted((a, b) => b.shared - a.shared)
    .slice(0, 2)
    .map(({ entry }) => entry);
};
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
 * Checks slug and translation-key uniqueness per locale, including drafts.
 *
 * @returns The input array, unchanged.
 * @throws Error for a duplicate slug or translation key in the same locale.
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
/** Estimates reading time from raw source, counting code and Markdown syntax; minimum one minute. */
export const readingMinutes = (body: string) => {
  const chinese = body.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words = body.match(/[[\p{L}\p{N}]--\p{Script=Han}]+/gv)?.length ?? 0;
  return Math.max(1, Math.ceil(chinese / 350 + words / 220));
};
