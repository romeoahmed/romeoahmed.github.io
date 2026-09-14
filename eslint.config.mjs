import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import astro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier/flat";

export default defineConfig(
  globalIgnores(["dist/**", ".astro/**"]),
  js.configs.recommended,
  ts.configs.recommended,
  astro.configs.recommended,
  {
    linterOptions: { reportUnusedInlineConfigs: "error" },
  },
  {
    files: ["**/*.{ts,mjs}"],
    ignores: ["**/*.astro/**"],
    extends: [ts.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true },
    },
  },
  {
    files: ["src/content/**/*.{ts,astro}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "astro:content",
              message: "Article embeds must not load the site's collections.",
            },
          ],
          patterns: [
            {
              regex:
                "(?:^|/)(?:client|components|i18n|layouts|markdown|publication|site)(?:/|\\.|$)",
              message:
                "Keep article code independent of the site; own its copy and state locally.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/browser/**/*.ts"],
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
  prettier,
);
