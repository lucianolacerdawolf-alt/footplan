import { describe, it, expect } from 'vitest';
import {
  generateBoardObjectives, evaluateBoardObjectives, getClubStature,
  createBoardObjectivesResultMessage,
} from '../boardObjectives';
import type { LeagueState } from '../tournament';
import type { Team, Player } from '../types';

function team(id: string, ovr: number): Team {
  const attr = (v: number) => ({
    speed: v, stamina: v, passing: v, finishing: v,
    tackling: v, dribbling: v, vision: v, positioning: v,
  });
  const squad: Player[] = Array.from({ length: 11 }, (_, i) => ({
    id: `${id}-p${i}`, name: `${id} ${i}`, number: i + 1,
    position: (i === 0 ? 'GK' : i < 5 ? 'DEF' : i < 8 ? 'MID' : 'FWD') as Player['position'],
    currentFatigue: 0, attributes: attr(ovr),
  }));
  return {
    id, name: id.toUpperCase(), abbreviation: id.slice(0, 3).toUpperCase(),
    color: '#000', secondaryColor: '#fff', logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

/** Liga com `size` times: o índice 0 é o mais forte e o último é o mais fraco. */
function league(size: number, userIndex: number): LeagueState {
  const teams = Array.from({ length: size }, (_, i) => team(`t${i}`, 90 - i * 2));
  return { teams, userTeamId: `t${userIndex}`, fixtures: [], currentRound: 0, phase: 'playing' };
}

describe('getClubStature', () => {
  it('dá 100 ao melhor elenco e 0 ao pior, independentemente do tamanho da liga', () => {
    expect(getClubStature(league(18, 0))).toBe(100);
    expect(getClubStature(league(18, 17))).toBe(0);
    expect(getClubStature(league(20, 0))).toBe(100);
    expect(getClubStature(league(20, 19))).toBe(0);
  });
});

describe('generateBoardObjectives', () => {
  it('cobra título de um clube grande mesmo numa liga de 18 times (regressão: isTopLeague >= 20)', () => {
    // Bundesliga / Ligue 1 / Liga Portugal têm 18 times — o melhor elenco delas
    // precisa receber meta de título, não "metade de cima".
    const obj = generateBoardObjectives(league(18, 0), 0, 1);
    const position = obj.objectives.find(o => o.type === 'league_position');
    expect(position).toBeDefined();
    expect(position!.target).toBe(2);
  });

  it('calibra pelo elenco quando o técnico é estreante (reputação 0)', () => {
    // Mesmo técnico sem reputação, o clube define a cobrança.
    const noReal = generateBoardObjectives(league(20, 0), 0, 1);
    expect(noReal.objectives.some(o => o.type === 'avoid_relegation')).toBe(false);

    const noLanterna = generateBoardObjectives(league(20, 19), 0, 1);
    expect(noLanterna.objectives.some(o => o.type === 'avoid_relegation')).toBe(true);
  });

  it('grava o ano da temporada que recebeu, não o ano do mundo real', () => {
    expect(generateBoardObjectives(league(20, 0), 50, 7).seasonYear).toBe(7);
  });

  it('nunca pede menos do que a posição da temporada anterior', () => {
    // Clube de meio de tabela que terminou em 3º passa a ser cobrado por 3º, não 4º
    const obj = generateBoardObjectives(league(20, 3), 70, 2, 3);
    expect(obj.objectives.find(o => o.type === 'league_position')!.target).toBe(3);

    // Mas a exigência nunca aperta além do Top 2
    const obj2 = generateBoardObjectives(league(20, 0), 90, 2, 1);
    expect(obj2.objectives.find(o => o.type === 'league_position')!.target).toBe(2);
  });

  it('sempre inclui copa e orçamento, com ids únicos', () => {
    const obj = generateBoardObjectives(league(20, 5), 50, 1);
    expect(obj.objectives.map(o => o.type)).toContain('cup_progress');
    expect(obj.objectives.map(o => o.type)).toContain('budget_positive');
    expect(new Set(obj.objectives.map(o => o.id)).size).toBe(obj.objectives.length);
  });
});

describe('evaluateBoardObjectives', () => {
  const objectives = generateBoardObjectives(league(20, 0), 90, 1);

  it('soma recompensas quando tudo é cumprido', () => {
    const { results, totalRepDelta, newStreak } = evaluateBoardObjectives(
      objectives, 1, 'champion', 5_000_000, 0,
    );
    expect(results.every(r => r.achieved)).toBe(true);
    expect(totalRepDelta).toBe(objectives.objectives.reduce((s, o) => s + o.reward, 0));
    expect(newStreak).toBe(0);
  });

  it('desconta penalidades e acumula streak quando 2+ objetivos falham', () => {
    const { results, totalRepDelta, newStreak, warnings } = evaluateBoardObjectives(
      objectives, 15, 'roundOf16', -3_000_000, 1,
    );
    expect(results.filter(r => !r.achieved).length).toBeGreaterThanOrEqual(2);
    expect(totalRepDelta).toBeLessThan(0);
    expect(newStreak).toBe(2);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('zera o streak assim que a temporada volta a ser boa', () => {
    const { newStreak } = evaluateBoardObjectives(objectives, 1, 'champion', 1_000_000, 3);
    expect(newStreak).toBe(0);
  });

  it('classifica o estágio da copa corretamente contra a meta', () => {
    const cupOnly = generateBoardObjectives(league(20, 0), 90, 1);
    const meta = cupOnly.objectives.find(o => o.type === 'cup_progress')!;
    expect(meta.target).toBe(2); // final ou melhor

    const vice = evaluateBoardObjectives(cupOnly, 1, 'runner-up', 1, 0);
    expect(vice.results.find(r => r.objective.type === 'cup_progress')!.achieved).toBe(true);

    const semi = evaluateBoardObjectives(cupOnly, 1, 'semifinal', 1, 0);
    expect(semi.results.find(r => r.objective.type === 'cup_progress')!.achieved).toBe(false);
  });
});

describe('createBoardObjectivesResultMessage', () => {
  it('publica o impacto de reputação em formato legível pela avaliação', () => {
    const objectives = generateBoardObjectives(league(20, 0), 90, 1);
    const objEval = evaluateBoardObjectives(objectives, 1, 'champion', 1_000_000, 0);
    const msg = createBoardObjectivesResultMessage(objEval.results, objEval.totalRepDelta, objEval.warnings);

    expect(msg.isMandatory).toBe(true);
    expect(msg.body).toContain(`Impacto na reputação: +${objEval.totalRepDelta}`);
  });

  it('gera ids diferentes para mensagens de temporadas diferentes', () => {
    const objectives = generateBoardObjectives(league(20, 0), 90, 1);
    const objEval = evaluateBoardObjectives(objectives, 1, 'champion', 1_000_000, 0);
    const a = createBoardObjectivesResultMessage(objEval.results, objEval.totalRepDelta, []);
    const b = createBoardObjectivesResultMessage(objEval.results, objEval.totalRepDelta, []);
    expect(a.id).not.toBe(b.id);
  });
});
