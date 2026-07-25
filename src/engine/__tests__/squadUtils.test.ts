import { describe, it, expect } from 'vitest';
import type { Team, Player, Formation } from '@/engine/types';
import { getStarterCount, getStarters, getBench, swapSquadPlayers, rebalanceForFormation, isPlayerUnavailable } from '../squadUtils';

function makePlayer(id: string, position: Player['position'], number: number): Player {
  return {
    id, name: `Player ${id}`, number, position, currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeSquadTeam(formation: Formation): Team {
  const squad: Player[] = [
    ...Array.from({ length: 2 }, (_, i) => makePlayer(`gk${i}`, 'GK', i + 1)),
    ...Array.from({ length: 6 }, (_, i) => makePlayer(`def${i}`, 'DEF', i + 2)),
    ...Array.from({ length: 6 }, (_, i) => makePlayer(`mid${i}`, 'MID', i + 8)),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`fwd${i}`, 'FWD', i + 15)),
  ];
  return {
    id: 'test', name: 'Test FC', abbreviation: 'TST', color: '#111', secondaryColor: '#222', logoUrl: '',
    squad,
    strategy: { formation, mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('getStarterCount', () => {
  it('is 1 GK + formation lines', () => {
    expect(getStarterCount('4-3-3')).toBe(11);
    expect(getStarterCount('4-2-3-1')).toBe(1 + 4 + 5 + 1);
    expect(getStarterCount('5-3-2')).toBe(1 + 5 + 3 + 2);
  });
});

describe('getStarters / getBench', () => {
  it('splits the squad at the starter count for the current formation', () => {
    const team = makeSquadTeam('4-4-2'); // 1+4+4+2 = 11
    expect(getStarters(team)).toHaveLength(11);
    expect(getBench(team)).toHaveLength(team.squad.length - 11);
    expect(getStarters(team).concat(getBench(team))).toEqual(team.squad);
  });
});

describe('swapSquadPlayers', () => {
  it('swaps the two given indexes without mutating the original team', () => {
    const team = makeSquadTeam('4-3-3');
    const a = team.squad[0];
    const b = team.squad[11]; // first bench player
    const swapped = swapSquadPlayers(team, 0, 11);

    expect(swapped).not.toBe(team);
    expect(swapped.squad[0]).toBe(b);
    expect(swapped.squad[11]).toBe(a);
    // original untouched
    expect(team.squad[0]).toBe(a);
    expect(team.squad[11]).toBe(b);
  });
});

describe('rebalanceForFormation', () => {
  it('rebuilds starters/bench per-position for the new formation and updates strategy', () => {
    const team = makeSquadTeam('4-3-3'); // starters: 1 GK, 4 DEF, 3 MID, 3 FWD
    const result = rebalanceForFormation(team, '4-2-3-1'); // starters: 1 GK, 4 DEF, 5 MID, 1 FWD

    expect(result.strategy.formation).toBe('4-2-3-1');
    const starters = getStarters(result);
    expect(starters.filter(p => p.position === 'GK')).toHaveLength(1);
    expect(starters.filter(p => p.position === 'DEF')).toHaveLength(4);
    expect(starters.filter(p => p.position === 'MID')).toHaveLength(5);
    expect(starters.filter(p => p.position === 'FWD')).toHaveLength(1);
    // Same 18 players overall, nobody lost
    expect(result.squad).toHaveLength(team.squad.length);
  });

  it('keeps a stable order within each position group (first N stay starters when count shrinks)', () => {
    const team = makeSquadTeam('4-2-3-1'); // 5 MID starters
    const result = rebalanceForFormation(team, '4-3-3'); // 3 MID starters
    const starters = getStarters(result);
    const starterMidIds = starters.filter(p => p.position === 'MID').map(p => p.id);
    expect(starterMidIds).toEqual(['mid0', 'mid1', 'mid2']);
  });

  it('não escala suspenso quando a nova formação precisa de mais jogadores da posição', () => {
    const team = makeSquadTeam('4-3-3'); // 6 MID no elenco: mid0..mid5
    const mid0Idx = team.squad.findIndex(p => p.id === 'mid0');
    team.squad[mid0Idx] = { ...team.squad[mid0Idx], isSuspended: true }; // mid0 (1º da posição) suspenso

    const result = rebalanceForFormation(team, '4-2-3-1'); // precisa de 5 MID — exatamente os 5 disponíveis restantes
    const starterMidIds = getStarters(result).filter(p => p.position === 'MID').map(p => p.id);

    // mid0 é preterido mesmo sendo o 1º da posição na ordem original — os 5 titulares
    // são exatamente os outros 5 (disponíveis), não "os 5 primeiros do array"
    expect(starterMidIds).not.toContain('mid0');
    expect(starterMidIds).toEqual(['mid1', 'mid2', 'mid3', 'mid4', 'mid5']);
  });
});

describe('isPlayerUnavailable', () => {
  it('is true for a suspended player', () => {
    expect(isPlayerUnavailable(makePlayer('p', 'DEF', 1))).toBe(false);
    expect(isPlayerUnavailable({ ...makePlayer('p', 'DEF', 1), isSuspended: true })).toBe(true);
  });

  it('is true for a currently-injured player, false once injuredRounds is 0', () => {
    expect(isPlayerUnavailable({ ...makePlayer('p', 'DEF', 1), injuredRounds: 2 })).toBe(true);
    expect(isPlayerUnavailable({ ...makePlayer('p', 'DEF', 1), injuredRounds: 0 })).toBe(false);
  });
});
