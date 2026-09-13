import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    allowOnly: false,
    projects: [
      { test: { name: "unit", dir: "tests/unit" } },
      {
        plugins: [
          {
            name: "virtual-astro-navigation",
            resolveId: (id) =>
              id === "astro:transitions/client" ? id : undefined,
            // Browser mode pre-transforms this import before the test mock runs.
            load: (id) =>
              id === "astro:transitions/client" ? "export {}" : undefined,
          },
        ],
        test: {
          name: "browser",
          dir: "tests/browser",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { channel: "chromium" } }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
