import { prepareTitleTransition } from "./titles";
import { applyTheme, mountTheme } from "./theme";
import { mountReading } from "./reading";

let disposePage = () => {};
let firstPage = true;
function mountPage() {
  disposePage();
  const controller = new AbortController();
  const cleanups = [mountTheme(), mountReading()];
  // An async mount may finish after a page swap; dispose its result immediately.
  const own = async (mount: () => (() => void) | Promise<() => void>) => {
    if (controller.signal.aborted) return;
    const cleanup = await mount();
    if (controller.signal.aborted) cleanup();
    else cleanups.push(cleanup);
  };
  void import("./anchors")
    .then(({ mountAnchors }) => own(mountAnchors))
    .catch(() => {
      // Astro still handles fragment navigation without scroll animation.
    });
  const reveal = firstPage;
  void import("./motion")
    .then(({ mountMotion }) => own(() => mountMotion(reveal)))
    .catch(() => {
      // Content is visible before motion loads.
    });
  firstPage = false;
  if (document.querySelector("code.language-mermaid")) {
    void import("./diagrams")
      .then(({ mountDiagrams }) => own(mountDiagrams))
      .catch(() => {
        // Keep the diagram source readable when the renderer cannot load.
      });
  }
  const host = document.querySelector<HTMLElement>("[data-spatial-scene]");
  if (host && navigator.gpu) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void import("./scene")
          .then(({ mountScene }) =>
            own(() => mountScene(host, controller.signal)),
          )
          .catch(() => {
            host.removeAttribute("data-scene-ready");
          });
      },
      { rootMargin: "100px" },
    );
    observer.observe(host);
    cleanups.push(() => observer.disconnect());
  }
  disposePage = () => {
    disposePage = () => {};
    controller.abort();
    cleanups.forEach((cleanup) => cleanup());
  };
}
let pairTitle: ReturnType<typeof prepareTitleTransition> | undefined;
document.addEventListener("astro:before-preparation", (event) => {
  pairTitle = prepareTitleTransition(event.to);
});
document.addEventListener("astro:before-swap", (event) => {
  pairTitle?.(event.newDocument);
  disposePage();
  applyTheme(event.newDocument);
});
document.addEventListener("astro:page-load", mountPage);
