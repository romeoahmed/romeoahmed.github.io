import { expect, test } from "vitest";
import { publicationSchema } from "../../src/publication/schema";

const piece = {
  translationKey: "a-note",
  locale: "en",
  title: "A note",
  description: "A thought to keep.",
  slug: "a-note",
  publishedAt: "2024-02-29",
};

test("authored calendar dates become UTC dates without shifting the day", () => {
  const result = publicationSchema.parse({ ...piece, updatedAt: "2024-03-01" });
  expect(result.publishedAt.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  expect(result.updatedAt?.toISOString()).toBe("2024-03-01T00:00:00.000Z");
});

test.each([
  "2026-02-30",
  "2025-02-29",
  "2026-09-01T23:00:00-08:00",
  true,
  new Date("2026-09-01"),
])(
  "rejects dates outside the quoted calendar-date contract: %s",
  (publishedAt) => {
    expect(publicationSchema.safeParse({ ...piece, publishedAt }).success).toBe(
      false,
    );
  },
);

test("rejects earlier revisions and repeated tags, allowing same-day revisions", () => {
  expect(
    publicationSchema.safeParse({ ...piece, updatedAt: "2024-02-28" }).success,
  ).toBe(false);
  expect(
    publicationSchema.safeParse({ ...piece, updatedAt: piece.publishedAt })
      .success,
  ).toBe(true);
  expect(
    publicationSchema.safeParse({ ...piece, tags: ["web", "web"] }).success,
  ).toBe(false);
  expect(
    publicationSchema.safeParse({ ...piece, tags: ["web", "design"] }).success,
  ).toBe(true);
});
