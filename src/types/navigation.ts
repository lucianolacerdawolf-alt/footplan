export type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'matchday' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end'
  | 'league-table' | 'career-league-table' | 'career-trophy-room' | 'transfer-market'
  | 'career-job-market' | 'career-continental';

/** Callbacks de navegação da carreira com identidade estável. Agrupados num
 *  objeto (memoizado no App) para que as telas de carreira React.memo consigam
 *  pular re-renders — arrows inline no screenMap furariam o memo. */
export interface CareerNav {
  exitCareer: () => void;
  toHub: () => void;
  toCareerLeague: () => void;
  toCareerLeagueTable: () => void;
  toCareerBracket: () => void;
  toCareerContinental: () => void;
  toCareerJobMarket: () => void;
  toTransferMarket: () => void;
  toTradePropose: () => void;
}

export type MatchContext = 'regular' | 'league' | 'bracket' | 'online';

export type TournamentMode = 'league' | 'bracket';

export function goesViaMatchday(matchContext: MatchContext): boolean {
  return matchContext === 'league' || matchContext === 'bracket';
}
