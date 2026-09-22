import { z } from "astro/zod";
import { tags } from "./entries";
import { locales } from "../i18n/locales";

const date = z.iso.date().pipe(z.coerce.date());

export const publicationSchema = z
  .object({
    translationKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    locale: z.enum(locales),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    publishedAt: date,
    updatedAt: date.optional(),
    license: z.literal("CC-BY-NC-SA-4.0").default("CC-BY-NC-SA-4.0"),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
    tags: z
      .array(z.enum(tags))
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Tags must be unique",
      )
      .default([]),
  })
  .refine(
    ({ publishedAt, updatedAt }) => !updatedAt || updatedAt >= publishedAt,
    {
      path: ["updatedAt"],
      message: "The revision date must not precede publication",
    },
  );
