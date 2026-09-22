import { cssColorToHex } from "./color";

// Mermaid configuration is global; serialize it with rendering across page lifetimes.
let pending = Promise.resolve();

/**
 * Loads Mermaid near the viewport and keeps rendered diagrams in the current theme.
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
      active: false,
      revision: 0,
    }),
  );
  if (!entries.length) return () => {};
  const renderer = document.createElement("div");
  renderer.className = "diagram-renderer";
  renderer.inert = true;
  const restore = () =>
    entries.forEach(({ pre, diagram }) => {
      pre.hidden = false;
      diagram.remove();
    });
  let disposed = false;
  const render = (batch: typeof entries) => {
    const work = batch.map((entry) => ({ entry, revision: ++entry.revision }));
    const stale = ({ entry, revision }: (typeof work)[number]) =>
      disposed || entry.revision !== revision;
    pending = pending
      .then(async () => {
        if (work.every(stale)) return;
        const [{ default: mermaid }] = await Promise.all([
          import("mermaid"),
          document.fonts.ready,
        ]);
        if (work.every(stale)) return;
        const css = getComputedStyle(document.documentElement);
        const color = (name: string) =>
          cssColorToHex(css.getPropertyValue(`--color-${name}`));
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "base",
          look: "classic",
          layout: "dagre",
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
            edgeLabelBackground: color("page"),
          },
        });
        document.body.append(renderer);
        for (const item of work) {
          if (stale(item)) continue;
          const { source, pre, diagram } = item.entry;
          try {
            const { svg, bindFunctions } = await mermaid.render(
              `diagram-${crypto.randomUUID()}`,
              source,
              renderer,
            );
            if (stale(item)) continue;
            // Keep the previous diagram visible until its replacement is ready.
            diagram.className = "diagram";
            diagram.innerHTML = svg;
            pre.after(diagram);
            bindFunctions?.(diagram);
            pre.hidden = true;
          } catch {
            if (stale(item)) continue;
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
  const visibility = new IntersectionObserver(
    (changes) => {
      const batch = entries.filter((entry) =>
        changes.some(
          ({ target, isIntersecting }) =>
            target === entry.pre && isIntersecting,
        ),
      );
      for (const entry of batch) {
        entry.active = true;
        visibility.unobserve(entry.pre);
      }
      if (batch.length) render(batch);
    },
    { rootMargin: "300px" },
  );
  entries.forEach(({ pre }) => visibility.observe(pre));
  const theme = new MutationObserver(() =>
    render(entries.filter(({ active }) => active)),
  );
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    disposed = true;
    visibility.disconnect();
    theme.disconnect();
    renderer.remove();
    restore();
  };
}
