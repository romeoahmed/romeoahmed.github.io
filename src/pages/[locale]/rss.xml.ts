import rss from "@astrojs/rss";
import type { APIRoute, InferGetStaticPropsType } from "astro";
import { localePaths, localeInfo } from "../../i18n/locales";
import { messages } from "../../i18n/messages";
import { getPosts, getNotes } from "../../publication/collections";
import { published, postUrl } from "../../publication/entries";
import { site } from "../../site";
export const getStaticPaths = localePaths;
type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props: { locale } }) => {
  const [posts, notes] = await Promise.all([
    getPosts(locale),
    getNotes(locale),
  ]);
  return rss({
    title: `${site.author} — ${messages[locale].volume}`,
    description: messages[locale].intro,
    site: site.url,
    items: published([...posts, ...notes]).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      // Absolute URLs prevent RSS normalization from changing note fragments.
      link: new URL(
        post.collection === "notes"
          ? `/${locale}/notes/#${post.data.slug}`
          : postUrl(post),
        site.url,
      ).href,
    })),
    customData: `<language>${localeInfo[locale].tag}</language>`,
  });
};
