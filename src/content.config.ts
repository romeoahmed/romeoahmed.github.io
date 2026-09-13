import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { tags } from "./i18n/tags";
import { isLocale, locales } from "./i18n/locales";

const schema = z.object({
  translationKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(locales),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  license: z.literal("CC-BY-NC-SA-4.0").default("CC-BY-NC-SA-4.0"),
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
  tags: z.array(z.enum(tags)).default([]),
});
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
    schema,
  });
export const collections = {
  posts: collection("posts"),
  notes: collection("notes"),
};
