import { afterEach, expect, test } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import "../../src/styles/global.css";
import "../../src/components/search/search.css";
import { mountSearch } from "../../src/components/search/search";

const pages = import.meta.glob<string>("../../dist/*/index.html", {
  query: "?raw",
  import: "default",
  eager: true,
});
const originalLanguage = document.documentElement.lang;
let dispose = () => {};
function mount(locale: string, bundle = "/dist/pagefind/") {
  dispose();
  const html = pages[`../../dist/${locale}/index.html`];
  expect(html).toBeDefined();
  const doc = new DOMParser().parseFromString(html!, "text/html");
  document.documentElement.lang = doc.documentElement.lang;
  document.body.replaceChildren(
    doc.querySelector(".search-trigger")!,
    doc.querySelector(".search-dialog")!,
  );
  dispose = mountSearch(bundle, "/");
}
afterEach(() => {
  dispose();
  document.body.replaceChildren();
  document.documentElement.lang = originalLanguage;
  window.scrollTo(0, 0);
});

test("search isolates editions, returns note anchors and survives remounting", async ({
  onTestFinished,
}) => {
  mount("en");
  await page.getByRole("button", { name: "Search the notebook" }).click();
  const input = page.getByRole("searchbox");
  await expect.element(input).toHaveFocus();
  await input.fill("Let the picture rest");
  await expect
    .element(
      page.getByRole("link", { name: "Let the picture rest", exact: true }),
    )
    .toHaveAttribute("href", "/en/notes/#idle");
  await page.getByRole("searchbox").fill("");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("button", { name: "Search the notebook" }))
    .toHaveFocus();

  mount("zh-hans");
  await page.getByRole("button", { name: "搜索文章与短记" }).click();
  await input.fill("轨道");
  await expect
    .element(page.getByRole("link", { name: "停下来的那一刻", exact: true }))
    .toHaveAttribute("href", "/zh-hans/posts/motion-and-stillness/");
  await input.fill("accTitle");
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("没有找到，换个词试试。");
  await expect.element(page.getByRole("link")).not.toBeInTheDocument();

  mount("en");
  await userEvent.keyboard("{Control>}k{/Control}");
  await input.fill("Let the picture rest");
  await expect
    .element(
      page.getByRole("link", { name: "Let the picture rest", exact: true }),
    )
    .toBeVisible();
  // Prevent navigation from replacing Vitest's document.
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  document.addEventListener("click", (event) => event.preventDefault(), {
    once: true,
    signal: controller.signal,
  });
  await page
    .getByRole("link", { name: "Let the picture rest", exact: true })
    .click();
  expect(document.querySelector("dialog")!.open).toBe(false);
});

test("search keeps the reading position while the native modal is open", async () => {
  mount("en");
  const reading = document.createElement("main");
  reading.style.height = "200vh";
  document.body.append(reading);
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Search articles and notes in English.");
  const input = document.querySelector("input")!;
  expect(parseFloat(getComputedStyle(input).fontSize)).toBeGreaterThanOrEqual(
    16,
  );
  const y = scrollY;
  const wheel = () =>
    cdp().send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 10,
      y: 10,
      deltaX: 0,
      deltaY: 400,
    });
  await wheel();
  // Allow the wheel scroll to reach the compositor before reading the position.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  expect(scrollY).toBe(y);
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("button", { name: "Search the notebook" }))
    .toHaveFocus();
  await wheel();
  await expect.poll(() => scrollY).toBeGreaterThan(y);
});

test("search results fit short viewports and stay out of printed articles", async ({
  onTestFinished,
}) => {
  const { innerWidth: width, innerHeight: height } = window;
  onTestFinished(async () => {
    await page.viewport(width, height);
    await cdp().send("Emulation.setEmulatedMedia", { media: "screen" });
  });
  mount("en");
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await page.getByRole("searchbox").fill("animation");
  await expect
    .element(
      page.getByRole("link", {
        name: "The shape of a pause",
        exact: true,
      }),
    )
    .toBeVisible();
  const dialog = document.querySelector("dialog")!;
  const links = dialog.querySelectorAll("a");
  const lastLink = links.item(links.length - 1);
  for (const [width, height] of [
    [1280, 600],
    [390, 480],
  ] as const) {
    await page.viewport(width, height);
    await page.getByRole("searchbox").click();
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(innerWidth);
    lastLink.focus();
    expect(lastLink.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bounds.bottom,
    );
  }
  await cdp().send("Emulation.setEmulatedMedia", { media: "print" });
  await expect.element(dialog).not.toBeVisible();
  expect(getComputedStyle(document.documentElement).overflowY).toBe("visible");
  expect(getComputedStyle(document.documentElement).colorScheme).toBe("light");
});
