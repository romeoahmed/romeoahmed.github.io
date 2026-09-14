import { expect, test } from "vitest";
import { messages } from "../../src/i18n/messages";

// Parse built HTML without executing page scripts; router behavior needs a preview review.
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

test("topic archives preserve each edition's matching articles and publication order", () => {
  for (const locale of ["en", "zh-hans"]) {
    const home = read(`${locale}/index.html`);
    const rows = [...home.querySelectorAll(".post-row")];
    const topics = new Set(
      Array.from(
        home.querySelectorAll<HTMLAnchorElement>(".post-kind a"),
        (link) => link.getAttribute("href")!,
      ),
    );
    expect(topics.size, `${locale} topic links`).toBeGreaterThan(0);
    for (const topic of topics) {
      const expected = rows
        .filter((row) => row.querySelector(`a[href="${topic}"]`))
        .map((row) => row.querySelector("h3 a")!.getAttribute("href"));
      const archive = read(`${topic.slice(1)}index.html`);
      expect(
        Array.from(archive.querySelectorAll(".post-row h2 a"), (link) =>
          link.getAttribute("href"),
        ),
      ).toEqual(expected);
    }
  }
});

test("generated pages have unique anchors and resolvable internal links", () => {
  const assets = new Set(
    Object.keys(
      import.meta.glob("../../dist/**/*", { query: "?url", import: "default" }),
    ),
  );
  expect(Object.keys(files).length).toBeGreaterThan(0);
  for (const [file, source] of Object.entries(files).filter(([path]) =>
    path.endsWith(".html"),
  )) {
    const path = file.replace("../../dist/", "");
    const base = new URL(
      path.replace(/index\.html$/, ""),
      "https://romeoahmed.github.io/",
    );
    const doc = new DOMParser().parseFromString(source, "text/html");
    for (const link of doc.querySelectorAll('nav a[aria-current="page"]')) {
      expect(link.getAttribute("href"), `Current navigation in ${path}`).toBe(
        base.pathname,
      );
    }
    const ids = Array.from(doc.querySelectorAll("[id]"), (node) => node.id);
    expect(new Set(ids).size, `Duplicate IDs in ${path}`).toBe(ids.length);
    for (const anchor of doc.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const url = new URL(anchor.getAttribute("href")!, base);
      if (url.origin !== base.origin) continue;
      const target =
        decodeURIComponent(url.pathname.slice(1)) +
        (url.pathname.endsWith("/") ? "index.html" : "");
      expect(assets.has(`../../dist/${target}`), `${path} → ${url.href}`).toBe(
        true,
      );
      if (url.hash && target.endsWith(".html")) {
        expect(
          read(target).getElementById(decodeURIComponent(url.hash.slice(1))),
          `${path} → ${url.href}`,
        ).not.toBeNull();
      }
    }
  }
});

test("article metadata references decodable sharing cards and describes the publication", async () => {
  const images = import.meta.glob<string>("../../dist/og/**/*.png", {
    query: "?url",
    import: "default",
    eager: true,
  });
  for (const path of [english, chinese]) {
    const doc = read(path);
    const image = doc
      .querySelector('meta[property="og:image"]')!
      .getAttribute("content")!;
    const asset = images[`../../dist${new URL(image).pathname}`];
    expect(asset).toBeDefined();
    const card = new Image();
    card.src = asset!;
    await card.decode();
    expect([card.naturalWidth, card.naturalHeight]).toEqual([1200, 630]);
    const data: unknown = JSON.parse(
      doc.querySelector('script[type="application/ld+json"]')!.textContent,
    );
    expect(data).toMatchObject({
      "@type": "BlogPosting",
      author: { name: "Romeo Ahmed" },
      image,
      inLanguage: doc.documentElement.lang,
      headline: doc.querySelector("h1")!.textContent.trim(),
    });
  }
});

test("code fences include filenames, highlighted lines and accessible line numbers", () => {
  const code = read(english);
  expect(
    code.querySelector(".expressive-code figcaption")?.textContent.trim(),
  ).toBeTruthy();
  expect(code.querySelector(".expressive-code .highlight")).not.toBeNull();
  const numbers = [
    ...code.querySelector(".expressive-code")!.querySelectorAll(".ln"),
  ];
  expect(numbers.length).toBeGreaterThan(0);
  expect(
    numbers.every((number) => number.getAttribute("aria-hidden") === "true"),
  ).toBe(true);
});

test("code pages share emitted styles and scripts while diagram-only pages omit them", () => {
  const assets = (path: string) =>
    Array.from(
      read(path).querySelectorAll(
        ".expressive-code link[rel=stylesheet], .expressive-code script[src]",
      ),
      (element) => element.getAttribute("href") ?? element.getAttribute("src"),
    );
  const englishAssets = assets(english);
  expect(englishAssets).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^\/_astro\/.+\.css$/),
      expect.stringMatching(/^\/_astro\/.+\.js$/),
    ]),
  );
  expect(assets(chinese)).toEqual(englishAssets);
  expect(assets("en/posts/a-quieter-web/index.html")).toEqual([]);
});

test("article images provide responsive WebP, dimensions, alternative text and captions", () => {
  for (const path of [
    "en/posts/a-quieter-web/index.html",
    "zh-hans/posts/a-place-to-think/index.html",
  ]) {
    const doc = read(path);
    const image = doc.querySelector<HTMLImageElement>(".prose figure img")!;
    expect(image.alt).not.toBe("");
    expect(image.getAttribute("srcset")).toContain("w");
    expect(image.getAttribute("src")).toMatch(/\.webp$/);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(
      image.parentElement?.querySelector("figcaption")?.textContent.trim(),
    ).toBeTruthy();
  }
});

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
  expect(
    untranslated.head.querySelector(
      'link[rel="alternate"][hreflang="zh-Hans"]',
    ),
  ).toBeNull();
});

test("feeds resolve to built pages and note anchors", () => {
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
});

test("the bilingual error page stays out of search and the sitemap", () => {
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
      doc.querySelector(".expressive-code .copy button")?.getAttribute("title"),
    ).toBe(path === english ? "Copy to clipboard" : "复制代码");
    expect(
      doc.querySelector('pre[data-language="ts"] code')?.textContent,
    ).toContain("const");
    expect(
      doc.querySelector("easing-experiment input")?.hasAttribute("disabled"),
    ).toBe(true);
    expect(doc.head.textContent).toContain("--font-math");
    const references = doc.querySelectorAll<HTMLAnchorElement>(".tml-ref");
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(doc.getElementById(reference.hash.slice(1))).not.toBeNull();
    }
  }
  for (const path of ["en/index.html", "zh-hans/about/index.html"]) {
    expect(read(path).head.textContent).not.toContain("--font-math");
  }
});

test("Markdown and MDX leave accessible diagram source available without JavaScript", () => {
  for (const path of ["en/posts/a-quieter-web/index.html", english, chinese]) {
    const doc = read(path);
    const code = doc.querySelector<HTMLPreElement>("pre[data-mermaid]");
    expect(code?.textContent).toContain("flowchart LR");
    expect(code?.textContent).toContain("accTitle:");
    expect(code?.textContent).toContain("accDescr:");
    expect(code?.hidden).toBe(false);
  }
});
