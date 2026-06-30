import type { LeagueDefinition } from './types';
import { premierLeagueTeams } from '../premierLeague';

export const premierLeague: LeagueDefinition = {
  id: 'pl',
  name: 'Premier League',
  country: 'Inglaterra',
  cupName: 'FA Cup',
  cupLogo: 'https://crests.football-data.org/fa_cup.png',
  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  color: '#3d195b',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png',
  totalRounds: 38,
  teams: premierLeagueTeams,
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.0, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.0 },
  relegationSpots: 3,
};
