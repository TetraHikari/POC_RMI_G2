/** Small seeded RNG so mock data is identical on every render and every machine. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** mulberry32 */
  random(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.random();
  }

  int(lo: number, hiExclusive: number): number {
    return Math.floor(this.uniform(lo, hiExclusive));
  }

  choice<T>(items: readonly T[], weights?: readonly number[]): T {
    if (!weights) return items[Math.floor(this.random() * items.length)];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  normal(mean = 0, sd = 1): number {
    const u = 1 - this.random();
    const v = this.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  lognormal(mean = 0, sd = 1): number {
    return Math.exp(this.normal(mean, sd));
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const l = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.random();
    } while (p > l);
    return k - 1;
  }

  binomial(n: number, p: number): number {
    let k = 0;
    for (let i = 0; i < n; i++) if (this.random() < p) k++;
    return k;
  }
}

/** Stable 32-bit hash for string seeds. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
