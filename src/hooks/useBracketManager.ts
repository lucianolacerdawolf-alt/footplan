import { useState, useCallback } from 'react';
import type { Team, MatchResult } from '../engine/types';
import type { BracketState, BracketMatch, PlayableStage } from '../engine/tournament';
import {
  createBracket, advanceBracket, simularBracketMatch,
  applyPostMatchInjuries, randomizeCPUTactics,
} from '../engine/tournament';
import { cloneTeam } from '../utils/teamUtils';
import { getStageMatches, updateStageMatch } from '../engine/bracketHelpers';
import { simulateAllCpuBracketMatches, buildBracketMatchFromResult } from './shared/matchHandlers';
import { shuffle } from '../engine/rng';
import { getLeague } from '../data/leagues';
import { usePersistedState } from './usePersistedState';
import type { AchievementEvalInput } from './useAchievements';
import type { LeagueDefinition } from '../data/leagues/types';

import type { Screen } from '../types/navigation';

interface UseBracketManagerParams {
  league: LeagueDefinition | null;
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: 'regular' | 'league' | 'bracket' | 'online') => void;
  setIsKnockout: (v: boolean) => void;
  setIsTournamentEntry: (v: boolean) => void;
  evaluateAchievements: (input: AchievementEvalInput) => void;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  notifySave: () => void;
  setToastMsg: (msg: string | null) => void;
}

export function useBracketManager({
  league,
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
  evaluateAchievements, recordH2H, notifySave, setToastMsg,
}: UseBracketManagerParams) {
  const [bracketState, setBracketState] = usePersistedState<BracketState | null>('fp:bracketState', null, { onPersist: notifySave });
  const [pendingBracketStage, setPendingBracketStage] = useState<PlayableStage | null>(null);
  const [pendingBracketIdx, setPendingBracketIdx] = useState<number>(0);

  const handleStartBracket = useCallback((userTeam: Team) => {
    const pool = (league?.teams ?? getLeague('pl')!.teams);
    const others = shuffle(pool.filter(t => t.id !== userTeam.id))
      .slice(0, 15)
      .map(t => cloneTeam(t));
    const cupName = league?.cupName ?? 'Copa';
    const leagueId = league?.id ?? 'pl';
    const bracket = createBracket(userTeam, others, cupName, leagueId);
    setBracketState(bracket);
    setScreen('bracket');
  }, [league, setScreen, setBracketState]);

  const handleEditBracketTactics = useCallback(() => {
    if (!bracketState) return;
    const userTeam = bracketState.teams.find(t => t.id === bracketState.userTeamId);
    if (!userTeam) return;
    setHomeTeam(cloneTeam(userTeam, true));
    setAwayTeam(cloneTeam(userTeam, true));
    setMatchContext('bracket'); setIsKnockout(true);
    setIsTournamentEntry(true);
    setScreen('setup');
  }, [bracketState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry]);

  const handlePlayBracketMatch = useCallback((_match: BracketMatch, home: Team, away: Team, stage: PlayableStage, matchIdx: number) => {
    setPendingBracketStage(stage);
    setPendingBracketIdx(matchIdx);
    setHomeTeam(cloneTeam(home, true)); setAwayTeam(cloneTeam(away, true));
    setMatchContext('bracket'); setIsKnockout(true);
    setScreen('setup');
  }, [setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);

  const handleSimulateOtherBracketMatches = useCallback(() => {
    if (!bracketState) return;
    setBracketState(simulateAllCpuBracketMatches(bracketState));
  }, [bracketState, setBracketState]);

  const handleSimulateBracketMatch = useCallback((_stage: PlayableStage, matchIdx: number) => {
    if (!bracketState) return;
    const stageMatches = getStageMatches(bracketState);
    const match = stageMatches[matchIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const sim = simularBracketMatch(home, away);
    const updated: BracketMatch = { ...match, ...sim };
    let s = { ...bracketState };
    s = updateStageMatch(s, matchIdx, updated);
    setBracketState(advanceBracket(s));
  }, [bracketState, setBracketState]);

  const handleBracketMatchResult = useCallback((result: MatchResult) => {
    if (!bracketState || !pendingBracketStage) return;
    const stageMatches = getStageMatches(bracketState);
    const match = stageMatches[pendingBracketIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const updated = buildBracketMatchFromResult(match, result, home.id, away.id);
    let s = { ...bracketState };
    s = updateStageMatch(s, pendingBracketIdx, updated);
    s = advanceBracket(s);
    const finalState = { ...s, teams: randomizeCPUTactics(s.teams.map(t => {
      if (t.id !== s.userTeamId) return t;
      const { team: injured, injuries } = applyPostMatchInjuries(t);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} jogo${inj.rounds > 1 ? 's' : ''}`);
      }
      return injured;
    }), s.userTeamId, Math.random, league?.cpuProfile) };
    setBracketState(finalState);
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    evaluateAchievements({
      result, userTeamId: bracketState.userTeamId, matchContext: 'bracket',
      bracketState: finalState,
    });
  }, [bracketState, pendingBracketStage, pendingBracketIdx, evaluateAchievements, recordH2H, setToastMsg, setBracketState, league?.cpuProfile]);

  return {
    bracketState, setBracketState,
    pendingBracketStage, pendingBracketIdx,
    handleStartBracket, handlePlayBracketMatch, handleSimulateOtherBracketMatches,
    handleSimulateBracketMatch, handleBracketMatchResult,
    handleEditBracketTactics,
  };
}
