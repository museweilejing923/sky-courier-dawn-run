// A small seeded random number generator (mulberry32): the same seed gives
// the same sortie, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth rolling terrain height (feet) at a distance along the route. */
export function terrainHeight(dist) {
  const hills = Math.sin(dist * 0.9) * 180 + Math.sin(dist * 2.3 + 1.7) * 120;
  const ridge = Math.max(0, Math.sin((dist - 7.2) * 1.1)) * 480;
  const height = Math.max(0, 180 + hills + ridge);
  // The valley floor flattens near the runway so a landing is possible.
  if (dist > 12.5) return Math.max(80, height * (1 - (dist - 12.5) / 2));
  return height;
}
