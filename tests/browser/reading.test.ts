import { beforeEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { mountReading } from "../../src/client/reading";
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
      <main data-reading>
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

test("the table of contents follows reading in both directions and ignores missing targets", async ({
  onTestFinished,
}) => {
  document.body.innerHTML = `
    <main data-reading>
      <nav class="toc">
        <a href="#missing">Missing</a>
        <a href="#one">One</a>
        <a href="#two">Two</a>
      </nav>
      <h2 id="one">One</h2><div style="height:120vh"></div>
      <h2 id="two">Two</h2><div style="height:120vh"></div>
    </main>
  `;
  const dispose = mountReading();
  onTestFinished(dispose);
  const one = page.getByRole("link", { name: "One", exact: true });
  const two = page.getByRole("link", { name: "Two", exact: true });
  await expect.element(one).toHaveAttribute("aria-current", "location");
  document.getElementById("two")!.scrollIntoView();
  await expect.element(two).toHaveAttribute("aria-current", "location");
  await expect.element(one).not.toHaveAttribute("aria-current");
  window.scrollTo(0, 0);
  await expect.element(one).toHaveAttribute("aria-current", "location");
  await expect.element(two).not.toHaveAttribute("aria-current");
  await expect
    .element(page.getByRole("link", { name: "Missing" }))
    .not.toHaveAttribute("aria-current");
  dispose();
  await expect.element(one).not.toHaveAttribute("aria-current");
  await expect.element(two).not.toHaveAttribute("aria-current");
});
