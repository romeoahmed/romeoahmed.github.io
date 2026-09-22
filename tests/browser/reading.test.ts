import { beforeEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { mountReading } from "../../src/client/reading";
import article from "../../dist/en/posts/the-shape-of-a-pause/index.html?raw";
import "../../src/styles/global.css";
import "../../src/styles/article.css";

beforeEach(async () => {
  const { innerWidth: width, innerHeight: height } = window;
  await page.viewport(1280, 720);
  return async () => {
    document.body.replaceChildren();
    window.scrollTo(0, 0);
    await page.viewport(width, height);
  };
});

test.for([
  { layout: "inline", width: "40rem", expanded: false },
  { layout: "sidebar", width: "50rem", expanded: true },
])(
  "$layout contents follow container space and support keyboard toggling",
  async ({ width, expanded }, { onTestFinished }) => {
    document.body.innerHTML = `
    <div class="page-column" style="width:${width}">
      <main>
        <details class="toc" open>
          <summary>Contents</summary>
          <nav><a href="#section">Section</a></nav>
        </details>
        <h2 id="section">Section</h2>
      </main>
    </div>
  `;
    onTestFinished(mountReading());
    const section = page.getByRole("link", {
      name: "Section",
      includeHidden: true,
    });
    if (expanded) await expect.element(section).toBeVisible();
    else await expect.element(section).not.toBeVisible();
    await userEvent.keyboard("{Tab}{Enter}");
    if (expanded) await expect.element(section).not.toBeVisible();
    else await expect.element(section).toBeVisible();
  },
);

test.for([390, 1280])(
  "contents follow reading and viewport changes at %i px",
  async (width, { onTestFinished }) => {
    await page.viewport(width, 720);
    document.body.innerHTML = `
    <main>
      <nav class="toc">
        <a href="#missing">Missing</a>
        <a href="#one">One</a>
        <a href="#two">Two</a>
      </nav>
      <h2 id="one">One</h2><div style="height:1000px"></div>
      <h2 id="two">Two</h2><div style="height:1000px"></div>
    </main>
  `;
    const dispose = mountReading();
    onTestFinished(dispose);
    const one = page.getByRole("link", { name: "One", exact: true });
    const two = page.getByRole("link", { name: "Two", exact: true });
    await expect.element(one).toHaveAttribute("aria-current", "location");
    const top = document.getElementById("two")!.getBoundingClientRect().top;
    window.scrollTo(0, top - 140);
    await expect.element(two).toHaveAttribute("aria-current", "location");
    await expect.element(one).not.toHaveAttribute("aria-current");
    window.scrollTo(0, top - 320);
    await expect.element(one).toHaveAttribute("aria-current", "location");
    await page.viewport(width, 1200);
    await expect.element(two).toHaveAttribute("aria-current", "location");
    await page.viewport(width, 720);
    await expect.element(one).toHaveAttribute("aria-current", "location");
    window.scrollTo(0, 0);
    await expect.element(one).toHaveAttribute("aria-current", "location");
    await expect.element(two).not.toHaveAttribute("aria-current");
    await expect
      .element(page.getByRole("link", { name: "Missing" }))
      .not.toHaveAttribute("aria-current");
    dispose();
    await expect.element(one).not.toHaveAttribute("aria-current");
    await expect.element(two).not.toHaveAttribute("aria-current");
  },
);

test("equation references resolve through the bundled post-processor on each page", async ({
  onTestFinished,
}) => {
  let dispose = () => {};
  onTestFinished(() => dispose());
  for (let visit = 0; visit < 2; visit++) {
    dispose();
    const doc = new DOMParser().parseFromString(article, "text/html");
    document.body.replaceChildren(doc.querySelector("main")!);
    dispose = mountReading();
    await expect
      .element(page.getByRole("link").filter({ hasText: "(1)" }))
      .toHaveAttribute("href", "#ease");
  }
});

test("an article without contents does not reserve a sidebar or an empty row", () => {
  document.body.innerHTML = `
    <div class="page-column" style="width:50rem">
      <div class="reading-layout"><div class="prose" style="max-inline-size:none">A short article.</div></div>
    </div>`;
  const column = document.querySelector<HTMLElement>(".page-column")!;
  const layout = document.querySelector(".reading-layout")!;
  const prose = document.querySelector(".prose")!;
  for (const width of ["50rem", "30rem"]) {
    column.style.width = width;
    const bounds = layout.getBoundingClientRect();
    const text = prose.getBoundingClientRect();
    expect(text.width).toBeCloseTo(bounds.width, 0);
    expect(text.top - bounds.top).toBeCloseTo(
      parseFloat(getComputedStyle(layout).paddingBlockStart),
      0,
    );
  }
});
