import type { Team, Player, Strategy } from '../../engine/types';
import type { LeagueDefinition } from '../../data/leagues/types';

const strategy: Strategy = { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };

function makePlayer(id: string, name: string, position: Player['position'], number: number): Player {
  return {
    id, name, number, position, currentFatigue: 0,
    attributes: { speed: 75, stamina: 75, passing: 75, finishing: 75, tackling: 75, dribbling: 75, vision: 75, positioning: 75 },
  };
}

export function makeTeam(id: string, name: string, abbreviation: string): Team {
  return {
    id, name, abbreviation, color: '#111111', secondaryColor: '#eeeeee', logoUrl: '',
    squad: [
      makePlayer(`${id}-gk`, `${name} Goleiro`, 'GK', 1),
      makePlayer(`${id}-def`, `${name} Zagueiro`, 'DEF', 4),
      makePlayer(`${id}-mid`, `${name} Meia`, 'MID', 8),
      makePlayer(`${id}-fwd`, `${name} Atacante`, 'FWD', 9),
    ],
    strategy,
  };
}

export const testTeams: Team[] = [makeTeam('t1', 'Time A', 'TMA'), makeTeam('t2', 'Time B', 'TMB')];

export function makeLeague(): LeagueDefinition {
  return {
    id: 'test-league', name: 'Liga Teste', country: 'Testland', flag: '', color: '#000000', logo: '',
    totalRounds: 2, teams: testTeams, cupName: 'Copa Teste', cupLogo: '',
    europeanSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
    cpuProfile: { pressingMod: 1, defensiveLineMod: 1, tempoMod: 1, passingFocusMod: 1 },
    relegationSpots: 1,
  };
}
