import { describe, expect, it, vi } from "vitest";
import {
  counterpart,
  published,
  postUrl,
  validatePublications,
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
});
