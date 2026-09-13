import type { GetStaticPaths, InferGetStaticPropsType, APIRoute } from "astro";
import { getPosts } from "../../lib/collections";
import { socialImage } from "../../lib/social-image";
import { locales, localeInfo } from "../../i18n/locales";
import { messages } from "../../i18n/messages";

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    ...locales.map((locale) => ({
      params: { path: locale },
      props: { title: messages[locale].introduction, locale },
    })),
    ...posts.map(({ data }) => ({
      params: { path: `${data.locale}/posts/${data.slug}` },
      props: { title: data.title, locale: data.locale },
    })),
  ];
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(await socialImage(props.title, localeInfo[props.locale].label), {
    headers: { "Content-Type": "image/png" },
  });
