import { expect, test } from "vitest";
import {
  cssColorToHex,
  cssColorToLinear,
  oklchToLinearRgb,
} from "../../src/client/color";

test("OKLCH converts to linear light before display encoding", () => {
  expect(oklchToLinearRgb(0, 0, 0)).toEqual([0, 0, 0]);
  for (const channel of oklchToLinearRgb(0.5, 0, 0))
    expect(channel).toBeCloseTo(0.125, 7);
  const red = oklchToLinearRgb(0.6279553606, 0.2576833077, 29.2338851923);
  expect(red[0]).toBeCloseTo(1, 5);
  expect(red[1]).toBeCloseTo(0, 5);
  expect(red[2]).toBeCloseTo(0, 5);
  expect(cssColorToLinear(" oklch(50% 0 250deg) ")).toEqual(
    cssColorToLinear("oklch(0.5 0 250)"),
  );
});

test("unsupported and malformed tokens fail instead of producing invalid colors", () => {
  for (const token of [
    "red",
    "oklch(. 0 0)",
    "oklch(50% 0..1 250)",
    "oklch(50% 0 0 / .5)",
  ])
    expect(() => cssColorToLinear(token), token).toThrow(
      "Expected an opaque OKLCH token",
    );
});

test("display colors are gamma-encoded and clipped to sRGB", () => {
  expect(cssColorToHex("oklch(0% 0 0)")).toBe("#000000");
  expect(cssColorToHex("oklch(100% 0 0)")).toBe("#ffffff");
  expect(cssColorToHex("oklch(50% 0 0)")).toBe("#636363");
  expect(cssColorToHex("oklch(120% 0 0)")).toBe("#ffffff");
});
