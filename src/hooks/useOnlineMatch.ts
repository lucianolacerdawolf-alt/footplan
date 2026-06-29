import { useCallback, useRef } from 'react';
import type { Team, MatchResult } from '../engine/types';
import { SeededRng } from '../engine/rng';
import type { AchievementEvalInput } from './useAchievements';

type Screen = 'league-select' | 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby';

interface UseOnlineMatchParams {
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: 'regular' | 'league' | 'bracket' | 'online') => void;
  setIsKnockout: (v: boolean) => void;
  setLastResult: (r: MatchResult | null) => void;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  evaluateAchievements: (input: AchievementEvalInput) => void;
  homeTeam: Team | null;
}

export function useOnlineMatch({
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
  setLastResult, recordH2H, evaluateAchievements, homeTeam,
}: UseOnlineMatchParams) {
  const onlineRngRef = useRef<SeededRng | null>(null);

  const handleStartOnlineMatch = useCallback((home: Team, away: Team, seed: number) => {
    const rng = new SeededRng(seed);
    onlineRngRef.current = rng;
    setHomeTeam(home); setAwayTeam(away);
    setMatchContext('online'); setIsKnockout(false);
    setScreen('match');
  }, [setMatchContext, setIsKnockout, setScreen, setHomeTeam, setAwayTeam]);

  const handleOnlineMatchResult = useCallback((result: MatchResult) => {
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    setLastResult(result);
    setScreen('stats');
    const userIsHome = homeTeam?.id === result.homeTeam.id;
    const userTeamId = userIsHome ? result.homeTeam.id : result.awayTeam.id;
    evaluateAchievements({ result, userTeamId, matchContext: 'regular' });
  }, [recordH2H, evaluateAchievements, homeTeam, setScreen, setLastResult]);

  return { onlineRngRef, handleStartOnlineMatch, handleOnlineMatchResult };
}
