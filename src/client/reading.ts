import referenceScriptUrl from "temml/dist/temmlPostProcess.js?url";

let referenceScript: Promise<void> | undefined;

// Formulas are built as MathML; only equation references need client-side processing.
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
 * Enhances equation references, code copying, and the table of contents.
 *
 * @returns Cleanup that removes controls and observers and ignores late results.
 */
export function mountReading() {
  const content = document.querySelector<HTMLElement>("[data-reading]");
  if (!content) return () => {};
  const controller = new AbortController();
  const cleanup: Array<() => void> = [];
  if (content.dataset["references"] === "true") {
    void loadReferences()
      .then(() => {
        if (!controller.signal.aborted) window.temml?.postProcess(content);
      })
      .catch(() => {
        // Build-time MathML remains readable without reference processing.
      });
  }
  const copy = content.dataset["copy"];
  const feedback = document.querySelector("[data-feedback]");
  if (navigator.clipboard && copy) {
    content.querySelectorAll<HTMLPreElement>(".prose pre").forEach((pre) => {
      if (pre.querySelector(".language-mermaid")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "code-container";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = copy;
      pre.before(wrapper);
      wrapper.append(pre, button);
      button.addEventListener(
        "click",
        () => {
          void navigator.clipboard
            .writeText(
              pre.querySelector("code")?.textContent ?? pre.textContent,
            )
            .then(() => {
              if (controller.signal.aborted) return;
              if (feedback)
                feedback.textContent = content.dataset["copied"] ?? copy;
              button.textContent = content.dataset["copied"] ?? copy;
            })
            .catch(() => {
              if (controller.signal.aborted) return;
              button.textContent = content.dataset["copyError"] ?? copy;
              if (feedback)
                feedback.textContent = content.dataset["copyFailed"] ?? "";
            });
        },
        { signal: controller.signal },
      );
      cleanup.push(() => {
        wrapper.before(pre);
        wrapper.remove();
      });
    });
  }
  const sections = Array.from(
    content.querySelectorAll<HTMLAnchorElement>(".toc a"),
    (link) => {
      const heading = document.getElementById(
        decodeURIComponent(link.hash.slice(1)),
      );
      return heading ? { link, heading } : undefined;
    },
  ).filter((section) => section !== undefined);
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
    const observer = new IntersectionObserver(update, {
      rootMargin: "0px 0px -70% 0px",
    });
    sections.forEach(({ heading }) => observer.observe(heading));
    update();
    cleanup.push(() => {
      observer.disconnect();
      sections.forEach(({ link }) => link.removeAttribute("aria-current"));
    });
  }
  return () => {
    controller.abort();
    cleanup.forEach((dispose) => dispose());
  };
}
