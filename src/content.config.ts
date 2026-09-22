import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { publicationSchema } from "./publication/schema";
import { isLocale } from "./i18n/locales";
const collection = (name: "posts" | "notes") =>
  defineCollection({
    loader: glob({
      pattern: "**/*.{md,mdx}",
      base: `./src/content/${name}`,
      generateId: ({ entry, data }) => {
        const folder = entry.split("/")[0];
        if (!isLocale(folder) || folder !== data["locale"])
          throw new Error(`Content locale does not match folder: ${entry}`);
        return entry.replace(/\.(md|mdx)$/, "");
      },
    }),
    schema: publicationSchema,
  });
export const collections = {
  posts: collection("posts"),
  notes: collection("notes"),
};
