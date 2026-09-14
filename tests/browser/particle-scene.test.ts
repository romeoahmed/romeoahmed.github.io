import { afterEach, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { mountParticleScene } from "../../src/components/particles/scene";
import "../../src/styles/global.css";
import "../../src/components/particles/particles.css";

let dispose = () => {};
const originalTheme = document.documentElement.dataset["theme"];
afterEach(async () => {
  dispose();
  document.body.replaceChildren();
  window.scrollTo(0, 0);
  vi.restoreAllMocks();
  if (originalTheme) document.documentElement.dataset["theme"] = originalTheme;
  else delete document.documentElement.dataset["theme"];
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
});
function fixture() {
  document.body.innerHTML =
    '<div class="spatial-scene" data-spatial-scene style="width:320px;height:320px"><svg class="static-scene"></svg><div class="scene-stage"></div></div>';
  return document.querySelector<HTMLElement>("[data-spatial-scene]")!;
}

test("the particle scene settles, responds to pointers, and stops for reduced motion", async ({
  skip,
}) => {
  if (!(await navigator.gpu?.requestAdapter()))
    skip("WebGPU adapter unavailable");
  const submit = vi.spyOn(GPUQueue.prototype, "submit");
  const destroy = vi.spyOn(GPUDevice.prototype, "destroy");
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  const host = fixture();
  dispose = await mountParticleScene(host, new AbortController().signal);
  await expect.poll(() => host.hasAttribute("data-scene-ready")).toBe(true);
  const frames = () => submit.mock.calls.length;
  // Observe a settled interval without depending on the entrance duration.
  const settled = async () => {
    let lastFrame = frames();
    let quietSince = performance.now();
    await expect
      .poll(
        () => {
          if (frames() !== lastFrame) {
            lastFrame = frames();
            quietSince = performance.now();
          }
          return performance.now() - quietSince;
        },
        { timeout: 3000 },
      )
      .toBeGreaterThan(150);
  };
  await settled();
  const resting = frames();
  await userEvent.hover(host);
  await expect.poll(frames).toBeGreaterThan(resting);
  const spacer = document.createElement("div");
  spacer.style.height = "150vh";
  document.body.append(spacer);
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const initialScroll = scrollY;
  await cdp().send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 160, y: 240 }],
  });
  await cdp().send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 160, y: 200 }],
  });
  await cdp().send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 160, y: 160 }],
  });
  await cdp().send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => scrollY).toBeGreaterThan(initialScroll);
  spacer.remove();

  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await settled();
  const reduced = frames();
  await cdp().send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await userEvent.hover(host, { position: { x: 80, y: 90 } });
  await settled();
  expect(frames()).toBe(reduced);
  document.documentElement.dataset["theme"] =
    document.documentElement.dataset["theme"] === "dark" ? "light" : "dark";
  await expect.poll(frames).toBeGreaterThan(reduced);

  dispose();
  expect(host.querySelector("canvas")).toBeNull();
  expect(host.hasAttribute("data-scene-ready")).toBe(false);
  expect(destroy).toHaveBeenCalled();
});

test.for(["unavailable", "rejected"])(
  "%s GPU initialization preserves the fallback",
  async (failure) => {
    const host = fixture();
    if (navigator.gpu) {
      const request = vi.spyOn(navigator.gpu, "requestAdapter");
      if (failure === "unavailable") request.mockResolvedValueOnce(null);
      else request.mockRejectedValueOnce(new Error("Adapter unavailable"));
    }
    dispose = await mountParticleScene(host, new AbortController().signal);
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.hasAttribute("data-scene-ready")).toBe(false);
    await expect.element(host.querySelector("svg")!).toBeVisible();
  },
);

test("navigation during GPU initialization releases the late device", async ({
  skip,
}) => {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) skip("WebGPU adapter unavailable");
  const pending = Promise.withResolvers<GPUAdapter | null>();
  const request = vi
    .spyOn(navigator.gpu, "requestAdapter")
    .mockReturnValueOnce(pending.promise);
  const destroy = vi.spyOn(GPUDevice.prototype, "destroy");
  const host = fixture();
  const controller = new AbortController();
  const mounting = mountParticleScene(host, controller.signal);
  await expect.poll(() => request).toHaveBeenCalled();
  controller.abort();
  expect(host.querySelector("canvas")).toBeNull();
  pending.resolve(adapter);
  dispose = await mounting;
  expect(host.querySelector("canvas")).toBeNull();
  expect(host.hasAttribute("data-scene-ready")).toBe(false);
  expect(destroy).toHaveBeenCalled();
});
