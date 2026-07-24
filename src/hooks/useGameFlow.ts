import { useCallback } from 'react';
import type { Team, MatchResult } from '../engine/types';
import type { GameMode } from '../components/TeamSelectionScreen';
import type { LeagueState, BracketState } from '../engine/tournament';
import type { AchievementEvalInput } from './useAchievements';

type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end';
type MatchContext = 'regular' | 'league' | 'bracket' | 'online';

interface UseGameFlowParams {
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: MatchContext) => void;
  setIsKnockout: (v: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  setIsTournamentEntry: (v: boolean) => void;
  setLeagueState: React.Dispatch<React.SetStateAction<LeagueState | null>>;
  setBracketState: React.Dispatch<React.SetStateAction<BracketState | null>>;
  setLastResult: (r: MatchResult | null) => void;
  matchContext: MatchContext;
  isTournamentEntry: boolean;
  isCareerMode: boolean;
  leagueState: LeagueState | null;
  bracketState: BracketState | null;
  homeTeam: Team | null;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  evaluateAchievements: (input: AchievementEvalInput) => void;
}

export function useGameFlow({
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
  setGameMode, setIsTournamentEntry, setLeagueState, setBracketState,
  setLastResult, matchContext, isTournamentEntry, isCareerMode, leagueState, bracketState,
  homeTeam, recordH2H, evaluateAchievements,
}: UseGameFlowParams) {
  const handleTeamsSelected = useCallback((home: Team, away: Team, mode: GameMode) => {
    setHomeTeam(home); setAwayTeam(away); setGameMode(mode);
    setMatchContext('regular'); setIsKnockout(false);
    setScreen('setup');
  }, [setMatchContext, setIsKnockout, setScreen, setHomeTeam, setAwayTeam, setGameMode]);

  const handleStartMatch = useCallback((home: Team, away: Team) => {
    if (matchContext === 'league' && leagueState) {
      const userIsHome = home.id === leagueState.userTeamId;
      const userTeamConfigured = userIsHome ? home : away;
      setLeagueState(prev => prev ? {
        ...prev,
        teams: prev.teams.map(t => t.id === prev.userTeamId
          ? { ...t, strategy: userTeamConfigured.strategy, squad: userTeamConfigured.squad }
          : t),
      } : prev);
    }
    if (matchContext === 'bracket' && bracketState) {
      const userIsHome = home.id === bracketState.userTeamId;
      const userTeamConfigured = userIsHome ? home : away;
      setBracketState(prev => prev ? {
        ...prev,
        teams: prev.teams.map(t => t.id === prev.userTeamId
          ? { ...t, strategy: userTeamConfigured.strategy, squad: userTeamConfigured.squad }
          : t),
      } : prev);
    }
    if (isTournamentEntry) {
      setIsTournamentEntry(false);
      setScreen(isCareerMode ? (matchContext === 'league' ? 'career-league' : 'career-bracket') : (matchContext === 'league' ? 'league' : 'bracket'));
      return;
    }
    setHomeTeam(home); setAwayTeam(away);
    setScreen('match');
  }, [isTournamentEntry, isCareerMode, matchContext, leagueState, bracketState, setLeagueState, setBracketState, setIsTournamentEntry, setScreen, setHomeTeam, setAwayTeam]);

  const handleViewStats = useCallback((result: MatchResult) => {
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    setLastResult(result);
    setScreen('stats');
    const userIsHome = homeTeam?.id === result.homeTeam.id;
    const userTeamId = userIsHome ? result.homeTeam.id : result.awayTeam.id;
    evaluateAchievements({ result, userTeamId, matchContext: 'regular' });
  }, [recordH2H, evaluateAchievements, homeTeam, setScreen, setLastResult]);

  return { handleTeamsSelected, handleStartMatch, handleViewStats };
}
