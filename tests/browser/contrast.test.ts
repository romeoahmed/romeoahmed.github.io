import { afterEach, expect, test } from "vitest";
import { cssColorToLinear } from "../../src/client/color";
import "../../src/styles/global.css";

afterEach(() => document.documentElement.removeAttribute("data-theme"));

test.each(["light", "dark"])(
  "%s text and accent contrast on reading surfaces",
  (theme) => {
    document.documentElement.dataset["theme"] = theme;
    const css = getComputedStyle(document.documentElement);
    const luminance = (name: string) => {
      const [r, g, b] = cssColorToLinear(
        css.getPropertyValue(`--color-${name}`),
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const background of ["page", "surface"]) {
      for (const foreground of ["text", "muted", "accent"]) {
        const a = luminance(background);
        const b = luminance(foreground);
        expect(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          `${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  },
);
