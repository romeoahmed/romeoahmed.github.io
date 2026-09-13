import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { mountReading } from "../../src/client/reading";

beforeEach(({ onTestFinished }) => {
  onTestFinished(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    window.scrollTo(0, 0);
  });
});

const codeBlocks = `<main data-reading data-copy="Copy code" data-copied="Code copied"
  data-copy-error="Try again" data-copy-failed="Copy failed">
  <article class="prose" aria-label="First note"><pre data-language="ts"><code>const x = 1;</code></pre></article>
  <article class="prose" aria-label="Second note"><pre><code>const y = 2;</code></pre></article>
</main><div data-feedback role="status"></div>`;

test("copy controls survive remounts and report success and failure per block", async ({
  onTestFinished,
}) => {
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  document.body.innerHTML = codeBlocks;
  let dispose = mountReading();
  onTestFinished(() => dispose());
  dispose();
  expect(document.querySelectorAll("button")).toHaveLength(0);
  dispose = mountReading();
  expect(document.querySelectorAll("button")).toHaveLength(2);

  await page
    .getByRole("article", { name: "First note" })
    .getByRole("button")
    .click();
  expect(write).toHaveBeenCalledExactlyOnceWith("const x = 1;");
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Code copied");
  write.mockRejectedValueOnce(new Error("Clipboard denied"));
  const second = page.getByRole("article", { name: "Second note" });
  await second.getByRole("button").click();
  expect(write).toHaveBeenLastCalledWith("const y = 2;");
  await expect
    .element(page.getByRole("status"))
    .toHaveTextContent("Copy failed");
  await expect
    .element(second.getByRole("button", { name: "Try again" }))
    .toBeVisible();
});

test("a late clipboard result cannot update the next page", async ({
  onTestFinished,
}) => {
  const pending = Promise.withResolvers<void>();
  vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(pending.promise);
  document.body.innerHTML = codeBlocks;
  const dispose = mountReading();
  onTestFinished(dispose);
  const feedback = document.querySelector("[data-feedback]")!;
  await page
    .getByRole("article", { name: "First note" })
    .getByRole("button")
    .click();
  dispose();
  document.body.innerHTML = '<div data-feedback role="status">Next page</div>';
  pending.resolve();
  await pending.promise;
  expect(feedback.textContent).toBe("");
  await expect.element(page.getByRole("status")).toHaveTextContent("Next page");
});

test("the table of contents follows reading in both directions and ignores missing targets", async ({
  onTestFinished,
}) => {
  document.body.innerHTML = `<main data-reading>
    <nav class="toc"><a href="#missing">Missing</a><a href="#one">One</a><a href="#two">Two</a></nav>
    <h2 id="one">One</h2><div style="height: 120vh"></div>
    <h2 id="two">Two</h2><div style="height: 120vh"></div>
  </main>`;
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
});
