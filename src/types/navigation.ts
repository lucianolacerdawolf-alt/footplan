export type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'matchday' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end'
  | 'league-table' | 'career-league-table' | 'career-trophy-room' | 'transfer-market'
  | 'career-job-market' | 'career-continental';

export type MatchContext = 'regular' | 'league' | 'bracket' | 'online';

export type TournamentMode = 'league' | 'bracket';

export function goesViaMatchday(matchContext: MatchContext): boolean {
  return matchContext === 'league' || matchContext === 'bracket';
}
