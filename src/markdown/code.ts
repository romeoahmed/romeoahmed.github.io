import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { defineEcConfig, pluginFramesTexts } from "astro-expressive-code";
import { messages } from "../i18n/messages";
import { locales, localeInfo } from "../i18n/locales";

for (const locale of locales) {
  const t = messages[locale];
  pluginFramesTexts.addLocale(localeInfo[locale].tag, {
    copyButtonTooltip: t.codeCopy,
    copyButtonCopied: t.codeCopied,
    terminalWindowFallbackTitle: t.codeTerminal,
  });
}

export const codeOptions = defineEcConfig({
  useDarkModeMediaQuery: false,
  themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
  cascadeLayer: "vendor",
  getBlockLocale: ({ file }) =>
    file.path.includes("/zh-hans/") ? "zh-Hans" : "en",
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
