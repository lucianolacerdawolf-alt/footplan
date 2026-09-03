import { describe, it, expect } from 'vitest';
import { simularPartida, simularPrimeiroTempo, simularSegundoTempo, resolveKnockoutTiebreak, simularPartidaRapida, simularKnockout, createMatchState } from '../matchEngine';
import type { Team, Player } from '../types';

// ---------------------------------------------------------------------------
// RNG determinístico (LCG)
// ---------------------------------------------------------------------------
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Fábrica de jogador sintético
// ---------------------------------------------------------------------------
function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return {
    id, name: `Player ${id}`, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr },
  };
}

// ---------------------------------------------------------------------------
// Fábrica de time sintético (11+7 = 18 jogadores para cada posição ter reserva)
// ---------------------------------------------------------------------------
function makeTeam(id: string, name: string, formation: Team['strategy']['formation'] = '4-3-3'): Team {
  const squad: Player[] = [
    makePlayer(`${id}-gk1`, 'GK', 1),
    makePlayer(`${id}-gk2`, 'GK', 21),
    makePlayer(`${id}-def1`, 'DEF', 2), makePlayer(`${id}-def2`, 'DEF', 3),
    makePlayer(`${id}-def3`, 'DEF', 4), makePlayer(`${id}-def4`, 'DEF', 5),
    makePlayer(`${id}-def5`, 'DEF', 22),
    makePlayer(`${id}-mid1`, 'MID', 6), makePlayer(`${id}-mid2`, 'MID', 7), makePlayer(`${id}-mid3`, 'MID', 8),
    makePlayer(`${id}-mid4`, 'MID', 23), makePlayer(`${id}-mid5`, 'MID', 24),
    makePlayer(`${id}-fwd1`, 'FWD', 9), makePlayer(`${id}-fwd2`, 'FWD', 10), makePlayer(`${id}-fwd3`, 'FWD', 11),
    makePlayer(`${id}-fwd4`, 'FWD', 25),
  ];
  return {
    id, name, abbreviation: name.slice(0, 3).toUpperCase(), color: '#3b82f6', secondaryColor: '#ef4444',
    logoUrl: '', squad,
    strategy: { formation, mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------
describe('simularPartida', () => {
  it('retorna placar não negativo', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartida(home, away, seededRng(42));
    expect(r.homeScore).toBeGreaterThanOrEqual(0);
    expect(r.awayScore).toBeGreaterThanOrEqual(0);
  });

  it('posse de bola soma 100', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartida(home, away, seededRng(42));
    expect(r.homePossession + r.awayPossession).toBe(100);
  });

  it('eventos contém kickoff e fulltime', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartida(home, away, seededRng(42));
    expect(r.events.some(e => e.type === 'kickoff')).toBe(true);
    expect(r.events.some(e => e.type === 'fulltime')).toBe(true);
  });

  it('retorna homeStats e awayStats preenchidos', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartida(home, away, seededRng(1));
    expect(r.homeStats).toBeDefined();
    expect(r.awayStats).toBeDefined();
    expect(r.homeStats.shots).toBeGreaterThanOrEqual(0);
    expect(r.awayStats.shots).toBeGreaterThanOrEqual(0);
  });

  it('shotsOnTarget <= shots para ambos os times', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    for (let seed = 0; seed < 10; seed++) {
      const r = simularPartida(home, away, seededRng(seed));
      expect(r.homeStats.shotsOnTarget).toBeLessThanOrEqual(r.homeStats.shots);
      expect(r.awayStats.shotsOnTarget).toBeLessThanOrEqual(r.awayStats.shots);
    }
  });

  it('placar é consistente com gols nos eventos', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartida(home, away, seededRng(7));
    const homeGoals = r.events.filter(e => e.type === 'goal' && e.teamId === home.id).length;
    const awayGoals = r.events.filter(e => e.type === 'goal' && e.teamId === away.id).length;
    expect(r.homeScore).toBe(homeGoals);
    expect(r.awayScore).toBe(awayGoals);
  });

  it('é determinístico: mesma seed gera mesmo resultado', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r1 = simularPartida(home, away, seededRng(99));
    const r2 = simularPartida(home, away, seededRng(99));
    expect(r1.homeScore).toBe(r2.homeScore);
    expect(r1.awayScore).toBe(r2.awayScore);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it('seeds diferentes produzem resultados potencialmente diferentes', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const results = Array.from({ length: 20 }, (_, i) => {
      const r = simularPartida(home, away, seededRng(i * 137));
      return `${r.homeScore}-${r.awayScore}`;
    });
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(3);
  });

  it('time com OVR muito superior marca mais gols em média', () => {
    const elite = makeTeam('e', 'Elite');
    elite.squad = elite.squad.map(p => ({ ...p, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, _]) => [k, 99])) as unknown as Player['attributes'] }));
    const weak = makeTeam('w', 'Weak');
    weak.squad = weak.squad.map(p => ({ ...p, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, _]) => [k, 20])) as unknown as Player['attributes'] }));

    let eliteWins = 0;
    for (let seed = 0; seed < 50; seed++) {
      const r = simularPartida(elite, weak, seededRng(seed));
      if (r.homeScore > r.awayScore) eliteWins++;
    }
    expect(eliteWins).toBeGreaterThan(30);
  });

  it('mentalidade defensiva gera menos chutes', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');

    const defensiveHome = { ...home, strategy: { ...home.strategy, mentality: 'defensive' as const } };
    const aggressiveHome = { ...home, strategy: { ...home.strategy, mentality: 'high-press' as const } };

    let defensiveShots = 0, aggressiveShots = 0;
    for (let seed = 0; seed < 200; seed++) {
      defensiveShots += simularPartida(defensiveHome, away, seededRng(seed)).homeStats.shots;
      aggressiveShots += simularPartida(aggressiveHome, away, seededRng(seed)).homeStats.shots;
    }
    expect(defensiveShots).toBeLessThan(aggressiveShots);
  });
});

