import { expect, it } from "vitest";
import { markdownToHtml } from "satteri";
import { mathPlugin } from "../../src/markdown/math";
import { footnotesPlugin } from "../../src/markdown/footnotes";
import { diagramsPlugin } from "../../src/markdown/diagrams";
const options = {
  features: { math: true },
  mdastPlugins: [mathPlugin],
};
it("preserves diagram source as escaped text without changing ordinary fences", () => {
  const { html } = markdownToHtml(
    '```mermaid\nA["<script>{value}</script>"]\n```\n\n```ts\nconst x = 1;\n```',
    {
      hastPlugins: [diagramsPlugin],
    },
  );
  expect(html).toContain("data-mermaid");
  expect(html).toContain("data-pagefind-ignore");
  expect(html).toContain("&lt;script&gt;{value}&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain('class="language-ts"');
});
it("compiles math nodes while leaving fenced code literal", () => {
  const source = "$x^2$\n\n$$\n\\frac{1}{2}\n$$\n\n```txt\n$not_math$\n```";
  const { html } = markdownToHtml(source, options);
  expect(html).toContain("<math");
  expect(html).toContain("<mfrac>");
  expect(html).toContain("$not_math$");
});
it("scopes macros to one document and reports invalid TeX", () => {
  const first = markdownToHtml(String.raw`$\gdef\foo{x}\foo$`, options);
  expect(first.html).toContain("<mi>x</mi>");
  expect(() => markdownToHtml(String.raw`$\foo$`, options)).toThrow(
    "Invalid mathematics",
  );
  expect(() =>
    markdownToHtml(String.raw`$\frac{$`, {
      ...options,
      fileURL: new URL("file:///content/en/broken.md"),
    }),
  ).toThrow("Invalid mathematics in /content/en/broken.md");
});
it.each([
  ["en", "Footnotes", "Back to reference"],
  ["zh-hans", "注释", "返回正文"],
])(
  "%s footnotes label navigation in the document language",
  (locale, heading, back) => {
    const { html } = markdownToHtml("A note[^a]\n\n[^a]: Detail", {
      hastPlugins: [footnotesPlugin],
      fileURL: new URL(`file:///content/${locale}/post.md`),
    });
    expect(html).toContain(`${heading}</h2>`);
    expect(html).toContain(`${back} 1`);
  },
);
