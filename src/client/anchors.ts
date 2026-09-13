import { navigate } from "astro:transitions/client";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/**
 * Animates same-page anchor activation while Astro records navigation history.
 *
 * @returns Cleanup that removes listeners and cancels pending scroll work.
 */
export function mountAnchors() {
  const controller = new AbortController();
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let tween: gsap.core.Tween | undefined;
  let request = 0;
  let destination: string | undefined;
  const stop = () => {
    request++;
    destination = undefined;
    tween?.kill();
  };
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        media.matches
      )
        return;
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self") ||
        link.classList.contains("skip-link")
      )
        return;
      const url = new URL(link.href);
      if (
        !url.hash ||
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        url.search !== location.search
      )
        return;
      const target = document.getElementById(
        decodeURIComponent(url.hash.slice(1)),
      );
      if (!target) return;
      event.preventDefault();
      stop();
      const current = request;
      destination = url.href;
      const start = scrollY;
      const inset =
        parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        ) || 0;
      const end = Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - innerHeight,
          start + target.getBoundingClientRect().top - inset,
        ),
      );
      // Undo Astro's immediate scroll before paint so GSAP starts at the click position.
      void navigate(url.href, { sourceElement: link }).then(() => {
        if (controller.signal.aborted || current !== request || media.matches)
          return;
        window.scrollTo({ top: start, behavior: "instant" });
        tween = gsap.to(window, {
          scrollTo: { y: end, autoKill: true },
          duration: Math.min(
            0.72,
            0.52 + Math.max(0, Math.abs(end - start) - innerHeight) / 20000,
          ),
          ease: "sine.inOut",
        });
      });
    },
    { capture: true, signal: controller.signal },
  );
  for (const event of ["wheel", "touchstart", "keydown"]) {
    window.addEventListener(event, stop, {
      passive: true,
      signal: controller.signal,
    });
  }
  window.addEventListener(
    "popstate",
    () => {
      // Ignore the popstate emitted by our own fragment navigation.
      if (location.href !== destination) stop();
    },
    { signal: controller.signal },
  );
  document.addEventListener("astro:before-preparation", stop, {
    signal: controller.signal,
  });
  media.addEventListener("change", stop, { signal: controller.signal });
  return () => {
    controller.abort();
    stop();
  };
}
