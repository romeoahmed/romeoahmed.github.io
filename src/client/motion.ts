import { gsap } from "gsap";

/**
 * Adds link and dialog feedback, with text reveals on first load only.
 *
 * @returns Removes listeners and reverts animation styles.
 */
export function mountMotion(firstPage: boolean) {
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const controller = new AbortController();
    for (const [selector, arrowSelector, axis, distance] of [
      [".hero-link", ".text-link-arrow", "y", 3],
      [".back-link", "svg", "x", -3],
      [".post-summary :is(h2, h3) a", "svg", "x", 5],
    ] as const) {
      document.querySelectorAll<HTMLElement>(selector).forEach((link) => {
        const arrow = link.querySelector(arrowSelector);
        if (!arrow) return;
        const move = gsap.quickTo(arrow, axis, {
          duration: 0.24,
          ease: "power2.out",
        });
        let hovered = false;
        const update = () => {
          move(hovered || link.matches(":focus-visible") ? distance : 0);
        };
        link.addEventListener(
          "pointerenter",
          (event) => {
            hovered = event.pointerType === "mouse";
            update();
          },
          { signal: controller.signal },
        );
        link.addEventListener(
          "pointerleave",
          () => {
            hovered = false;
            update();
          },
          { signal: controller.signal },
        );
        link.addEventListener("focus", update, { signal: controller.signal });
        link.addEventListener("blur", update, { signal: controller.signal });
      });
    }
    document
      .querySelectorAll<HTMLDialogElement>("dialog.search-dialog")
      .forEach((dialog) => {
        const entrance = gsap.fromTo(
          dialog,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.32,
            ease: "power3.out",
            paused: true,
            immediateRender: false,
            clearProps: "transform,opacity",
          },
        );
        dialog.addEventListener(
          "toggle",
          () => {
            if (dialog.open) entrance.restart();
            else entrance.pause().revert({ kill: false });
          },
          { signal: controller.signal },
        );
      });
    if (!firstPage) return () => controller.abort();
    const visible = document
      .querySelectorAll<HTMLElement>("[data-reveal]")
      .values()
      .filter((element) => {
        const { top, bottom } = element.getBoundingClientRect();
        return bottom > 0 && top < innerHeight;
      })
      .toArray();
    if (visible.length)
      gsap.from(visible, {
        y: 8,
        opacity: 0.88,
        duration: 0.48,
        stagger: { amount: Math.min(0.18, (visible.length - 1) * 0.045) },
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    return () => controller.abort();
  });
  return () => media.revert();
}
