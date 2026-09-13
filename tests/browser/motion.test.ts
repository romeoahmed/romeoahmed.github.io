import { expect, test } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { mountMotion } from "../../src/client/motion";
import "../../src/styles/global.css";

test("keyboard feedback returns to rest and responds to reduced motion", async ({
  onTestFinished,
}) => {
  onTestFinished(async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
    document.body.replaceChildren();
  });
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  document.body.innerHTML =
    '<a class="text-link hero-link" href="#writing">Writing <span class="text-link-arrow">↓</span></a><button>Next</button>';
  const arrow = document.querySelector(".text-link-arrow")!;
  const top = () => arrow.getBoundingClientRect().top;
  const resting = top();
  const dispose = mountMotion(false);
  onTestFinished(dispose);
  await userEvent.keyboard("{Tab}");
  await expect
    .element(page.getByRole("link", { name: /Writing/ }))
    .toHaveFocus();
  await expect.poll(top).toBeGreaterThan(resting + 1);
  await userEvent.keyboard("{Tab}");
  await expect.poll(top).toBeCloseTo(resting, 0);
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  await expect.poll(top).toBeGreaterThan(resting + 1);
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await expect.poll(top).toBeCloseTo(resting, 0);
  dispose();
  await userEvent.keyboard("{Tab}");
  expect(top()).toBeCloseTo(resting, 0);
});
