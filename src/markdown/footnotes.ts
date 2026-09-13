import { defineHastPlugin, type PluginFactoryContext } from "satteri";
import { messages } from "../i18n/messages";

export function footnotesPlugin(document: PluginFactoryContext) {
  if (!document.fileURL?.pathname.includes("/zh-hans/")) return;
  return defineHastPlugin({
    name: "localized-footnotes",
    element: {
      filter: ["h2", "a"],
      visit(node, context) {
        if (node.properties["id"] === "footnote-label") {
          context.replaceNode(node, {
            ...node,
            children: [{ type: "text", value: messages["zh-hans"].footnotes }],
          });
        }
        if ("dataFootnoteBackref" in node.properties) {
          context.setProperty(
            node,
            "ariaLabel",
            String(node.properties["ariaLabel"]).replace(
              messages.en.footnoteBack,
              messages["zh-hans"].footnoteBack,
            ),
          );
        }
      },
    },
  });
}
