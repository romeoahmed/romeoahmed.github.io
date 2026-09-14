import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { mountDiagrams } from "../../src/client/diagrams";
import "../../src/styles/global.css";

const source =
  "flowchart LR\naccTitle: Publishing\naccDescr: A note becomes an essay.\nA[Note] --> B[Essay]";

beforeEach(({ onTestFinished }) => {
  onTestFinished(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-theme");
    document.body.replaceChildren();
  });
});

test("diagrams expose an accessible name, follow the palette, and remount without duplicates", async ({
  onTestFinished,
}) => {
  document.documentElement.dataset["theme"] = "light";
  document.body.innerHTML = '<div class="prose"><pre data-mermaid></pre></div>';
  document.querySelector("pre")!.textContent = source;
  const pre = document.querySelector("pre")!;
  let dispose = mountDiagrams();
  onTestFinished(() => dispose());
  const diagram = page.getByRole("document", { name: "Publishing" });
  await expect
    .element(diagram)
    .toHaveAccessibleDescription("A note becomes an essay.");
  await expect.element(pre).not.toBeVisible();
  const fill = () => {
    const shape = document.querySelector(".diagram svg rect");
    return shape ? getComputedStyle(shape).fill : undefined;
  };
  const light = fill();
  expect(light).toBeDefined();
  let blank = false;
  const observer = new MutationObserver(() => {
    if (pre.hidden && !document.querySelector(".diagram svg")) blank = true;
  });
  observer.observe(pre.parentElement!, { childList: true, subtree: true });
  onTestFinished(() => observer.disconnect());
  document.documentElement.dataset["theme"] = "dark";
  await expect.element(diagram).toBeVisible();
  await expect
    .poll(fill)
    .toSatisfy(
      (color: string | undefined) => color !== undefined && color !== light,
    );
  observer.disconnect();
  expect(blank).toBe(false);
  dispose();
  await expect.element(pre).toBeVisible();
  expect(pre.textContent).toBe(source);
  dispose = mountDiagrams();
  await expect.element(diagram).toBeVisible();
  expect(document.querySelectorAll(".diagram svg")).toHaveLength(1);
});

test("a disposed page cannot publish a diagram after fonts finish loading", async ({
  onTestFinished,
}) => {
  document.body.innerHTML = "<pre data-mermaid></pre>";
  const pre = document.querySelector("pre")!;
  pre.textContent = source;
  const fonts = Promise.withResolvers<FontFaceSet>();
  const ready = vi
    .spyOn(document.fonts, "ready", "get")
    .mockReturnValue(fonts.promise);
  const dispose = mountDiagrams();
  onTestFinished(dispose);
  await expect.poll(() => ready.mock.calls.length).toBeGreaterThan(0);
  dispose();
  ready.mockRestore();
  fonts.resolve(document.fonts);

  // A new mount must still render after the previous queued work is disposed.
  const next = document.createElement("pre");
  next.dataset["mermaid"] = "";
  next.textContent = source;
  document.body.append(next);
  pre.removeAttribute("data-mermaid");
  onTestFinished(mountDiagrams());
  await expect
    .element(page.getByRole("document", { name: "Publishing" }))
    .toBeVisible();
  await expect.element(pre).toBeVisible();
  expect(document.querySelectorAll(".diagram svg")).toHaveLength(1);
});

test("an invalid diagram keeps its source readable without blocking the next diagram", async ({
  onTestFinished,
}) => {
  document.body.innerHTML =
    "<pre data-mermaid>not-a-diagram</pre><pre data-mermaid></pre>";
  const [invalid, valid] = document.querySelectorAll("pre");
  valid!.textContent = source;
  onTestFinished(mountDiagrams());
  await expect
    .element(page.getByRole("document", { name: "Publishing" }))
    .toBeVisible();
  await expect.element(invalid!).toBeVisible();
  expect(invalid!.textContent).toBe("not-a-diagram");
});
