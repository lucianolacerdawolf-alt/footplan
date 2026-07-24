import { useState, useCallback } from 'react';
import type { Team, MatchResult } from '../engine/types';
import type { BracketState, BracketMatch, PlayableStage } from '../engine/tournament';
import {
  createBracket, advanceBracket, simularBracketMatch,
  applyPostMatchInjuries, randomizeCPUTactics,
} from '../engine/tournament';
import { cloneTeam } from '../utils/teamUtils';
import { shuffle } from '../engine/rng';
import { getLeague } from '../data/leagues';
import { usePersistedState } from './usePersistedState';
import type { AchievementEvalInput } from './useAchievements';
import type { LeagueDefinition } from '../data/leagues/types';

type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end';

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
    const stage = bracketState.stage as PlayableStage;
    const matches = stage === 'roundOf16' ? bracketState.roundOf16
      : stage === 'quarterfinals' ? bracketState.quarterFinals
      : stage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    let s = { ...bracketState };
    const injuredIds = new Set<string>();
    matches.forEach((match, idx) => {
      const isUser = match.homeTeamId === bracketState.userTeamId || match.awayTeamId === bracketState.userTeamId;
      if (isUser || match.played) return;
      const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
      const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
      const sim = simularBracketMatch(home, away);
      const updated: BracketMatch = { ...match, ...sim };
      if (stage === 'roundOf16') { const r16 = [...s.roundOf16]; r16[idx] = updated; s = { ...s, roundOf16: r16 }; }
      else if (stage === 'quarterfinals') { const qf = [...s.quarterFinals]; qf[idx] = updated; s = { ...s, quarterFinals: qf }; }
      else if (stage === 'semifinals') { const sf = [...s.semiFinals]; sf[idx] = updated; s = { ...s, semiFinals: sf }; }
      else { s = { ...s, final: updated }; }
      injuredIds.add(home.id); injuredIds.add(away.id);
    });
    s = { ...s, teams: s.teams.map(t => injuredIds.has(t.id) ? applyPostMatchInjuries(t, 0.05).team : t) };
    setBracketState(advanceBracket(s));
  }, [bracketState, setBracketState]);

  const handleSimulateBracketMatch = useCallback((stage: PlayableStage, matchIdx: number) => {
    if (!bracketState) return;
    const stageMatches = stage === 'roundOf16' ? bracketState.roundOf16
      : stage === 'quarterfinals' ? bracketState.quarterFinals
      : stage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[matchIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const sim = simularBracketMatch(home, away);
    const updated: BracketMatch = { ...match, ...sim };
    let s = { ...bracketState };
    if (stage === 'roundOf16') { const r16 = [...s.roundOf16]; r16[matchIdx] = updated; s = { ...s, roundOf16: r16 }; }
    else if (stage === 'quarterfinals') { const qf = [...s.quarterFinals]; qf[matchIdx] = updated; s = { ...s, quarterFinals: qf }; }
    else if (stage === 'semifinals') { const sf = [...s.semiFinals]; sf[matchIdx] = updated; s = { ...s, semiFinals: sf }; }
    else { s = { ...s, final: updated }; }
    setBracketState(advanceBracket(s));
  }, [bracketState, setBracketState]);

  const handleBracketMatchResult = useCallback((result: MatchResult) => {
    if (!bracketState || !pendingBracketStage) return;
    const stageMatches = pendingBracketStage === 'roundOf16' ? bracketState.roundOf16
      : pendingBracketStage === 'quarterfinals' ? bracketState.quarterFinals
      : pendingBracketStage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[pendingBracketIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const winnerId = result.winner?.id
      ?? (result.penaltyResult ? (result.penaltyResult.winner === 'home' ? home.id : away.id)
        : result.homeScore >= result.awayScore ? home.id : away.id);
    const updated: BracketMatch = {
      ...match,
      homeScore: result.homeScore, awayScore: result.awayScore,
      wentToExtraTime: result.wentToExtraTime,
      extraTimeHomeScore: result.extraTimeHomeScore,
      extraTimeAwayScore: result.extraTimeAwayScore,
      penaltyHomeScore: result.penaltyResult?.homeScore,
      penaltyAwayScore: result.penaltyResult?.awayScore,
      winnerId, played: true,
    };
    let s = { ...bracketState };
    if (pendingBracketStage === 'roundOf16') { const r16 = [...s.roundOf16]; r16[pendingBracketIdx] = updated; s = { ...s, roundOf16: r16 }; }
    else if (pendingBracketStage === 'quarterfinals') { const qf = [...s.quarterFinals]; qf[pendingBracketIdx] = updated; s = { ...s, quarterFinals: qf }; }
    else if (pendingBracketStage === 'semifinals') { const sf = [...s.semiFinals]; sf[pendingBracketIdx] = updated; s = { ...s, semiFinals: sf }; }
    else { s = { ...s, final: updated }; }
    const advanced = advanceBracket(s);
    const finalState = { ...advanced, teams: randomizeCPUTactics(advanced.teams.map(t => {
      if (t.id !== advanced.userTeamId) return t;
      const { team: injured, injuries } = applyPostMatchInjuries(t);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} jogo${inj.rounds > 1 ? 's' : ''}`);
      }
      return injured;
    }), advanced.userTeamId, Math.random, league?.cpuProfile) };
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
