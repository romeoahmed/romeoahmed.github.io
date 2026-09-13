import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import astro from "eslint-plugin-astro";
import prettier from "eslint-config-prettier/flat";

export default defineConfig(
  globalIgnores(["dist/**", ".astro/**"]),
  js.configs.recommended,
  ts.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    linterOptions: { reportUnusedInlineConfigs: "error" },
  },
  astro.configs.recommended,
  {
    // astro check supplies type diagnostics; ESLint still applies syntax rules here.
    files: ["**/*.astro", "**/*.astro/*"],
    extends: [ts.configs.disableTypeChecked],
  },
  prettier,
);
