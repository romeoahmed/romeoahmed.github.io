/** Generates deterministic positions and appearance for both SVG and GPU particles. */
export function createParticleField(count: number) {
  const fraction = (value: number) => value - Math.floor(value);
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const scatter = fraction(i * Math.SQRT2);
    const depth = fraction(i * Math.sqrt(3));
    const halo = i % 5 === 0;
    const radius = halo
      ? 0.85 + scatter * 1.15
      : 1.46 + (scatter - 0.5) * 0.24 + Math.sin(angle * 3) * 0.08;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (depth - 0.5) * (halo ? 0.65 : 0.16);
    const tiltedY = y * 0.58 - z * 0.815;
    const tiltedZ = y * 0.815 + z * 0.58;
    return {
      x: x * 0.9 - tiltedY * 0.436,
      y: x * 0.436 + tiltedY * 0.9,
      z: tiltedZ,
      size: (halo ? 0.016 : 0.023) + depth * 0.017,
      opacity: (halo ? 0.2 : 0.46) + (1 - depth) * 0.4,
    };
  });
}
