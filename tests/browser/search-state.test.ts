import { expect, test as baseTest, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { mountSearch } from "../../src/components/search/search";
import html from "../../dist/en/index.html?raw";

const index = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  debouncedSearch: vi.fn<(term: string) => Promise<unknown>>(),
  destroy: vi.fn<() => Promise<void>>(),
}));
vi.mock("/dist/pagefind/pagefind.js", () => ({ createInstance: () => index }));

const result = (title: string) => ({
  data: () =>
    Promise.resolve({
      url: `/en/posts/${title}/`,
      meta: { title },
      excerpt: title,
      sub_results: [],
    }),
});
const test = baseTest.extend("dispose", { auto: true }, ({}, { onCleanup }) => {
  index.init.mockReset().mockResolvedValue(undefined);
  index.debouncedSearch.mockReset();
  index.destroy.mockReset().mockResolvedValue(undefined);
  const doc = new DOMParser().parseFromString(html, "text/html");
  document.body.replaceChildren(
    doc.querySelector(".search-trigger")!,
    doc.querySelector("dialog")!,
  );
  const dispose = mountSearch("/dist/pagefind/");
  onCleanup(() => {
    dispose();
    document.body.replaceChildren();
  });
  return dispose;
});

test("composition waits for committed text and invalidates an earlier query", async () => {
  const pending = Promise.withResolvers<unknown>();
  index.debouncedSearch
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue({ results: [result("Committed")] });
  await page.getByRole("button", { name: "Search the notebook" }).click();
  const input = page.getByRole("searchbox");
  await input.fill("before");
  await expect.poll(() => index.debouncedSearch).toHaveBeenCalledWith("before");
  await cdp().send("Input.imeSetComposition", {
    text: "中文",
    selectionStart: 2,
    selectionEnd: 2,
    replacementStart: 0,
    replacementEnd: 6,
  });
  pending.resolve({ results: [result("Old")] });
  await new Promise(requestAnimationFrame);
  expect(index.debouncedSearch).toHaveBeenCalledOnce();
  await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  await cdp().send("Input.insertText", { text: "中文" });
  await expect
    .poll(() => index.debouncedSearch)
    .toHaveBeenLastCalledWith("中文");
  await expect
    .element(page.getByRole("link", { name: "Committed" }))
    .toBeVisible();
  await userEvent.keyboard("{Tab}");
  await expect
    .element(page.getByRole("link", { name: "Committed" }))
    .toHaveFocus();
  await userEvent.keyboard("{Control>}k{/Control}");
  await expect.element(input).toHaveFocus();
});

