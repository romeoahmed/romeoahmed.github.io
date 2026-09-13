import { expect, it } from "vitest";
import { markdownToHtml } from "satteri";
import { mathPlugin } from "../../src/markdown/math";
import { footnotesPlugin } from "../../src/markdown/footnotes";
const options = {
  features: { math: true },
  mdastPlugins: [mathPlugin],
};
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
it("localizes generated footnote controls", () => {
  const { html } = markdownToHtml("文字[^a]\n\n[^a]: 注释", {
    hastPlugins: [footnotesPlugin],
    fileURL: new URL("file:///content/zh-hans/post.md"),
  });
  expect(html).toContain("注释</h2>");
  expect(html).toContain("返回正文 1");
});
