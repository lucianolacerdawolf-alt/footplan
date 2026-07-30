import { describe, it, expect } from 'vitest';
import { pickHighlights } from '../MatchdayScreen';
import type { Player } from '@/engine/types';

function player(id: string, position: Player['position'], ovrBase: number): Player {
  return {
    id, name: `Jogador ${id}`, number: 1, position, currentFatigue: 0,
    attributes: {
      speed: ovrBase, stamina: ovrBase, passing: ovrBase, finishing: ovrBase,
      tackling: ovrBase, dribbling: ovrBase, vision: ovrBase, positioning: ovrBase,
    },
  };
}

/**
 * O OVR de goleiro é calibrado em outra escala e sai mais alto que o de jogadores
 * de linha, então uma ordenação por OVR puro enchia os destaques de goleiros.
 */
function squadWithStrongKeepers(): Player[] {
  return [
    player('gk1', 'GK', 99), player('gk2', 'GK', 98), player('gk3', 'GK', 97),
    player('def1', 'DEF', 80), player('def2', 'DEF', 78),
    player('mid1', 'MID', 84), player('mid2', 'MID', 82),
    player('fwd1', 'FWD', 86), player('fwd2', 'FWD', 81),
  ];
}

describe('pickHighlights', () => {
  it('não enche os destaques de goleiros mesmo quando eles têm o OVR mais alto (regressão)', () => {
    const picked = pickHighlights(squadWithStrongKeepers());
    expect(picked).toHaveLength(3);
    expect(picked.filter(p => p.position === 'GK')).toHaveLength(0);
  });

  it('escolhe os melhores jogadores de linha, em ordem de OVR', () => {
    const picked = pickHighlights(squadWithStrongKeepers());
    expect(picked.map(p => p.id)).toEqual(['fwd1', 'mid1', 'mid2']);
  });

  it('completa com goleiro só quando faltam jogadores de linha', () => {
    const squad = [player('gk1', 'GK', 90), player('fwd1', 'FWD', 70)];
    const picked = pickHighlights(squad);
    expect(picked.map(p => p.id)).toEqual(['fwd1', 'gk1']);
  });

  it('nunca devolve mais que um goleiro, mesmo num elenco só de goleiros', () => {
    const squad = [player('gk1', 'GK', 90), player('gk2', 'GK', 88), player('gk3', 'GK', 86)];
    const picked = pickHighlights(squad);
    expect(picked.filter(p => p.position === 'GK')).toHaveLength(1);
  });

  it('respeita a contagem pedida e não estoura com elenco vazio', () => {
    expect(pickHighlights([], 3)).toEqual([]);
    expect(pickHighlights(squadWithStrongKeepers(), 2)).toHaveLength(2);
  });
});
