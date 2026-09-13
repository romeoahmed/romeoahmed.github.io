import referenceScriptUrl from "temml/dist/temmlPostProcess.js?url";

let referenceScript: Promise<void> | undefined;

function loadReferences() {
  referenceScript ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = referenceScriptUrl;
    script.onload = () => resolve();
    script.onerror = () => {
      referenceScript = undefined;
      script.remove();
      reject(new Error("Reference script failed to load"));
    };
    document.head.append(script);
  });
  return referenceScript;
}
/**
 * Resolves equation references and tracks the current section.
 *
 * @returns Stops observation, clears section markers, and ignores pending reference processing.
 */
export function mountReading() {
  const content = document.querySelector<HTMLElement>("[data-reading]");
  if (!content) return () => {};
  const controller = new AbortController();
  let observer: IntersectionObserver | undefined;
  if (content.dataset["references"] === "true") {
    void loadReferences()
      .then(() => {
        if (!controller.signal.aborted) window.temml?.postProcess(content);
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
    const update = () => {
      const index = Math.max(
        0,
        sections.findLastIndex(
          ({ heading }) =>
            heading.getBoundingClientRect().top <= innerHeight * 0.3,
        ),
      );
      sections.forEach(({ link }, i) => {
        if (i === index) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
    observer = new IntersectionObserver(update, {
      rootMargin: "0px 0px -70% 0px",
    });
    for (const { heading } of sections) observer.observe(heading);
    update();
  }
  return () => {
    controller.abort();
    observer?.disconnect();
    sections.forEach(({ link }) => link.removeAttribute("aria-current"));
  };
}
