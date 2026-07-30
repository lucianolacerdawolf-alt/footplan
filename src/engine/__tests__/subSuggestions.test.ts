import { describe, it, expect } from 'vitest';
import { getSubSuggestions } from '../subSuggestions';
import { getStarters } from '../matchHelpers';
import type { Team, Player } from '../types';

function player(id: string, position: Player['position'], overrides: Partial<Player> = {}): Player {
  return {
    id, name: `Jogador ${id}`, number: 1, position, currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
    ...overrides,
  };
}

/**
 * Elenco no formato que o jogo realmente usa: GK, DEF, MID, FWD já agrupados, com
 * mais gente do que a formação exige. O 4-3-3 leva 1 GK + 4 DEF + 3 MID + 3 FWD,
 * então os DEF/MID/FWD extras é que formam o banco — e eles NÃO são os últimos
 * elementos do array `squad`.
 */
function makeSquadTeam(): Team {
  const squad: Player[] = [
    player('gk1', 'GK'), player('gk2', 'GK'),
    ...Array.from({ length: 6 }, (_, i) => player(`def${i + 1}`, 'DEF')),
    ...Array.from({ length: 5 }, (_, i) => player(`mid${i + 1}`, 'MID')),
    ...Array.from({ length: 4 }, (_, i) => player(`fwd${i + 1}`, 'FWD')),
  ];
  return {
    id: 'user', name: 'Meu Time', abbreviation: 'MYT', color: '#000', secondaryColor: '#fff', logoUrl: '',
    squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('getSubSuggestions — banco', () => {
  it('nunca sugere um titular como substituto (regressão: squad.slice(11))', () => {
    const team = makeSquadTeam();
    // Todo mundo cansado para provocar o máximo de sugestões possível
    team.squad.forEach(p => { p.currentFatigue = 90; });

    const starterIds = new Set(getStarters(team).map(p => p.id));
    const suggestions = getSubSuggestions(team, 0, 0);

    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(starterIds.has(s.out.id)).toBe(true);
      for (const c of s.candidates) {
        expect(starterIds.has(c.player.id)).toBe(false);
      }
    }
  });

  it('ignora reservas lesionados, suspensos ou expulsos', () => {
    const team = makeSquadTeam();
    team.squad.forEach(p => { p.currentFatigue = 90; });
    const starterIds = new Set(getStarters(team).map(p => p.id));
    const benchIds = team.squad.filter(p => !starterIds.has(p.id)).map(p => p.id);

    // Deixa todo o banco indisponível de três formas diferentes
    team.squad.filter(p => benchIds.includes(p.id)).forEach((p, i) => {
      if (i % 3 === 0) p.injuredRounds = 2;
      else if (i % 3 === 1) p.isSuspended = true;
    });
    const expelled = benchIds.filter((_, i) => i % 3 === 2);

    const suggestions = getSubSuggestions(team, 0, 0, { injuredIds: expelled });
    expect(suggestions).toEqual([]);
  });
});

describe('getSubSuggestions — risco de cartão', () => {
  it('não sugere risco de cartão quando ninguém levou amarelo', () => {
    const team = makeSquadTeam();
    const suggestions = getSubSuggestions(team, 0, 0);
    expect(suggestions.filter(s => s.type === 'card_risk')).toEqual([]);
  });

  it('sugere só quem está pendurado com amarelo', () => {
    const team = makeSquadTeam();
    const starters = getStarters(team);
    const pendurado = starters.find(p => p.position === 'DEF')!;
    const cards = new Map<string, 'yellow' | 'red'>([[pendurado.id, 'yellow']]);

    const suggestions = getSubSuggestions(team, 0, 0, { cards });
    const cardRisk = suggestions.filter(s => s.type === 'card_risk');

    expect(cardRisk).toHaveLength(1);
    expect(cardRisk[0].out.id).toBe(pendurado.id);
    expect(cardRisk[0].candidates.length).toBeGreaterThan(0);
  });

  it('não sugere trocar quem já foi expulso — ele nem está mais em campo', () => {
    const team = makeSquadTeam();
    const expulso = getStarters(team).find(p => p.position === 'MID')!;
    const cards = new Map<string, 'yellow' | 'red'>([[expulso.id, 'red']]);

    const suggestions = getSubSuggestions(team, 0, 0, { cards });
    expect(suggestions.some(s => s.out.id === expulso.id)).toBe(false);
  });
});

describe('getSubSuggestions — fadiga', () => {
  it('usa a fadiga ao vivo da partida em vez da fadiga de temporada', () => {
    const team = makeSquadTeam(); // todos com currentFatigue 0
    const alvo = getStarters(team).find(p => p.position === 'MID')!;

    expect(getSubSuggestions(team, 0, 0).filter(s => s.type === 'fatigue')).toEqual([]);

    const suggestions = getSubSuggestions(team, 0, 0, { fatigueMap: { [alvo.id]: 85 } });
    const fatigue = suggestions.filter(s => s.type === 'fatigue');
    expect(fatigue).toHaveLength(1);
    expect(fatigue[0].out.id).toBe(alvo.id);
    expect(fatigue[0].reason).toContain('85%');
  });
});

describe('getSubSuggestions — tática', () => {
  it('atrás no placar troca defesa por ataque; à frente faz o contrário', () => {
    const team = makeSquadTeam();

    const perdendo = getSubSuggestions(team, 0, 2).find(s => s.type === 'tactical');
    expect(perdendo?.out.position).toBe('DEF');
    expect(perdendo?.candidates[0].player.position).toBe('FWD');

    const ganhando = getSubSuggestions(team, 2, 0).find(s => s.type === 'tactical');
    expect(ganhando?.out.position).toBe('FWD');
    expect(ganhando?.candidates[0].player.position).toBe('DEF');

    expect(getSubSuggestions(team, 1, 1).some(s => s.type === 'tactical')).toBe(false);
  });

  it('não repete o mesmo jogador em duas sugestões', () => {
    const team = makeSquadTeam();
    team.squad.forEach(p => { p.currentFatigue = 95; });
    const starters = getStarters(team);
    const cards = new Map<string, 'yellow' | 'red'>(
      starters.filter(p => p.position !== 'GK').map(p => [p.id, 'yellow' as const])
    );

    const suggestions = getSubSuggestions(team, 0, 3, { cards });
    const ids = suggestions.map(s => s.out.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
