import { describe, it, expect } from 'vitest';
import { getSubWindow, HALF_SECONDS } from '../useMatchSimulation';

describe('getSubWindow', () => {
  it('retorna "halftime" durante o intervalo, independente do relógio', () => {
    expect(getSubWindow('halftime', 0)).toBe('halftime');
    expect(getSubWindow('halftime', HALF_SECONDS + 100)).toBe('halftime');
  });

  it('retorna "firstHalfPause" antes de HALF_SECONDS (fora do intervalo)', () => {
    expect(getSubWindow('simulating', 0)).toBe('firstHalfPause');
    expect(getSubWindow('idle', HALF_SECONDS - 1)).toBe('firstHalfPause');
  });

  it('retorna "secondHalfPause" a partir de HALF_SECONDS', () => {
    expect(getSubWindow('simulating', HALF_SECONDS)).toBe('secondHalfPause');
    expect(getSubWindow('done', HALF_SECONDS + 500)).toBe('secondHalfPause');
  });

  it('só existem 3 valores possíveis — não há uma 4ª janela alcançável', () => {
    const phases: Array<Parameters<typeof getSubWindow>[0]> = ['idle', 'simulating', 'halftime', 'done'];
    const seconds = [0, 1, HALF_SECONDS - 1, HALF_SECONDS, HALF_SECONDS + 1000];
    const results = new Set(phases.flatMap(p => seconds.map(s => getSubWindow(p, s))));
    expect(results).toEqual(new Set(['firstHalfPause', 'halftime', 'secondHalfPause']));
  });
});
