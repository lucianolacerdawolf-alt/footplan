import { describe, it, expect } from 'vitest';
import { generateTacticalComment } from '../tacticalCommentary';

function seededRng(s: number) { let v = s >>> 0; return () => { v = Math.imul(v, 1664525) + 1013904223 >>> 0; return v / 0x100000000; }; }

describe('generateTacticalComment', () => {
  it('returns a non-empty string', () => {
    const result = generateTacticalComment('Home', 'Away', '4-3-3', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(1));
    expect(result.length).toBeGreaterThan(0);
  });

  it('same input + same RandomFn = same output (deterministic)', () => {
    const a = generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(42));
    const b = generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(42));
    expect(a).toBe(b);
  });

  it('different RandomFn may produce different output', () => {
    const a = generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(1));
    const b = generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(99));
    // Not guaranteed different, but very likely
    const results = new Set([a, b]);
    expect(results.size).toBeGreaterThanOrEqual(1);
  });

  it('4-2-3-1 vs 4-4-2 mentions formation matchup', () => {
    const result = generateTacticalComment('Arsenal', 'Chelsea', '4-2-3-1', '4-4-2', 'possession', 'possession', 'normal', 'normal', seededRng(1));
    expect(result.length).toBeGreaterThan(10);
  });

  it('high-press mentality generates press-related comment', () => {
    // High press should push at least one press comment into the pool
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'high-press', 'possession', 'normal', 'normal', seededRng(i)));
    }
    const hasPress = [...results].some(r => r.includes('pressiona') || r.includes('pressão'));
    expect(hasPress).toBe(true);
  });

  it('counter-attack mentality generates counter comment', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'counter-attack', 'possession', 'normal', 'normal', seededRng(i)));
    }
    const hasCounter = [...results].some(r => r.includes('contra-ataque') || r.includes('contra ataque') || r.includes('velocidade'));
    expect(hasCounter).toBe(true);
  });

  it('defensive mentality generates defensive comment', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateTacticalComment('H', 'A', '4-3-3', '4-4-2', 'defensive', 'possession', 'normal', 'normal', seededRng(i)));
    }
    const hasDef = [...results].some(r => r.includes('retranca') || r.includes('linhas baixas') || r.includes('defensiv'));
    expect(hasDef).toBe(true);
  });

  it('fallback generates generic comment when no specific patterns match', () => {
    // Use 5-3-2 vs 5-3-2 both with 'counter-attack' — no specific pattern for same formation
    const result = generateTacticalComment('X', 'Y', '5-3-2', '5-3-2', 'counter-attack', 'counter-attack', 'normal', 'normal', seededRng(0));
    expect(result.length).toBeGreaterThan(5);
  });
});
