import { defineHastPlugin } from "satteri";

/** Separates diagram source from code highlighting before Expressive Code runs. */
export function diagramsPlugin() {
  return defineHastPlugin({
    name: "mermaid-source",
    element: {
      filter: ["pre"],
      visit(node, context) {
        const code = node.children[0];
        if (
          code?.type !== "element" ||
          code.tagName !== "code" ||
          ![code.properties["className"]].flat().includes("language-mermaid")
        )
          return;
        context.replaceNode(node, {
          ...node,
          properties: {
            ...node.properties,
            dataMermaid: true,
            dataPagefindIgnore: true,
          },
          children: code.children,
        });
      },
    },
  });
}
