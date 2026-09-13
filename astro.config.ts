import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { locales } from "./src/i18n/locales.ts";
import { site } from "./src/lib/site.ts";
import { footnotesPlugin } from "./src/markdown/footnotes.ts";
import { mathPlugin } from "./src/markdown/math.ts";

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  integrations: [mdx(), sitemap()],
  i18n: {
    locales: [...locales],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: true },
  },
  markdown: {
    syntaxHighlight: { excludeLangs: ["math", "mermaid"] },
    processor: satteri({
      features: { math: true },
      mdastPlugins: [mathPlugin],
      hastPlugins: [footnotesPlugin],
    }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
});
