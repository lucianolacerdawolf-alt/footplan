import { describe, it, expect } from 'vitest';
import { simularPartidaRapida } from '../matchEngine';
import type { Team, Player } from '../types';

// RNG determinístico (LCG)
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr },
  };
}

function makeTeam(id: string, ovr = 70, formation: Team['strategy']['formation'] = '4-3-3'): Team {
  const squad: Player[] = [
    makePlayer(`${id}-gk1`, 'GK', 1, ovr),
    makePlayer(`${id}-gk2`, 'GK', 21, ovr),
    makePlayer(`${id}-def1`, 'DEF', 2, ovr), makePlayer(`${id}-def2`, 'DEF', 3, ovr),
    makePlayer(`${id}-def3`, 'DEF', 4, ovr), makePlayer(`${id}-def4`, 'DEF', 5, ovr),
    makePlayer(`${id}-def5`, 'DEF', 22, ovr),
    makePlayer(`${id}-mid1`, 'MID', 6, ovr), makePlayer(`${id}-mid2`, 'MID', 7, ovr), makePlayer(`${id}-mid3`, 'MID', 8, ovr),
    makePlayer(`${id}-mid4`, 'MID', 23, ovr), makePlayer(`${id}-mid5`, 'MID', 24, ovr),
    makePlayer(`${id}-fwd1`, 'FWD', 9, ovr), makePlayer(`${id}-fwd2`, 'FWD', 10, ovr), makePlayer(`${id}-fwd3`, 'FWD', 11, ovr),
    makePlayer(`${id}-fwd4`, 'FWD', 25, ovr),
  ];
  return {
    id, name: `T${id}`, abbreviation: id.toUpperCase(), color: '#3b82f6', secondaryColor: '#ef4444',
    logoUrl: '', squad,
    strategy: { formation, mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

// Helper para forçar RNG no simularPartidaRapida (usa Math.random internamente).
// Substituímos temporariamente Math.random pelo rng seeded.
function withRng<T>(rng: () => number, fn: () => T): T {
  const original = Math.random;
  Math.random = rng;
  try { return fn(); } finally { Math.random = original; }
}

describe('Calibração do matchEngine', () => {
  // Premier League real: ~2.75 gols/jogo (OVR varia). Com times iguais OVR 72,
  // esperamos ~2.5-3.0 (um pouco abaixo por falta de desbalanço de qualidade).
  it('média de gols por partida fica entre 2.4 e 3.1 (1000 jogos)', () => {
    const home = makeTeam('h', 72);
    const away = makeTeam('a', 72);
    const N = 1000;
    let totalGoals = 0;
    for (let i = 0; i < N; i++) {
      const r = withRng(seededRng(i + 1), () => simularPartidaRapida(home, away));
      totalGoals += r.homeScore + r.awayScore;
    }
    const avg = totalGoals / N;
    expect(avg).toBeGreaterThan(2.4);
    expect(avg).toBeLessThan(3.1);
  });

  it('time muito superior vence a maioria dos jogos (500 jogos, OVR 85 vs 60)', () => {
    const strong = makeTeam('s', 85);
    const weak = makeTeam('w', 60);
    const N = 500;
    let strongWins = 0;
    let weakWins = 0;
    let draws = 0;
    for (let i = 0; i < N; i++) {
      const r = withRng(seededRng(i + 100), () => simularPartidaRapida(strong, weak));
      if (r.homeScore > r.awayScore) strongWins++;
      else if (r.awayScore > r.homeScore) weakWins++;
      else draws++;
    }
    expect(strongWins).toBeGreaterThan(weakWins * 2);
    expect(strongWins + weakWins + draws).toBe(N);
  });

  // Premier League real: ~27% empates com qualidade variável.
  it('empates ficam entre 20% e 35% (1000 jogos times iguais)', () => {
    const a = makeTeam('a', 72);
    const b = makeTeam('b', 72);
    const N = 1000;
    let draws = 0;
    for (let i = 0; i < N; i++) {
      const r = withRng(seededRng(i + 200), () => simularPartidaRapida(a, b));
      if (r.homeScore === r.awayScore) draws++;
    }
    const pct = draws / N;
    expect(pct).toBeGreaterThan(0.20);
    expect(pct).toBeLessThan(0.35);
  });

  it('mandante vence mais que visitante em times iguais (1000 jogos)', () => {
    const home = makeTeam('h', 72);
    const away = makeTeam('a', 72);
    const N = 1000;
    let homeWins = 0;
    let awayWins = 0;
    for (let i = 0; i < N; i++) {
      const r = withRng(seededRng(i + 500), () => simularPartidaRapida(home, away));
      if (r.homeScore > r.awayScore) homeWins++;
      else if (r.awayScore > r.homeScore) awayWins++;
    }
    expect(homeWins).toBeGreaterThan(awayWins);
    expect(homeWins - awayWins).toBeGreaterThan(N * 0.04); // diff de pelo menos 4%
  });

  it('distribuição de placares: 0-0 a 5-5 cobre >95% (500 jogos)', () => {
    const a = makeTeam('a', 72);
    const b = makeTeam('b', 72);
    const N = 500;
    let inRange = 0;
    for (let i = 0; i < N; i++) {
      const r = withRng(seededRng(i + 300), () => simularPartidaRapida(a, b));
      if (r.homeScore <= 5 && r.awayScore <= 5) inRange++;
    }
    expect(inRange / N).toBeGreaterThan(0.95);
  });
});
