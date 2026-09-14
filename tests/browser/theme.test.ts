import { expect, test, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { applyTheme, mountTheme } from "../../src/components/theme/theme";
import html from "../../dist/zh-hans/index.html?raw";
import "../../src/styles/global.css";
import "../../src/components/theme/theme.css";

test("theme choice restores, cycles, and survives unavailable storage and page changes", async ({
  onTestFinished,
}) => {
  localStorage.setItem("theme", "dark");
  const built = new DOMParser().parseFromString(html, "text/html");
  document.body.replaceChildren(built.querySelector("[data-theme-toggle]")!);
  let dispose = mountTheme();
  onTestFinished(async () => {
    dispose();
    vi.restoreAllMocks();
    localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
    document.body.replaceChildren();
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  });
  const button = page.getByRole("button");
  const icon = (name: string) =>
    document.querySelector<HTMLElement>(`[data-theme-icon="${name}"]`)!;

  await expect.element(button).toHaveAccessibleName("外观: 深色");
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  await expect.element(icon("dark")).toBeVisible();
  await expect.element(icon("light")).not.toBeVisible();
  await button.click();
  await expect.element(icon("system")).toBeVisible();
  await expect.element(icon("dark")).not.toBeVisible();
  await expect.element(button).toHaveAccessibleName("外观: 跟随系统");
  expect(document.documentElement.dataset["theme"]).toBe(
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  for (const scheme of ["dark", "light"]) {
    await cdp().send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
    await expect
      .element(document.documentElement)
      .toHaveAttribute("data-theme", scheme);
    await expect.element(button).toHaveAccessibleName("外观: 跟随系统");
  }
  await button.click();
  await expect.element(button).toHaveAccessibleName("外观: 浅色");
  await expect.element(icon("light")).toBeVisible();
  await expect.element(icon("system")).not.toBeVisible();
  expect(localStorage.getItem("theme")).toBe("light");
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });
  await expect.element(button).toHaveAccessibleName("外观: 浅色");
  expect(document.documentElement.dataset["theme"]).toBe("light");

  dispose();
  dispose = mountTheme();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage denied", "SecurityError");
  });
  await button.click();
  await expect.element(button).toHaveAccessibleName("外观: 深色");
  const incoming = document.implementation.createHTMLDocument();
  applyTheme(incoming);
  expect(incoming.documentElement.dataset["theme"]).toBe("dark");
});
