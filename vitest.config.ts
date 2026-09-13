import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    allowOnly: false,
    projects: [
      { test: { name: "unit", dir: "tests/unit" } },
      {
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
