export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns a number in [0, 1) */
  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a number in [min, max] */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export function generateSeed(): number {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}
