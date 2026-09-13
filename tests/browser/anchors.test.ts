import { beforeEach, expect, test as baseTest, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { navigate } from "astro:transitions/client";
import { gsap } from "gsap";
import { mountAnchors } from "../../src/client/anchors";

vi.mock("astro:transitions/client", () => ({ navigate: vi.fn() }));

beforeEach(async () => {
  vi.mocked(navigate).mockReset().mockResolvedValue(undefined);
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  document.body.innerHTML = `<a href="#writing">Recent writing</a>
    <div style="height: 50vh"></div><h2 id="writing">Writing</h2>
    <div style="height: 150vh"></div>`;
  return async () => {
    document.body.replaceChildren();
    window.scrollTo(0, 0);
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  };
});

const test = baseTest.extend("dispose", { auto: true }, ({}, { onCleanup }) => {
  const dispose = mountAnchors();
  onCleanup(dispose);
  return dispose;
});

test("recent writing delegates navigation and scrolls with the agreed 520 ms curve", async () => {
  const pending = Promise.withResolvers<void>();
  vi.mocked(navigate).mockReturnValueOnce(pending.promise);
  const destination = document.getElementById("writing")!;
  const end = destination.getBoundingClientRect().top + scrollY;
  await page.getByRole("link", { name: "Recent writing" }).click();
  expect(navigate).toHaveBeenCalledWith(
    new URL("#writing", location.href).href,
    expect.objectContaining({ sourceElement: document.querySelector("a") }),
  );
  expect(scrollY).toBe(0);
  // Simulate Astro's immediate scroll before the enhancement restores the starting position.
  destination.scrollIntoView();
  pending.resolve();
  await pending.promise;
  expect(scrollY).toBe(0);
  const [tween] = gsap.getTweensOf(window);
  expect(tween).toBeDefined();
  // Duration is an explicit interaction contract; GSAP owns interpolation.
  expect(tween!.duration()).toBe(0.52);
  await expect.poll(() => scrollY).toBeCloseTo(end, 0);
});

test.for(["keyboard", "navigation", "disposal", "reduced motion"])(
  "%s cancels a pending scroll before navigation resolves",
  async (reason, { dispose }) => {
    const pending = Promise.withResolvers<void>();
    vi.mocked(navigate).mockReturnValueOnce(pending.promise);
    await page.getByRole("link", { name: "Recent writing" }).click();
    if (reason === "keyboard") await userEvent.keyboard("{Escape}");
    else if (reason === "navigation")
      document.dispatchEvent(new Event("astro:before-preparation"));
    else if (reason === "disposal") dispose();
    else
      await cdp().send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    pending.resolve();
    await new Promise(requestAnimationFrame);
    expect(gsap.getTweensOf(window)).toHaveLength(0);
    expect(scrollY).toBe(0);
  },
);

test("keyboard input stops an active scroll", async () => {
  await page.getByRole("link", { name: "Recent writing" }).click();
  await expect.poll(() => scrollY).toBeGreaterThan(0);
  await userEvent.keyboard("{Escape}");
  const stopped = scrollY;
  expect(gsap.isTweening(window)).toBe(false);
  await new Promise(requestAnimationFrame);
  expect(scrollY).toBe(stopped);
});

test("reduced motion and skip links keep native anchor behavior", async () => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const link = document.querySelector("a")!;
  // Keep native fragment navigation from changing Vitest's test URL.
  const activate = () => {
    let intercepted = true;
    document.addEventListener(
      "click",
      (event) => {
        intercepted = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(intercepted).toBe(false);
  };
  activate();
  expect(navigate).not.toHaveBeenCalled();
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  link.classList.add("skip-link");
  activate();
  expect(navigate).not.toHaveBeenCalled();
});
