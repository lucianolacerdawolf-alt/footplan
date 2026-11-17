// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { goalMinutes } from '../LiveScoreTicker';

describe('goalMinutes (ticker ao vivo)', () => {
  it('número de gols bate com o placar gravado e minutos ficam entre 1 e 90', () => {
    const g = goalMinutes('r3-f2', 3, 1);
    expect(g.filter(x => x.side === 'home')).toHaveLength(3);
    expect(g.filter(x => x.side === 'away')).toHaveLength(1);
    expect(g.every(x => x.minute >= 1 && x.minute <= 90)).toBe(true);
    expect([...g].map(x => x.minute)).toEqual([...g].map(x => x.minute).sort((a, b) => a - b));
  });

  it('determinístico: o mesmo jogo revela os gols sempre nos mesmos minutos', () => {
    expect(goalMinutes('r3-f2', 2, 2)).toEqual(goalMinutes('r3-f2', 2, 2));
  });
});
