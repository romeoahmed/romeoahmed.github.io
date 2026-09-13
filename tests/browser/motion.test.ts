import { beforeEach, expect, test as baseTest } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { gsap } from "gsap";
import { mountMotion } from "../../src/client/motion";
import "../../src/styles/global.css";

beforeEach(async () => {
  await cdp().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  return async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [] });
    document.body.replaceChildren();
  };
});

const test = baseTest.extend("search", ({}, { onCleanup }) => {
  document.body.innerHTML = `
    <button commandfor="search" command="show-modal">Search</button>
    <dialog id="search" class="search-dialog" aria-label="Search">
      <input aria-label="Search" autofocus>
    </dialog>
  `;
  const dispose = mountMotion(false);
  onCleanup(dispose);
  return {
    dialog: document.querySelector("dialog")!,
    trigger: page.getByRole("button", { name: "Search" }),
    input: page.getByRole("textbox", { name: "Search" }),
    dispose,
  };
});

const linkTest = test.extend("link", async ({}, { onCleanup }) => {
  document.body.innerHTML = `
    <a class="text-link hero-link" href="#writing">Writing <span class="text-link-arrow">↓</span></a>
    <button>Next</button>`;
  const next = page.getByRole("button", { name: "Next" });
  // Keep pointer hover independent of keyboard focus.
  await next.hover();
  const arrow = document.querySelector(".text-link-arrow")!;
  const top = () => arrow.getBoundingClientRect().top;
  const resting = top();
  onCleanup(mountMotion(false));
  return {
    arrow,
    top,
    resting,
    next,
    target: page.getByRole("link", { name: /Writing/ }),
  };
});

linkTest(
  "keyboard feedback returns to rest when focus leaves or motion is reduced",
  async ({ link }) => {
    const { top, resting, next, target } = link;
    await userEvent.keyboard("{Tab}");
    await expect.element(target).toHaveFocus();
    await expect.poll(top).toBeGreaterThan(resting + 1);
    await userEvent.keyboard("{Tab}");
    await expect.element(next).toHaveFocus();
    await expect.poll(top).toBeCloseTo(resting, 0);
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect.poll(top).toBeGreaterThan(resting + 1);
    await cdp().send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await expect.poll(top).toBeCloseTo(resting, 0);
  },
);

test("search remains visible and focused after closing and reopening", async ({
  search,
}) => {
  await search.trigger.click();
  await expect.element(search.input).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(search.dialog).not.toBeVisible();
  await expect.element(search.trigger).toHaveFocus();
  await search.trigger.click();
  await expect.element(search.input).toHaveFocus();
  await expect.poll(() => getComputedStyle(search.dialog).opacity).toBe("1");
  await expect
    .poll(() => getComputedStyle(search.dialog).transform)
    .toBe("none");
});

test.for(["reduced motion", "disposal"])(
  "%s releases search animation styles without disrupting focus",
  async (reason, { search }) => {
    await search.trigger.click();
    if (reason === "disposal") search.dispose();
    else
      await cdp().send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    await expect
      .poll(() => getComputedStyle(search.dialog).transform)
      .toBe("none");
    await expect.poll(() => getComputedStyle(search.dialog).opacity).toBe("1");
    await expect.element(search.dialog).toBeVisible();
    await expect.element(search.input).toHaveFocus();
  },
);

linkTest(
  "pointer exit preserves keyboard feedback until focus also leaves",
  async ({ link }) => {
    const { top, resting, next, target, arrow } = link;
    await target.hover();
    await expect.poll(top).toBeGreaterThan(resting + 1);
    await userEvent.keyboard("{Tab}");
    await expect.element(target).toHaveFocus();
    await next.hover();
    await expect.poll(() => gsap.isTweening(arrow)).toBe(false);
    expect(top()).toBeGreaterThan(resting + 1);
    await userEvent.keyboard("{Tab}");
    await expect.element(next).toHaveFocus();
    await expect.poll(top).toBeCloseTo(resting, 0);
  },
);
