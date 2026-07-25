export type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end'
  | 'league-table' | 'career-league-table' | 'career-trophy-room' | 'transfer-market';

export type MatchContext = 'regular' | 'league' | 'bracket' | 'online';

export type TournamentMode = 'league' | 'bracket';
