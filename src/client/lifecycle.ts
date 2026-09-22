import { prepareTitleTransition } from "./title-transition";
import { applyTheme, mountTheme } from "../components/theme/theme";
import { mountReading } from "./reading";
import { mountSearch } from "../components/search/search";
import { mountAnchors } from "./anchors";
import { mountMotion } from "./motion";
import { mountDiagrams } from "./diagrams";

let disposePage = () => {};
let firstPage = true;
function mountPage() {
  disposePage();
  const controller = new AbortController();
  const cleanups = [
    mountTheme(),
    mountReading(),
    mountSearch(),
    mountAnchors(),
    mountMotion(firstPage),
    mountDiagrams(),
  ];
  firstPage = false;
  const host = document.querySelector<HTMLElement>("[data-spatial-scene]");
  if (host && navigator.gpu) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void import("../components/particles/scene")
          .then(({ mountParticleScene }) =>
            mountParticleScene(host, controller.signal),
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
