import { gsap } from "gsap";

/**
 * Mounts link feedback and, on the first page, the entrance animation.
 *
 * @returns Cleanup that removes listeners and reverts GSAP styles.
 */
export function mountMotion(firstPage: boolean) {
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const controller = new AbortController();
    for (const [selector, arrowSelector, axis, distance] of [
      [".hero-link", ".text-link-arrow", "y", 3],
      [".back-link", "svg", "x", -3],
      [".post-summary h3 a", "svg", "x", 5],
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
