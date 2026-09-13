/**
 * Converts OKLCH to linear sRGB without gamut clipping.
 *
 * @param lightness - Normalized lightness, where 1 is white.
 * @param chroma - Absolute OKLCH chroma, not a percentage.
 * @param hue - Hue angle in degrees.
 * @returns Linear red, green, and blue channels, which may fall outside 0–1.
 */
export function oklchToLinearRgb(
  lightness: number,
  chroma: number,
  hue: number,
): [number, number, number] {
  const angle = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(angle),
    b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * Parses the site's opaque OKLCH tokens into linear sRGB.
 *
 * @remarks
 * Accepts nonnegative decimal channels: numeric or percentage lightness,
 * numeric chroma, and hue in degrees with an optional `deg` suffix.
 * This is a token parser, not a general CSS color parser.
 *
 * @throws Error if the token does not match this syntax.
 */
export function cssColorToLinear(value: string): [number, number, number] {
  const match =
    /^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/.exec(
      value.trim(),
    );
  if (!match) throw new Error(`Expected an opaque OKLCH token: ${value}`);
  return oklchToLinearRgb(
    Number(match[1]) / (match[2] ? 100 : 1),
    Number(match[3]),
    Number(match[4]),
  );
}

/** Converts a site OKLCH token to gamut-clipped sRGB hex for Mermaid themes. */
export function cssColorToHex(value: string): string {
  return `#${cssColorToLinear(value)
    .map((channel) => {
      const linear = Math.min(1, Math.max(0, channel));
      const encoded =
        linear <= 0.0031308
          ? 12.92 * linear
          : 1.055 * linear ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}
