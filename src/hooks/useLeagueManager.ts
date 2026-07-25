import { useState, useCallback, useEffect } from 'react';
import type { Team, MatchResult } from '../engine/types';
import type { LeagueState, LeagueFixture } from '../engine/tournament';
import {
  generateLeagueSchedule, simularFixtureAuto, simularRodadaAuto,
  recoverFatigue, applyPostMatchInjuries, randomizeCPUTactics,
} from '../engine/tournament';
import { moraleDelta, applyMoraleToTeam } from '../engine/morale';
import { cloneTeam } from '../utils/teamUtils';
import { recordLeagueFixtureResult, applyLeagueRoundMoraleAndInjuries } from './shared/matchHandlers';
import type { LeagueDefinition } from '../data/leagues/types';
import { usePersistedState } from './usePersistedState';
import type { AchievementEvalInput } from './useAchievements';

import type { Screen } from '../types/navigation';

interface UseLeagueManagerParams {
  /** Liga já resolvida pelo chamador (App.tsx passa `selectedLeague`) — pode vir com
   *  elenco sincronizado ao vivo (TournamentSetupScreen sincroniza automaticamente e
   *  propaga via onRosterSynced). Nunca re-resolve por id aqui: fazer isso descartaria
   *  a sincronização e voltaria pros dados estáticos, igual o bug que isso substituiu. */
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

export function useLeagueManager({
  league,
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
  evaluateAchievements, recordH2H, notifySave, setToastMsg,
}: UseLeagueManagerParams) {
  const leagueId = league?.id ?? 'pl';

  // Legacy save migration
  useEffect(() => {
    if (localStorage.getItem('fp:leagueStateMigrated') === '1') return;
    const legacy = localStorage.getItem('fp:leagueState');
    const migrated = localStorage.getItem('fp:leagueState:pl');
    if (legacy && !migrated) {
      localStorage.setItem('fp:leagueState:pl', legacy);
      localStorage.removeItem('fp:leagueState');
    }
    localStorage.setItem('fp:leagueStateMigrated', '1');
  }, []);

  const [leagueState, setLeagueState] = usePersistedState<LeagueState | null>(`fp:leagueState:${leagueId}`, null, { onPersist: notifySave });
  const [pendingLeagueFixture, setPendingLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);

  const handleStartLeague = useCallback((userTeam: Team) => {
    if (!league) return;
    const all = league.teams.map(t => cloneTeam(t));
    const rest = all.filter(t => t.id !== userTeam.id);
    const teams = [userTeam, ...rest];
    const fixtures = generateLeagueSchedule(teams);
    setLeagueState({ teams, userTeamId: userTeam.id, fixtures, currentRound: 0, phase: 'playing' });
    setScreen('league');
  }, [league, setScreen, setLeagueState]);

  const handleEditLeagueTactics = useCallback(() => {
    if (!leagueState) return;
    const userTeam = leagueState.teams.find(t => t.id === leagueState.userTeamId);
    if (!userTeam) return;
    setHomeTeam(cloneTeam(userTeam, true));
    setAwayTeam(cloneTeam(userTeam, true));
    setMatchContext('league'); setIsKnockout(false);
    setIsTournamentEntry(true);
    setScreen('setup');
  }, [leagueState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry]);

  const handlePlayLeagueMatch = useCallback((fixture: LeagueFixture, home: Team, away: Team) => {
    if (!leagueState) return;
    const roundIdx = fixture.roundIndex;
    const fixtureIdx = leagueState.fixtures[roundIdx].findIndex(f => f.id === fixture.id);
    setPendingLeagueFixture({ roundIdx, fixtureIdx });
    setHomeTeam(cloneTeam(home, true)); setAwayTeam(cloneTeam(away, true));
    setMatchContext('league'); setIsKnockout(false);
    setScreen('setup');
  }, [leagueState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);

  const handleSimulateUserLeagueMatch = useCallback(() => {
    if (!leagueState) return;
    const roundIdx = leagueState.currentRound;
    const round = leagueState.fixtures[roundIdx];
    const fixtureIdx = round.findIndex(f => f.homeTeamId === leagueState.userTeamId || f.awayTeamId === leagueState.userTeamId);
    if (fixtureIdx === -1 || round[fixtureIdx].played) return;
    const simulated = simularFixtureAuto(round[fixtureIdx], leagueState.teams);
    const newFixtures = leagueState.fixtures.map((r, ri) =>
      ri === roundIdx ? r.map((f, fi) => fi === fixtureIdx ? simulated : f) : r
    );
    const oppId = simulated.homeTeamId === leagueState.userTeamId ? simulated.awayTeamId : simulated.homeTeamId;
    const newTeams = leagueState.teams.map(t => t.id === oppId ? applyPostMatchInjuries(t, 0.05).team : t);
    const updatedState: LeagueState = { ...leagueState, fixtures: newFixtures, teams: newTeams };
    setLeagueState(updatedState);
    const homeTeamObj = leagueState.teams.find(t => t.id === simulated.homeTeamId)!;
    const awayTeamObj = leagueState.teams.find(t => t.id === simulated.awayTeamId)!;
    evaluateAchievements({
      result: {
        homeTeam: homeTeamObj, awayTeam: awayTeamObj,
        homeScore: simulated.homeScore ?? 0, awayScore: simulated.awayScore ?? 0,
        events: [], homePossession: 50, awayPossession: 50,
        homeStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
        awayStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
      },
      userTeamId: leagueState.userTeamId, matchContext: 'league',
      leagueState: updatedState,
    });
  }, [leagueState, evaluateAchievements, setLeagueState]);

  const handleSimulateLeagueRound = useCallback((roundIndex: number) => {
    if (!leagueState) return;
    const newRound = simularRodadaAuto(leagueState.fixtures[roundIndex], leagueState.teams, leagueState.userTeamId);
    const newTeams = applyLeagueRoundMoraleAndInjuries(newRound, leagueState.teams, leagueState.userTeamId);
    setLeagueState({ ...leagueState, fixtures: leagueState.fixtures.map((r, i) => i === roundIndex ? newRound : r), teams: newTeams });
  }, [leagueState, setLeagueState]);

  const handleNextLeagueRound = useCallback(() => {
    if (!leagueState) return;
    const currentRound = leagueState.currentRound;
    const currentFixtures = leagueState.fixtures[currentRound];
    let state = leagueState;
    if (currentFixtures.some(f => !f.played)) {
      const newRound = simularRodadaAuto(currentFixtures, state.teams, state.userTeamId);
      const newTeams = applyLeagueRoundMoraleAndInjuries(newRound, state.teams, state.userTeamId);
      state = { ...state, fixtures: state.fixtures.map((r, i) => i === currentRound ? newRound : r), teams: newTeams };
    }
    const next = currentRound + 1;
    const recoveredTeams = recoverFatigue(state.teams);
    const variedTeams = randomizeCPUTactics(recoveredTeams, state.userTeamId, Math.random, league?.cpuProfile);
    const phase: LeagueState['phase'] = next >= state.fixtures.length ? 'done' : 'playing';
    const updatedState: LeagueState = { ...state, teams: variedTeams, currentRound: next, phase };
    setLeagueState(updatedState);
    if (phase === 'done') {
      evaluateAchievements({
        result: null as unknown as MatchResult, userTeamId: state.userTeamId,
        matchContext: 'league', leagueState: updatedState,
      });
    }
  }, [leagueState, league, evaluateAchievements, setLeagueState]);

  const handleLeagueMatchResult = useCallback((result: MatchResult) => {
    if (!leagueState || !pendingLeagueFixture) return;
    const { roundIdx, fixtureIdx } = pendingLeagueFixture;
    const fixture = leagueState.fixtures[roundIdx][fixtureIdx];
    const userIsHome = fixture.homeTeamId === leagueState.userTeamId;
    const userScore = userIsHome ? result.homeScore : result.awayScore;
    const oppScore = userIsHome ? result.awayScore : result.homeScore;
    const delta = moraleDelta(userScore, oppScore);
    const newFixtures = recordLeagueFixtureResult(leagueState.fixtures, roundIdx, fixtureIdx, result.homeScore, result.awayScore);
    const newTeams = leagueState.teams.map(t => {
      if (t.id !== leagueState.userTeamId) return t;
      const current = t.morale ?? 0;
      const withMorale = applyMoraleToTeam(t, current, delta);
      const { team: injured, injuries } = applyPostMatchInjuries(withMorale);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} rodada${inj.rounds > 1 ? 's' : ''}`);
      }
      return injured;
    });
    const updatedState: typeof leagueState = { ...leagueState, fixtures: newFixtures, teams: newTeams };
    setLeagueState(updatedState);
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    evaluateAchievements({
      result, userTeamId: leagueState.userTeamId, matchContext: 'league',
      leagueState: updatedState,
    });
  }, [leagueState, pendingLeagueFixture, evaluateAchievements, recordH2H, setToastMsg, setLeagueState]);

  return {
    leagueState, setLeagueState,
    pendingLeagueFixture,
    handleStartLeague, handlePlayLeagueMatch, handleSimulateUserLeagueMatch,
    handleSimulateLeagueRound, handleNextLeagueRound, handleLeagueMatchResult,
    handleEditLeagueTactics,
  };
}
