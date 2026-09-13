import { expect, it } from "vitest";
import {
  cssColorToHex,
  cssColorToLinear,
  oklchToLinearRgb,
} from "../../src/lib/color";
it("converts OKLCH to linear sRGB without reinterpreting display values", () => {
  expect(oklchToLinearRgb(0, 0, 0)).toEqual([0, 0, 0]);
  oklchToLinearRgb(1, 0, 0).forEach((channel) =>
    expect(channel).toBeCloseTo(1, 7),
  );
  oklchToLinearRgb(0.5, 0, 0).forEach((channel) =>
    expect(channel).toBeCloseTo(0.125, 7),
  );
  const red = oklchToLinearRgb(0.6279553606, 0.2576833077, 29.2338851923);
  expect(red[0]).toBeCloseTo(1, 5);
  expect(red[1]).toBeCloseTo(0, 5);
  expect(red[2]).toBeCloseTo(0, 5);
  expect(cssColorToLinear("oklch(50% 0 250deg)")).toEqual(
    cssColorToLinear("oklch(0.5 0 250)"),
  );
  expect(() => cssColorToLinear("red")).toThrow(
    "Expected an opaque OKLCH token",
  );
});

it("encodes display hex for Mermaid without applying gamma twice", () => {
  expect(cssColorToHex("oklch(0% 0 0)")).toBe("#000000");
  expect(cssColorToHex("oklch(100% 0 0)")).toBe("#ffffff");
  expect(cssColorToHex("oklch(50% 0 0)")).toBe("#636363");
});