test("older results cannot overwrite a newer query or a cleared input", async () => {
  const old = Promise.withResolvers<unknown>();
  const cleared = Promise.withResolvers<unknown>();
  index.debouncedSearch
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ results: [result("Latest")] })
    .mockReturnValueOnce(cleared.promise);
  await page.getByRole("button", { name: "Search the notebook" }).click();
  const input = page.getByRole("searchbox");
  await input.fill("old");
  await expect.poll(() => index.debouncedSearch).toHaveBeenCalledWith("old");
  await input.fill("latest");
  await expect
    .element(page.getByRole("link", { name: "Latest", exact: true }))
    .toBeVisible();
  old.resolve({ results: [result("Old")] });
  // Let the stale request finish its promise chain before checking the rendered result.
  await new Promise(requestAnimationFrame);
  await expect
    .element(page.getByRole("link", { name: "Latest", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Old", exact: true }))
    .not.toBeInTheDocument();
  await input.fill("clear me");
  await expect
    .poll(() => index.debouncedSearch)
    .toHaveBeenCalledWith("clear me");
  await input.fill("");
  cleared.resolve({ results: [result("Cleared")] });
  await new Promise(requestAnimationFrame);
  await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Search articles and notes in English.");
});

test("loading more appends results and moves focus to the first new result", async () => {
  index.debouncedSearch.mockResolvedValue({
    results: Array.from({ length: 7 }, (_, i) => result(`Result ${i + 1}`)),
  });
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await page.getByRole("searchbox").fill("results");
  const more = page.getByRole("button", { name: "Show more" });
  await expect.element(more).toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Result 7", exact: true }))
    .not.toBeInTheDocument();
  await more.click();
  await expect
    .element(page.getByRole("link", { name: "Result 7", exact: true }))
    .toHaveFocus();
  await expect
    .element(page.getByRole("link", { name: "Result 1", exact: true }))
    .toBeVisible();
  await expect.element(more).not.toBeInTheDocument();
});

test("navigation releases an index that finishes warming after departure", async ({
  dispose,
}) => {
  const pending = Promise.withResolvers<void>();
  index.init.mockReturnValueOnce(pending.promise);
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await expect.poll(() => index.init).toHaveBeenCalled();
  dispose();
  pending.resolve();
  await expect.poll(() => index.destroy).toHaveBeenCalled();
  expect(index.debouncedSearch).not.toHaveBeenCalled();
});

test("a failed warmup leaves the hint intact and typing retries", async () => {
  index.init.mockRejectedValueOnce(new Error("Index unavailable"));
  index.debouncedSearch.mockResolvedValue({ results: [result("Recovered")] });
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await expect.poll(() => index.destroy).toHaveBeenCalledOnce();
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Search articles and notes in English.");
  await page.getByRole("searchbox").fill("retry");
  await expect
    .element(page.getByRole("link", { name: "Recovered", exact: true }))
    .toBeVisible();
});

test("a query reports initialization failure and the next query can recover", async () => {
  const pending = Promise.withResolvers<void>();
  index.init.mockReturnValueOnce(pending.promise);
  index.debouncedSearch.mockResolvedValue({ results: [result("Recovered")] });
  await page.getByRole("button", { name: "Search the notebook" }).click();
  const input = page.getByRole("searchbox");
  await input.fill("first");
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Searching…");
  pending.reject(new Error("Index unavailable"));
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Search is unavailable. Please try again.");
  // A search input consumes Escape to clear its value before the dialog can dismiss.
  await input.fill("");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("button", { name: "Search the notebook" }))
    .toHaveFocus();
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await input.fill("retry");
  await expect
    .element(page.getByRole("link", { name: "Recovered", exact: true }))
    .toBeVisible();
});

test.for(["new query", "clear", "disposal"])(
  "%s prevents late result details from entering the page",
  async (action, { dispose }) => {
    const stale = await result("Old").data();
    const pending = Promise.withResolvers<typeof stale>();
    const data = vi.fn(() => pending.promise);
    index.debouncedSearch
      .mockResolvedValueOnce({ results: [{ data }] })
      .mockResolvedValueOnce({ results: [result("Latest")] });
    await page.getByRole("button", { name: "Search the notebook" }).click();
    const input = page.getByRole("searchbox");
    await input.fill("old");
    await expect.poll(() => data).toHaveBeenCalled();
    if (action === "disposal") dispose();
    else await input.fill(action === "clear" ? "" : "latest");
    if (action === "new query")
      await expect
        .element(page.getByRole("link", { name: "Latest", exact: true }))
        .toBeVisible();
    pending.resolve(stale);
    await new Promise(requestAnimationFrame);
    expect(document.querySelector("ol")!.textContent).not.toContain("Old");
    if (action === "new query")
      await expect
        .element(page.getByRole("link", { name: "Latest", exact: true }))
        .toBeVisible();
  },
);

test("failed result loading can be retried without discarding earlier pages", async () => {
  const last = result("Last");
  const data = vi
    .fn(last.data)
    .mockRejectedValueOnce(new Error("Fragment unavailable"));
  index.debouncedSearch.mockResolvedValue({
    results: [
      ...Array.from({ length: 6 }, (_, i) => result(`Result ${i + 1}`)),
      { data },
    ],
  });
  await page.getByRole("button", { name: "Search the notebook" }).click();
  await page.getByRole("searchbox").fill("results");
  const more = page.getByRole("button", { name: "Show more" });
  await more.click();
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Search is unavailable. Please try again.");
  await expect
    .element(page.getByRole("link", { name: "Result 1", exact: true }))
    .toBeVisible();
  await more.click();
  await expect
    .element(page.getByRole("link", { name: "Last", exact: true }))
    .toHaveFocus();
  await expect.element(more).not.toBeInTheDocument();
});
