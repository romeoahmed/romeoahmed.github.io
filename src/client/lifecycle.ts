import { prepareTitleTransition } from "./title-transition";
import { applyTheme, mountTheme } from "./theme";
import { mountReading } from "./reading";
import { mountSearch } from "./search";

let disposePage = () => {};
let firstPage = true;
function mountPage() {
  disposePage();
  const controller = new AbortController();
  const cleanups = [mountTheme(), mountReading(), mountSearch()];
  // Dispose mounts that finish after their page has left.
  const own = async (mount: () => (() => void) | Promise<() => void>) => {
    if (controller.signal.aborted) return;
    const cleanup = await mount();
    if (controller.signal.aborted) cleanup();
    else cleanups.push(cleanup);
  };
  void import("./anchors")
    .then(({ mountAnchors }) => own(mountAnchors))
    .catch(() => {
      // Fragment navigation still works through Astro.
    });
  const reveal = firstPage;
  void import("./motion")
    .then(({ mountMotion }) => own(() => mountMotion(reveal)))
    .catch(() => {
      // Content is already visible without motion.
    });
  firstPage = false;
  if (document.querySelector("code.language-mermaid")) {
    void import("./diagrams")
      .then(({ mountDiagrams }) => own(mountDiagrams))
      .catch(() => {
        // The diagram source remains readable.
      });
  }
  const host = document.querySelector<HTMLElement>("[data-spatial-scene]");
  if (host && navigator.gpu) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void import("./particle-scene")
          .then(({ mountParticleScene }) =>
            own(() => mountParticleScene(host, controller.signal)),
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
