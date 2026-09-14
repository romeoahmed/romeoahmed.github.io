import mermaid from "mermaid";
import { cssColorToHex } from "./color";

// Mermaid configuration is global; serialize it with rendering across page lifetimes.
let pending = Promise.resolve();

/**
 * Renders Mermaid fences using the current theme.
 *
 * @returns Restores source blocks and prevents pending renders from inserting SVG.
 */
export function mountDiagrams() {
  const entries = Array.from(
    document.querySelectorAll<HTMLElement>("pre[data-mermaid]"),
    (pre) => ({
      source: pre.textContent,
      pre,
      diagram: document.createElement("div"),
    }),
  );
  const renderer = document.createElement("div");
  renderer.className = "diagram-renderer";
  renderer.inert = true;
  const restore = () =>
    entries.forEach(({ pre, diagram }) => {
      pre.hidden = false;
      diagram.remove();
    });
  let disposed = false;
  let revision = 0;
  const render = () => {
    const current = ++revision;
    const stale = () => disposed || current !== revision;
    pending = pending
      .then(async () => {
        if (stale()) return;
        await document.fonts.ready;
        if (stale()) return;
        const css = getComputedStyle(document.documentElement);
        const color = (name: string) =>
          cssColorToHex(css.getPropertyValue(`--color-${name}`));
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "base",
          look: "classic",
          flowchart: { useMaxWidth: false },
          fontFamily: css.getPropertyValue("--font-prose").trim(),
          themeVariables: {
            darkMode: document.documentElement.dataset["theme"] === "dark",
            primaryColor: color("surface"),
            primaryTextColor: color("text"),
            primaryBorderColor: color("accent"),
            lineColor: color("muted"),
            secondaryColor: color("page"),
            tertiaryColor: color("surface"),
            background: color("page"),
            textColor: color("text"),
          },
        });
        document.body.append(renderer);
        for (const { source, pre, diagram } of entries) {
          if (stale()) return;
          try {
            const { svg, bindFunctions } = await mermaid.render(
              `diagram-${crypto.randomUUID()}`,
              source,
              renderer,
            );
            if (stale()) return;
            // Keep the previous diagram visible until its replacement is ready.
            diagram.className = "diagram";
            diagram.innerHTML = svg;
            pre.after(diagram);
            bindFunctions?.(diagram);
            pre.hidden = true;
          } catch {
            if (stale()) return;
            diagram.remove();
            pre.hidden = false;
          }
        }
      })
      .catch(() => {
        restore();
      })
      .finally(() => renderer.remove());
  };
  const theme = new MutationObserver(render);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  render();
  return () => {
    disposed = true;
    theme.disconnect();
    renderer.remove();
    restore();
  };
}
