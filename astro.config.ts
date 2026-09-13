import { defineConfig, fontProviders } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import { locales } from "./src/i18n/locales.ts";
import { site } from "./src/lib/site.ts";
import { footnotesPlugin } from "./src/markdown/footnotes.ts";
import { mathPlugin } from "./src/markdown/math.ts";
import { codePlugin } from "./src/markdown/code.ts";

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  integrations: [
    mdx(),
    sitemap(),
    pagefind({
      indexConfig: {
        excludeSelectors: [
          ".expressive-code .gutter",
          ".expressive-code .copy",
        ],
      },
    }),
  ],
  image: { layout: "constrained" },
  fonts: [
    {
      name: "STIX Two Math",
      cssVariable: "--font-math",
      provider: fontProviders.local(),
      fallbacks: ["math"],
      options: {
        variants: [
          {
            src: [
              "@fontsource/stix-two-math/files/stix-two-math-latin-400-normal.woff2",
            ],
          },
        ],
      },
    },
    {
      name: "Inter",
      cssVariable: "--font-prose",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: [
              "@fontsource-variable/inter/files/inter-latin-standard-normal.woff2",
            ],
          },
          {
            src: [
              "@fontsource-variable/inter/files/inter-latin-standard-italic.woff2",
            ],
          },
        ],
      },
      fallbacks: ["PingFang SC", "Microsoft YaHei", "sans-serif"],
    },
    {
      name: "Geist Mono Variable",
      cssVariable: "--font-mono",
      provider: fontProviders.npm({ remote: false }),
      weights: ["100 900"],
      styles: ["normal"],
      fallbacks: ["monospace"],
    },
  ],
  i18n: {
    locales: [...locales],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: true },
  },
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { math: true },
      mdastPlugins: [mathPlugin],
      hastPlugins: [footnotesPlugin, codePlugin],
    }),
  },
});