describe('simularPrimeiroTempo', () => {
  it('retorna estado com events contendo halftime', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const { state } = simularPrimeiroTempo(home, away, seededRng(1));
    expect(state.events.some(e => e.type === 'halftime')).toBe(true);
  });

  it('estado tem placar consistente com gols dos eventos', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const { state } = simularPrimeiroTempo(home, away, seededRng(5));
    const homeGoals = state.events.filter(e => e.type === 'goal' && e.teamId === home.id).length;
    const awayGoals = state.events.filter(e => e.type === 'goal' && e.teamId === away.id).length;
    expect(state.homeScore).toBe(homeGoals);
    expect(state.awayScore).toBe(awayGoals);
  });
});

describe('simularSegundoTempo', () => {
  it('acumula placar do primeiro tempo', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const { state } = simularPrimeiroTempo(home, away, seededRng(10));
    const htHomeScore = state.homeScore;
    const htAwayScore = state.awayScore;
    const result = simularSegundoTempo(home, away, state, seededRng(10));
    expect(result.homeScore).toBeGreaterThanOrEqual(htHomeScore);
    expect(result.awayScore).toBeGreaterThanOrEqual(htAwayScore);
  });

  it('eventos do resultado incluem kickoff do 2o tempo (min 45)', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const { state } = simularPrimeiroTempo(home, away, seededRng(3));
    const result = simularSegundoTempo(home, away, state, seededRng(3));
    const kickoffs = result.events.filter(e => e.type === 'kickoff');
    expect(kickoffs.length).toBeGreaterThanOrEqual(2);
    expect(kickoffs.some(e => e.minute === 45)).toBe(true);
  });

  it('resultado final tem homeStats e awayStats', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const { state } = simularPrimeiroTempo(home, away, seededRng(20));
    const result = simularSegundoTempo(home, away, state, seededRng(20));
    expect(result.homeStats).toBeDefined();
    expect(result.awayStats).toBeDefined();
  });
});

