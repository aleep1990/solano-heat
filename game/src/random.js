// Seeded RNG (mulberry32) and hand-rolled value noise for city variation.
// Self-contained: no noise library is vendored.
export function createRandom(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(min, max) { return min + next() * (max - min); }
  function int(min, max) { return Math.floor(range(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(next() * arr.length)]; }
  function hash2(x, z) {
    let h = (x * 374761393 + z * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // Smooth value noise in [-1, 1] from integer lattice hashes.
  function noise2(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash2(xi, zi) * 2 - 1, b = hash2(xi + 1, zi) * 2 - 1;
    const c = hash2(xi, zi + 1) * 2 - 1, d = hash2(xi + 1, zi + 1) * 2 - 1;
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
  }
  return { next, range, int, pick, hash2, noise2, seed };
}
