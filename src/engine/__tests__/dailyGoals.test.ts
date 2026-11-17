import { describe, it, expect } from 'vitest';
import { goalsFor, normalize, recordMatch, isComplete, todayKey } from '../dailyGoals';

describe('metas do dia', () => {
  it('3 metas por dia, sem repetir métrica, iguais o dia todo', () => {
    const g = goalsFor('2026-11-17');
    expect(g).toHaveLength(3);
    expect(new Set(g.map(x => x.metric)).size).toBe(3);
    expect(goalsFor('2026-11-17')).toEqual(g);
  });

  it('completar as 3 soma 1 na sequência (uma vez só por dia)', () => {
    const date = '2026-11-17';
    let s = normalize(null, date);
    for (let i = 0; i < 4; i++) s = recordMatch(s, 4, true);
    expect(isComplete(s)).toBe(true);
    expect(s.streak).toBe(1);
    s = recordMatch(s, 4, true);
    expect(s.streak).toBe(1);
  });

  it('dia seguinte zera o progresso e mantém a sequência; pular um dia zera a sequência', () => {
    const done = { date: '2026-11-17', progress: {}, streak: 3, lastCompletedDate: '2026-11-17' };
    const next = normalize(done, '2026-11-18');
    expect(next.progress).toEqual({});
    expect(next.streak).toBe(3);
    expect(normalize(done, '2026-11-19').streak).toBe(0);
  });

  it('todayKey usa o fuso local no formato AAAA-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
