import mermaid from "mermaid";
import { cssColorToHex } from "../lib/color";

// Serialize configuration and rendering so pages cannot overwrite each other's theme.
let pending = Promise.resolve();

/**
 * Renders Mermaid fences and refreshes their SVG when the theme changes.
 *
 * @returns Cleanup that restores source blocks and prevents late SVG insertion.
 */
export function mountDiagrams() {
  const entries = Array.from(
    document.querySelectorAll<HTMLElement>("pre > code.language-mermaid"),
    (code) => ({
      source: code.textContent,
      pre: code.parentElement!,
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
            // Replace only after rendering succeeds, avoiding a blank frame on theme changes.
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
