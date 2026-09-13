import { defineMdastPlugin, type PluginFactoryContext } from "satteri";
import temml from "temml";

/** Creates a MathML transform whose TeX macros are scoped to one document. */
export function mathPlugin(document: PluginFactoryContext) {
  const macros = {};
  const convert = (source: string, displayMode: boolean) => {
    try {
      const html = temml.renderToString(source, {
        displayMode,
        macros,
        throwOnError: true,
      });
      return {
        raw: displayMode ? `<div class="math-display">${html}</div>` : html,
        mdxExpressions: false,
      };
    } catch (cause) {
      throw new Error(
        `Invalid mathematics in ${document.fileURL?.pathname ?? "Markdown"}: ${source}`,
        { cause },
      );
    }
  };
  return defineMdastPlugin({
    name: "temml-mathml",
    math: (node) => convert(node.value, true),
    inlineMath: (node) => convert(node.value, false),
  });
}
