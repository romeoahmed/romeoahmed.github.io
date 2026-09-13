import { describe, expect, it, vi } from "vitest";
import {
  counterpart,
  published,
  postUrl,
  validatePublications,
  relatedPosts,
  readingMinutes,
  type Publication,
} from "../../src/lib/publications";
import { dateLabel, isLocale } from "../../src/i18n/locales";
const entry = (
  id: string,
  overrides: Partial<Publication["data"]> = {},
): Publication => ({
  id,
  data: {
    locale: "en",
    translationKey: id,
    slug: id,
    publishedAt: new Date("2026-09-10T00:00:00Z"),
    draft: false,
    ...overrides,
  },
});
describe("publication contracts", () => {
  it("prefers related topics within the edition and falls back to publication order", () => {
    const topic = (
      id: string,
      tags: string[],
      overrides: Partial<Publication["data"]> = {},
    ) => {
      const post = entry(id, overrides);
      return { ...post, data: { ...post.data, tags } };
    };
    const current = topic("current", ["web"]);
    const older = topic("related", ["web"], {
      publishedAt: new Date("2026-08-01"),
    });
    const newer = topic("new", []);
    const entries = [
      current,
      newer,
      older,
      topic("unrelated", [], { publishedAt: new Date("2026-07-01") }),
      topic("draft", ["web"], { draft: true }),
      topic("translation", ["web"], { locale: "zh-hans" }),
    ];
    expect(relatedPosts(current, entries).map(({ id }) => id)).toEqual([
      "related",
      "new",
    ]);
    expect(relatedPosts(current, [current])).toEqual([]);
    expect(
      relatedPosts(topic("current", ["web", "engineering"]), [
        topic("repeated", ["web", "web", "web"]),
        topic("both", ["web", "engineering"]),
      ]).map(({ id }) => id),
    ).toEqual(["both", "repeated"]);
  });
  it("publishes newest first, breaks date ties, and preserves its input", () => {
    const entries = Object.freeze([
      entry("b"),
      entry("draft", { draft: true }),
      entry("a"),
      entry("zh", { locale: "zh-hans" }),
      entry("newest", { publishedAt: new Date("2026-09-11T00:00:00Z") }),
    ]);
    expect(published(entries, "en").map(({ id }) => id)).toEqual([
      "newest",
      "a",
      "b",
    ]);
    expect(published(entries).map(({ id }) => id)).toEqual([
      "newest",
      "a",
      "b",
      "zh",
    ]);
    expect(published([])).toEqual([]);
  });
  it("pairs actual published translations with different slugs", () => {
    const en = entry("hello", { translationKey: "shared" });
    const zh = entry("ni-hao", { locale: "zh-hans", translationKey: "shared" });
    expect(postUrl(counterpart(en, [en, zh], "zh-hans")!)).toBe(
      "/zh-hans/posts/ni-hao/",
    );
    expect(
      counterpart(
        en,
        [en, { ...zh, data: { ...zh.data, draft: true } }],
        "zh-hans",
      ),
    ).toBeUndefined();
  });
  it("rejects ambiguous routes and translation identities", () => {
    expect(() =>
      validatePublications([entry("a"), entry("b", { translationKey: "a" })]),
    ).toThrow("Duplicate translation");
    expect(() =>
      validatePublications([
        entry("a"),
        entry("b", { slug: "a", draft: true }),
      ]),
    ).toThrow("Duplicate publication slug");
    expect(() =>
      validatePublications([entry("a"), entry("a", { locale: "zh-hans" })]),
    ).not.toThrow();
  });
  it("keeps authored dates when the build timezone is behind UTC", ({
    onTestFinished,
  }) => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    expect(dateLabel(new Date("2026-09-10T00:00:00Z"), "en")).toBe(
      "Sep 10, 2026",
    );
    expect(dateLabel(new Date("2026-09-10T00:00:00Z"), "zh-hans")).toBe(
      "2026年9月10日",
    );
  });
  it("accepts URL locales, not display tags or arbitrary path segments", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-Hans")).toBe(false);
    expect(isLocale("zh-hans")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
  it("estimates reading time without merging words separated by Han characters", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("word ".repeat(220))).toBe(1);
    expect(readingMinutes("word ".repeat(221))).toBe(2);
    expect(readingMinutes("文".repeat(350))).toBe(1);
    expect(readingMinutes("文".repeat(351))).toBe(2);
    expect(readingMinutes("one中two ".repeat(200))).toBe(3);
  });
});