describe('cartões e expulsões', () => {
  it('redCard evento tem playerId preenchido', () => {
    let found = false;
    for (let seed = 0; seed < 100 && !found; seed++) {
      const home = makeTeam('h', 'Home');
      const away = makeTeam('a', 'Away');
      const r = simularPartida(home, away, seededRng(seed));
      const redCards = r.events.filter(e => e.type === 'redCard');
      if (redCards.length > 0) {
        expect(redCards[0].playerId).toBeDefined();
        found = true;
      }
    }
  });

  it('segundo cartão amarelo sempre resulta em vermelho para o mesmo jogador', () => {
    for (let seed = 0; seed < 200; seed++) {
      const home = makeTeam('h', 'Home');
      const away = makeTeam('a', 'Away');
      const r = simularPartida(home, away, seededRng(seed));
      const reds = r.events.filter(e => e.type === 'redCard').map(e => e.playerId!);
      for (const pid of reds) {
        const yellows = r.events.filter(e => e.type === 'yellowCard' && e.playerId === pid);
        expect(yellows.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ── Extra time & penalties ─────────────────────────────────────────────────
describe('resolveKnockoutTiebreak', () => {
  it('returns wentToExtraTime=false when scores differ', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const state = createMatchState(home, away);
    state.homeScore = 2;
    state.awayScore = 1;
    const result = resolveKnockoutTiebreak(home, away, state, seededRng(1));
    expect(result.wentToExtraTime).toBe(false);
  });

  it('returns wentToExtraTime=true when scores are tied', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const state = createMatchState(home, away);
    state.homeScore = 1;
    state.awayScore = 1;
    const result = resolveKnockoutTiebreak(home, away, state, seededRng(1));
    expect(result.wentToExtraTime).toBe(true);
  });

  it('returns penaltyResult when still tied after ET', () => {
    let foundPenalties = false;
    for (let seed = 0; seed < 50; seed++) {
      const home = makeTeam('h', 'Home');
      const away = makeTeam('a', 'Away');
      const state = createMatchState(home, away);
      state.homeScore = 1;
      state.awayScore = 1;
      const result = resolveKnockoutTiebreak(home, away, state, seededRng(seed));
      if (result.penaltyResult) {
        foundPenalties = true;
        expect(result.penaltyResult.homeScore).toBeGreaterThanOrEqual(0);
        expect(result.penaltyResult.awayScore).toBeGreaterThanOrEqual(0);
        expect(result.penaltyResult.winner).toMatch(/home|away/);
        expect(result.penaltyResult.kicks.length).toBeGreaterThanOrEqual(5);
        break;
      }
    }
    expect(foundPenalties).toBe(true);
  });

  it('penalty shootout produces a winner', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const state = createMatchState(home, away);
    state.homeScore = 0;
    state.awayScore = 0;
    const result = resolveKnockoutTiebreak(home, away, state, seededRng(7));
    if (result.penaltyResult) {
      expect(result.penaltyResult.homeScore).not.toBe(result.penaltyResult.awayScore);
    }
  });

  it('extra time scores are correctly computed', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const state = createMatchState(home, away);
    state.homeScore = 0;
    state.awayScore = 0;
    const result = resolveKnockoutTiebreak(home, away, state, seededRng(3));
    if (!result.penaltyResult) {
      expect(state.homeScore).not.toBe(state.awayScore);
      expect(result.extraTimeHomeScore).toBeDefined();
      expect(result.extraTimeAwayScore).toBeDefined();
    }
  });

  it('narrated penalty kickers match the simulated shooters (incl. sudden death)', () => {
    // Regressão: o log de eventos recomputava o cobrador com `Math.floor(idx/2) % len`,
    // que diverge da simulação na morte súbita (a rodada continua de 5 em diante) —
    // o feed narrava um jogador diferente do que realmente chutou.
    let checked = false;
    for (let seed = 0; seed < 200 && !checked; seed++) {
      const home = makeTeam('h', 'Home');
      const away = makeTeam('a', 'Away');
      const state = createMatchState(home, away);
      state.homeScore = 0;
      state.awayScore = 0;
      const result = resolveKnockoutTiebreak(home, away, state, seededRng(seed));
      if (!result.penaltyResult) continue;
      checked = true;

      const kickEvents = state.events.filter(e => e.type === 'penaltyKick');
      expect(kickEvents.length).toBe(result.penaltyResult.kicks.length);

      // Cada evento narrado deve citar o cobrador registrado na simulação.
      result.penaltyResult.kicks.forEach((kick, idx) => {
        const evt = kickEvents[idx];
        const shooter = [...home.squad, ...away.squad].find(p => p.id === kick.shooterId);
        expect(shooter).toBeDefined();
        expect(evt.description).toContain(shooter!.name);
      });
    }
    expect(checked).toBe(true);
  });

  it('penalty shootout survives a team with no outfield players (no crash)', () => {
    // Regressão: com todos os jogadores de linha expulsos, `i % 0` virava NaN e
    // `takePenalty(undefined)` crashava em `shooter.attributes`. O importante é
    // não lançar exceção; se chegar aos pênaltis, o time sem cobradores perde.
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const state = createMatchState(home, away);
    state.homeScore = 0;
    state.awayScore = 0;
    // Expulsa todos os jogadores de linha do mandante.
    home.squad.filter(p => p.position !== 'GK').forEach(p => state.cards.set(p.id, 'red'));
    let result: ReturnType<typeof resolveKnockoutTiebreak>;
    expect(() => { result = resolveKnockoutTiebreak(home, away, state, seededRng(1)); }).not.toThrow();
    if (result!.penaltyResult) {
      expect(result!.penaltyResult!.winner).toBe('away');
      expect(result!.penaltyResult!.kicks.length).toBe(0);
    }
  });
});

describe('simularPartidaRapida', () => {
  it('returns homeScore and awayScore', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularPartidaRapida(home, away, seededRng(1));
    expect(r.homeScore).toBeGreaterThanOrEqual(0);
    expect(r.awayScore).toBeGreaterThanOrEqual(0);
  });
});

describe('simularKnockout', () => {
  it('returns a winner (home or away)', () => {
    const home = makeTeam('h', 'Home');
    const away = makeTeam('a', 'Away');
    const r = simularKnockout(home, away, seededRng(1));
    expect(['home', 'away']).toContain(r.winner);
  });

  it('ties go to extra time and produce a winner', () => {
    let foundET = false;
    for (let seed = 0; seed < 30; seed++) {
      const home = makeTeam('h', 'Home');
      const away = makeTeam('a', 'Away');
      const r = simularKnockout(home, away, seededRng(seed));
      if (r.wentToExtraTime) {
        foundET = true;
        expect(r.winner).toBeDefined();
        break;
      }
    }
    expect(foundET).toBe(true);
  });
});
