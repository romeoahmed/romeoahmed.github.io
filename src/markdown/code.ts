import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import expressiveCode, { pluginFramesTexts } from "satteri-expressive-code";
import { messages } from "../i18n/messages";
import { locales, localeInfo } from "../i18n/locales";
import { defineHastPlugin } from "satteri";

for (const locale of locales) {
  const t = messages[locale];
  pluginFramesTexts.addLocale(localeInfo[locale].tag, {
    copyButtonTooltip: t.codeCopy,
    copyButtonCopied: t.codeCopied,
    terminalWindowFallbackTitle: t.codeTerminal,
  });
}

const createPlugin = expressiveCode({
  useDarkModeMediaQuery: false,
  themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
  cascadeLayer: "vendor",
  getBlockLocale: ({ document }) =>
    document.filename.includes("/zh-hans/") ? "zh-Hans" : "en",
  plugins: [pluginLineNumbers()],
  styleOverrides: {
    borderRadius: "3px",
    borderColor: "var(--color-rule)",
    codeFontFamily: "var(--font-mono)",
    codeFontSize: "0.875rem",
    uiFontFamily: "var(--font-prose)",
    codeBackground: "var(--color-surface)",
    lineNumbers: {
      foreground: "var(--color-muted)",
      highlightForeground: "var(--color-text)",
    },
    textMarkers: {
      markBackground:
        "color-mix(in oklch, var(--color-accent) 10%, transparent)",
      markBorderColor: "var(--color-accent)",
    },
    frames: {
      frameBoxShadowCssValue: "none",
      editorActiveTabIndicatorTopColor: "var(--color-accent)",
      editorTabBarBackground: "var(--color-page)",
      editorActiveTabBackground: "var(--color-surface)",
      editorActiveTabForeground: "var(--color-text)",
      editorTabBarBorderColor: "var(--color-rule)",
      editorTabBarBorderBottomColor: "var(--color-rule)",
    },
  },
});

/** Highlights code while preserving Mermaid source for browser rendering. */
export function codePlugin() {
  const plugin = createPlugin();
  const visitor = plugin.element;
  if (!visitor || Array.isArray(visitor))
    throw new Error("Expected Expressive Code's element visitor");
  return defineHastPlugin({
    ...plugin,
    element: {
      ...visitor,
      visit(node, context) {
        const code = node.children[0];
        if (
          code?.type === "element" &&
          code.properties["className"]?.toString().includes("language-mermaid")
        ) {
          context.setProperty(node, "dataPagefindIgnore", true);
          return;
        }
        return visitor.visit(node, context);
      },
    },
  });
}
