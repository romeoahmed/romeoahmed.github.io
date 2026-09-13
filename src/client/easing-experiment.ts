import { gsap } from "gsap";

/**
 * Shares one timeline between playback and manual inspection.
 *
 * @returns Reverts animation styles and disables the controls.
 */
export function mountEasingExperiment(host: HTMLElement) {
  const input = host.querySelector("input");
  const output = host.querySelector("output");
  const play = host.querySelector("button");
  if (!input || !output || !play) return () => {};
  const controller = new AbortController();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const eased = gsap.parseEase("power2.out");
  const context = gsap.context(() => {
    const timeline = gsap.timeline({
      paused: true,
      defaults: { duration: 0.72 },
      onUpdate: () => {
        const progress = timeline.progress();
        input.value = String(progress * 100);
        output.value = eased(progress).toFixed(3);
      },
    });
    timeline
      .fromTo(
        "[data-linear]",
        { x: 0, xPercent: 0 },
        { xPercent: 100, ease: "none" },
        0,
      )
      .fromTo(
        "[data-eased]",
        { x: 0, xPercent: 0 },
        { xPercent: 100, ease: "power2.out" },
        0,
      )
      .progress(input.valueAsNumber / 100);
    const preference = () => {
      play.hidden = reduced.matches;
      if (reduced.matches) timeline.pause();
    };
    input.addEventListener(
      "input",
      () => {
        timeline.pause().progress(input.valueAsNumber / 100);
      },
      { signal: controller.signal },
    );
    play.addEventListener(
      "click",
      () => {
        if (!reduced.matches) timeline.restart();
      },
      { signal: controller.signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) timeline.pause();
      },
      { signal: controller.signal },
    );
    reduced.addEventListener("change", preference, {
      signal: controller.signal,
    });
    preference();
    input.disabled = false;
  }, host);
  return () => {
    controller.abort();
    context.revert();
    input.disabled = true;
    play.hidden = true;
  };
}
