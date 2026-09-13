import { expect, test, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { applyTheme, mountTheme } from "../../src/client/theme";

test("theme choice restores, cycles, and survives unavailable storage and page changes", async ({
  onTestFinished,
}) => {
  localStorage.setItem("theme", "dark");
  document.body.innerHTML = `<button hidden data-theme-toggle aria-label="配色主题"
    data-label="配色主题" data-system="跟随系统" data-light="浅色" data-dark="深色">
    <span data-theme-label></span>
  </button>`;
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
  await expect.element(button).toHaveAccessibleName("配色主题: 深色");
  expect(document.documentElement.dataset["theme"]).toBe("dark");
  await button.click();
  await expect.element(button).toHaveAccessibleName("配色主题: 跟随系统");
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
    await expect.element(button).toHaveAccessibleName("配色主题: 跟随系统");
  }
  await button.click();
  await expect.element(button).toHaveAccessibleName("配色主题: 浅色");
  expect(localStorage.getItem("theme")).toBe("light");
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "dark" }],
  });
  await expect.element(button).toHaveAccessibleName("配色主题: 浅色");
  expect(document.documentElement.dataset["theme"]).toBe("light");

  dispose();
  dispose = mountTheme();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage denied", "SecurityError");
  });
  await button.click();
  await expect.element(button).toHaveAccessibleName("配色主题: 深色");
  const incoming = document.implementation.createHTMLDocument();
  applyTheme(incoming);
  expect(incoming.documentElement.dataset["theme"]).toBe("dark");
});
