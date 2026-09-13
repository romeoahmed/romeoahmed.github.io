import { expect, test } from "vitest";
import { messages } from "../../src/i18n/messages";

// Inspect generated markup in an inert document; these tests do not run page scripts.
const files = import.meta.glob<string>("../../dist/**/*.{html,xml}", {
  query: "?raw",
  import: "default",
  eager: true,
});
const read = (path: string) => {
  const source = files[`../../dist/${path}`];
  expect(source, `Build output: ${path}`).toBeDefined();
  return new DOMParser().parseFromString(
    source!,
    path.endsWith(".xml") ? "text/xml" : "text/html",
  );
};
const english = "en/posts/the-shape-of-a-pause/index.html";
const chinese = "zh-hans/posts/motion-and-stillness/index.html";

test("Markdown, MDX, and notes expose separate text and code licenses", () => {
  for (const path of [
    english,
    chinese,
    "en/posts/a-quieter-web/index.html",
    "en/notes/index.html",
    "zh-hans/notes/index.html",
  ]) {
    const doc = read(path);
    expect(doc.querySelector('a[rel="license"]')?.textContent).toBe(
      "CC-BY-NC-SA-4.0",
    );
    expect(
      doc.querySelector('a[href="https://opensource.org/license/mit"]')
        ?.textContent,
    ).toBe("MIT");
  }
});

test("translated articles have reciprocal canonical alternates and language tags", () => {
  for (const [path, lang, other, otherPath] of [
    [english, "en", "zh-Hans", chinese],
    [chinese, "zh-Hans", "en", english],
  ] as const) {
    const doc = read(path);
    expect(doc.documentElement.lang).toBe(lang);
    expect(doc.querySelector('[rel="canonical"]')?.getAttribute("href")).toBe(
      `https://romeoahmed.github.io/${path.replace("index.html", "")}`,
    );
    expect(
      doc
        .querySelector(`[rel="alternate"][hreflang="${other}"]`)
        ?.getAttribute("href"),
    ).toBe(
      `https://romeoahmed.github.io/${otherPath.replace("index.html", "")}`,
    );
    expect(doc.querySelector('[hreflang="x-default"]')).toBeNull();
  }
  expect(
    read("index.html")
      .querySelector('[hreflang="x-default"]')
      ?.getAttribute("href"),
  ).toBe("https://romeoahmed.github.io/");
  const untranslated = read("en/posts/small-functions/index.html");
  expect(untranslated.body.textContent).toContain(messages.en.unavailable);
  expect(untranslated.querySelector('[hreflang="zh-Hans"]')).toBeNull();
});

test("feeds resolve to built pages and note anchors; the error page stays out of search", () => {
  for (const locale of ["en", "zh-hans"]) {
    const feed = read(`${locale}/rss.xml`);
    expect(feed.querySelector("parsererror")).toBeNull();
    const urls = Array.from(
      feed.querySelectorAll("item > link"),
      (link) => new URL(link.textContent),
    );
    expect(urls.some((url) => url.pathname.includes("/posts/"))).toBe(true);
    expect(urls.some((url) => url.pathname === `/${locale}/notes/`)).toBe(true);
    for (const url of urls) {
      expect(url.origin).toBe("https://romeoahmed.github.io");
      expect(url.pathname.startsWith(`/${locale}/`)).toBe(true);
      const doc = read(`${url.pathname.slice(1)}index.html`);
      if (url.hash)
        expect(
          doc.getElementById(decodeURIComponent(url.hash.slice(1))),
        ).not.toBeNull();
    }
  }
  const sitemap = read("sitemap-0.xml");
  expect(sitemap.querySelector("parsererror")).toBeNull();
  expect(sitemap.documentElement.textContent).not.toContain("404");
  const error = read("404.html");
  expect(
    error.querySelector('meta[name="robots"]')?.getAttribute("content"),
  ).toContain("noindex");
  expect(error.body.textContent).toContain(messages.en.notFoundBody);
  expect(error.body.textContent).toContain(messages["zh-hans"].notFoundBody);
});

test("MDX emits mathematics, labeled code, and inspectable content before enhancement", () => {
  for (const path of [english, chinese]) {
    const doc = read(path);
    expect(doc.querySelector('math[display="block"]')).not.toBeNull();
    expect(
      doc.querySelector('pre[data-language="ts"] code')?.textContent,
    ).toContain("const");
    expect(
      doc.querySelector("easing-experiment input")?.hasAttribute("disabled"),
    ).toBe(true);
    expect(doc.head.textContent).toContain("/fonts/STIXTwoMath.woff2");
    for (const reference of doc.querySelectorAll<HTMLAnchorElement>(
      ".tml-ref",
    )) {
      expect(doc.getElementById(reference.hash.slice(1))).not.toBeNull();
    }
  }
  for (const path of ["en/index.html", "zh-hans/about/index.html"]) {
    expect(read(path).head.textContent).not.toContain("STIXTwoMath.woff2");
  }
});

test("Markdown and MDX leave accessible diagram source available without JavaScript", () => {
  for (const path of ["en/posts/a-quieter-web/index.html", english, chinese]) {
    const doc = read(path);
    const code = doc.querySelector("pre > code.language-mermaid");
    expect(code?.textContent).toContain("flowchart LR");
    expect(code?.textContent).toContain("accTitle:");
    expect(code?.textContent).toContain("accDescr:");
    expect(code?.parentElement?.hidden).toBe(false);
  }
});
