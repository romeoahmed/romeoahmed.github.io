import { beforeEach, expect, test } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { mountEasingExperiment } from "../../src/content/embeds/easing/motion";
import "../../src/styles/global.css";
import "../../src/content/embeds/easing/easing.css";

beforeEach(async ({ onTestFinished }) => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  onTestFinished(async () => {
    document.body.replaceChildren();
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  });
  document.body.innerHTML = `<div class="experiment">
    <input disabled type="range" min="0" max="100" value="50" aria-label="Time">
    <output aria-label="Position">0.875</output>
    <div class="experiment-track"><div class="experiment-position" data-linear><span class="experiment-marker"></span></div></div>
    <div class="experiment-track"><div class="experiment-position" data-eased><span class="experiment-marker"></span></div></div>
    <button hidden>Play both</button>
  </div>`;
});

test("the markers play and scrub across the full track without overshooting", async ({
  onTestFinished,
}) => {
  const host = document.querySelector<HTMLElement>(".experiment")!;
  const dispose = mountEasingExperiment(host);
  onTestFinished(dispose);
  const positions = () =>
    [...host.querySelectorAll(".experiment-track")].map((track) => {
      const bounds = track.getBoundingClientRect();
      const marker = track
        .querySelector(".experiment-marker")!
        .getBoundingClientRect();
      return (marker.left - bounds.left) / (bounds.width - marker.width);
    });
  const result = page.getByRole("status", { name: "Position" });
  await expect.element(result).toHaveTextContent("0.875");
  expect(positions()[0]).toBeCloseTo(0.5, 3);
  expect(positions()[1]).toBeCloseTo(0.875, 3);
  await page.getByRole("button", { name: "Play both" }).click();
  await expect.element(result).toHaveTextContent("1.000");
  await expect.poll(() => positions()[0]).toBeCloseTo(1, 3);
  expect(positions()[1]).toBeCloseTo(1, 3);
  await page.getByRole("slider", { name: "Time" }).click();
  await userEvent.keyboard("{Home}");
  await expect.element(result).toHaveTextContent("0.000");
  positions().forEach((position) => expect(position).toBeCloseTo(0, 3));
  await userEvent.keyboard("{End}");
  await expect.element(result).toHaveTextContent("1.000");
  positions().forEach((position) => expect(position).toBeCloseTo(1, 3));
  dispose();
  await expect.element(page.getByRole("slider")).toBeDisabled();
});

test("reduced motion keeps keyboard inspection available without playback", async ({
  onTestFinished,
}) => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  onTestFinished(
    mountEasingExperiment(document.querySelector<HTMLElement>(".experiment")!),
  );
  await expect
    .element(page.getByRole("button", { includeHidden: true }))
    .not.toBeVisible();
  const result = page.getByRole("status", { name: "Position" });
  await page.getByRole("slider", { name: "Time" }).click();
  await userEvent.keyboard("{Home}");
  await expect.element(result).toHaveTextContent("0.000");
  await userEvent.keyboard("{End}");
  await expect.element(result).toHaveTextContent("1.000");
});
