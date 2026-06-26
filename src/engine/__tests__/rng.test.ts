import { describe, it, expect } from 'vitest';
import { SeededRng, generateSeed } from '../rng';

describe('SeededRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = new SeededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed produces identical sequence', () => {
    const a = new SeededRng(12345);
    const b = new SeededRng(12345);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    let matchCount = 0;
    for (let i = 0; i < 100; i++) {
      if (a.next() === b.next()) matchCount++;
    }
    // With 100 calls, matching by chance is extremely unlikely (<3-4)
    expect(matchCount).toBeLessThan(5);
  });

  it('range() returns values within [min, max]', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.range(5, 15);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    }
  });

  it('range() can return values very close to min', () => {
    const rng = new SeededRng(123);
    let minVal = Infinity;
    for (let i = 0; i < 10000; i++) {
      const v = rng.range(10, 20);
      minVal = Math.min(minVal, v);
    }
    // Should find values very close to min (within 0.05)
    expect(minVal).toBeLessThan(10.05);
  });

  it('generates reasonable distribution', () => {
    const rng = new SeededRng(99);
    let belowHalf = 0;
    const N = 10000;
    for (let i = 0; i < N; i++) {
      if (rng.next() < 0.5) belowHalf++;
    }
    // Should be roughly 50% ± 5%
    const pct = belowHalf / N;
    expect(pct).toBeGreaterThan(0.45);
    expect(pct).toBeLessThan(0.55);
  });
});

describe('generateSeed', () => {
  it('returns a positive integer', () => {
    const seed = generateSeed();
    expect(seed).toBeGreaterThan(0);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it('returns values within 32-bit range', () => {
    for (let i = 0; i < 50; i++) {
      const seed = generateSeed();
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xFFFFFFFF);
    }
  });
});
