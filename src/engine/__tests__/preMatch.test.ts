import { describe, it, expect } from 'vitest';
import { applyTrainingChoice, isTrainingDone } from '../training';
import { generatePressConferenceQuestion, respondToPressConference, getPressContext } from '../pressConference';
import { generateSocialFeed } from '../socialFeed';
import type { Player, Team } from '../types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, ovr: number): Player {
  const attr = (v: number) => Math.max(1, Math.min(99, v));
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0, age: 25,
    attributes: {
      speed: attr(ovr), stamina: attr(ovr), passing: attr(ovr), finishing: attr(ovr),
      tackling: attr(ovr), dribbling: attr(ovr), vision: attr(ovr), positioning: attr(ovr),
    },
  };
}

function makeTeam(id: string, ovr: number): Team {
  const squad = [
    makePlayer(`${id}-gk1`, 'GK', 1, ovr), makePlayer(`${id}-gk2`, 'GK', 21, ovr),
    makePlayer(`${id}-def1`, 'DEF', 2, ovr), makePlayer(`${id}-def2`, 'DEF', 3, ovr),
    makePlayer(`${id}-def3`, 'DEF', 4, ovr), makePlayer(`${id}-def4`, 'DEF', 5, ovr),
    makePlayer(`${id}-mid1`, 'MID', 6, ovr), makePlayer(`${id}-mid2`, 'MID', 7, ovr),
    makePlayer(`${id}-mid3`, 'MID', 8, ovr), makePlayer(`${id}-mid4`, 'MID', 23, ovr),
    makePlayer(`${id}-fwd1`, 'FWD', 9, ovr), makePlayer(`${id}-fwd2`, 'FWD', 10, ovr),
    makePlayer(`${id}-fwd3`, 'FWD', 11, ovr), makePlayer(`${id}-fwd4`, 'FWD', 25, ovr),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeTeamWithFatigue(id: string, ovr: number, fatigue: number): Team {
  const t = makeTeam(id, ovr);
  return { ...t, squad: t.squad.map(p => ({ ...p, currentFatigue: fatigue })) };
}

describe('applyTrainingChoice', () => {
  it('Intenso: moral +3 e fadiga +25 em todos os jogadores', () => {
    const team = { ...makeTeamWithFatigue('u', 70, 30), morale: 2 };
    const after = applyTrainingChoice(team, 'intense');
    expect(after.morale).toBe(5);
    expect(after.squad.every(p => p.currentFatigue === 55)).toBe(true);
  });

  it('Leve: moral +1 e fadiga -10', () => {
    const team = { ...makeTeamWithFatigue('u', 70, 30), morale: 0 };
    const after = applyTrainingChoice(team, 'light');
    expect(after.morale).toBe(1);
    expect(after.squad.every(p => p.currentFatigue === 20)).toBe(true);
  });

  it('Descanso: moral -2 e fadiga -30', () => {
    const team = { ...makeTeamWithFatigue('u', 70, 50), morale: 0 };
    const after = applyTrainingChoice(team, 'rest');
    expect(after.morale).toBe(-2);
    expect(after.squad.every(p => p.currentFatigue === 20)).toBe(true);
  });

  it('clamp: moral em [-10,10] e fadiga em [0,100]', () => {
    const team = { ...makeTeamWithFatigue('u', 70, 95), morale: 10 };
    const intense = applyTrainingChoice(team, 'intense');
    expect(intense.morale).toBe(10);
    expect(intense.squad.every(p => p.currentFatigue === 100)).toBe(true);

    const tiredLow = { ...makeTeamWithFatigue('u', 70, 5), morale: -9 };
    const rest = applyTrainingChoice(tiredLow, 'rest');
    expect(rest.morale).toBe(-10);
    expect(rest.squad.every(p => p.currentFatigue === 0)).toBe(true);
  });

  it('moral ausente (save antigo) trata como 0', () => {
    const after = applyTrainingChoice(makeTeamWithFatigue('u', 70, 30), 'rest');
    expect(after.morale).toBe(-2);
  });
});

describe('isTrainingDone', () => {
  it('verdadeiro só quando doneRound === currentRound', () => {
    expect(isTrainingDone(3, 3)).toBe(true);
    expect(isTrainingDone(3, 4)).toBe(false);
    expect(isTrainingDone(undefined, 0)).toBe(false);
  });
});

describe('getPressContext', () => {
  const strong = makeTeam('strong', 85);
  const weak = makeTeam('weak', 60);
  const mid = makeTeam('mid', 70);

  it('dérbi tem prioridade (ids de rivalidade reais)', () => {
    const arsenal = makeTeam('arsenal', 75);
    const manUtd = makeTeam('man-utd', 75);
    expect(getPressContext(arsenal, manUtd)).toBe('derby');
  });

  it('favorito = OVR médio muito maior', () => {
    expect(getPressContext(strong, weak)).toBe('favorite');
  });

  it('azarão = OVR médio muito menor', () => {
    expect(getPressContext(weak, strong)).toBe('underdog');
  });

  it('neutro = OVR próximos', () => {
    expect(getPressContext(mid, makeTeam('opp', 71))).toBe('neutral');
  });
});

describe('generatePressConferenceQuestion / respondToPressConference', () => {
  it('gera 1 pergunta por contexto com 2-3 respostas e deltas +2/0/-2', () => {
    for (const [userOvr, oppOvr] of [[85, 60], [60, 85], [70, 71]]) {
      const q = generatePressConferenceQuestion(makeTeam('u', userOvr), makeTeam('o', oppOvr), seededRng(3));
      expect(q.id).toBeTruthy();
      expect(q.question).toBeTruthy();
      expect(q.responses.length).toBeGreaterThanOrEqual(2);
      expect(q.responses.length).toBeLessThanOrEqual(3);
      expect(q.responses.map(r => r.moraleDelta).sort()).toEqual([-2, 0, 2]);
    }
  });

  it('responde por índice e retorna null pra índice inválido', () => {
    const q = generatePressConferenceQuestion(makeTeam('u', 70), makeTeam('o', 71), seededRng(3));
    expect(respondToPressConference(q, 0)!.moraleDelta).toBe(2);
    expect(respondToPressConference(q, 1)!.moraleDelta).toBe(0);
    expect(respondToPressConference(q, 2)!.moraleDelta).toBe(-2);
    expect(respondToPressConference(q, 9)).toBeNull();
  });
});

describe('generateSocialFeed', () => {
  it('gera posts de resultado, posição e adversário sem estado mínimo quebrar', () => {
    const user = makeTeam('user', 70);
    const posts = generateSocialFeed({
      userTeam: user,
      opponentName: 'Time B',
      userPosition: 2,
      totalTeams: 20,
      lastResult: { userScore: 3, oppScore: 1 },
      seasonYear: 1,
    });
    expect(posts.length).toBeGreaterThanOrEqual(3);
    expect(posts.length).toBeLessThanOrEqual(4);
    expect(posts.some(p => p.content.includes('vitória'))).toBe(true);
    expect(posts.some(p => p.content.includes('2º'))).toBe(true);
    for (const p of posts) {
      expect(p.author).toBeTruthy();
      expect(p.content).toBeTruthy();
      expect(p.likes).toBeGreaterThan(0);
    }
  });

  it('inclui post de contratação quando marqueeSigning existe', () => {
    const posts = generateSocialFeed({
      userTeam: makeTeam('user', 70),
      opponentName: 'Time B',
      userPosition: 5,
      totalTeams: 20,
      marqueeSigning: 'Fulano',
      seasonYear: 1,
    });
    expect(posts.some(p => p.content.includes('Fulano'))).toBe(true);
  });

  it('sempre devolve pelo menos 3 posts (backfill)', () => {
    const posts = generateSocialFeed({
      userTeam: makeTeam('user', 70),
      opponentName: 'X',
      userPosition: 10,
      totalTeams: 20,
      seasonYear: 1,
    });
    expect(posts.length).toBeGreaterThanOrEqual(3);
  });
});
