/**
 * Resolves equation references and tracks the current section.
 *
 * @returns Removes listeners, clears section markers, and ignores pending reference processing.
 */
export function mountReading() {
  const content = document.querySelector("main");
  if (!content) return () => {};
  const controller = new AbortController();
  if (content.querySelector(".tml-ref")) {
    void import("temml/dist/temmlPostProcess.js")
      .then(({ default: temml }) => {
        if (!controller.signal.aborted) temml.postProcess(content);
      })
      .catch(() => {
        // Formulas remain readable if reference processing fails.
      });
  }
  const contents = content.querySelector<HTMLDetailsElement>("details.toc");
  if (contents)
    contents.open = getComputedStyle(contents).position === "sticky";
  const sections = content
    .querySelectorAll<HTMLAnchorElement>(".toc a")
    .values()
    .flatMap((link) => {
      const heading = document.getElementById(
        decodeURIComponent(link.hash.slice(1)),
      );
      return heading ? [{ link, heading }] : [];
    })
    .toArray();
  if (sections.length) {
    let active: HTMLAnchorElement | undefined;
    const update = () => {
      const current = (
        sections.findLast(
          ({ heading }) =>
            heading.getBoundingClientRect().top <= innerHeight * 0.3,
        ) ?? sections[0]!
      ).link;
      if (current === active) return;
      active?.removeAttribute("aria-current");
      current.setAttribute("aria-current", "location");
      active = current;
    };
    document.addEventListener("scroll", update, { signal: controller.signal });
    window.addEventListener("resize", update, { signal: controller.signal });
    update();
  }
  return () => {
    controller.abort();
    sections.forEach(({ link }) => link.removeAttribute("aria-current"));
  };
}
