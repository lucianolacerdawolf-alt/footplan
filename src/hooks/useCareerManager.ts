import { useState, useCallback, useEffect, useRef } from 'react';
import type { Team, MatchResult } from '../engine/types';
import type { LeagueFixture, BracketMatch, PlayableStage } from '../engine/tournament';
import {
  simularFixtureAuto, simularRodadaAuto,
  recoverFatigue, applyPostMatchInjuries, randomizeCPUTactics,
  advanceBracket, simularBracketMatch,
  computeStandings,
} from '../engine/tournament';
import { moraleDelta, applyMoraleToTeam } from '../engine/morale';
import { applyMatchFatigue } from '../engine/fitness';
import { applyMatchCards, clearSuspensions } from '../engine/discipline';
import { assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome } from '../engine/transferMarket';
import { createInjuryMessage, createMatchPreviewMessage, createTransferWindowMessage, createWelcomeMessage, hasMandatoryUnread } from '../engine/inbox';
import { computeUserSeasonRecord, deriveTopScorer, isManagerOfSeason, tallyUserGoals, mergeGoalTally } from '../engine/seasonClosure';
import { cloneTeam } from '../utils/teamUtils';
import { getStageMatches, updateStageMatch } from '../engine/bracketHelpers';
import { allLeagues, getLeague } from '../data/leagues';
import type { LeagueDefinition } from '../data/leagues/types';
import { usePersistedState } from './usePersistedState';
import { useCloudSave } from './useCloudSave';
import { recordLeagueFixtureResult, applyLeagueRoundMoraleAndInjuries, simulateAllCpuBracketMatches, buildBracketMatchFromResult } from './shared/matchHandlers';
import type { CareerState, CareerSeasonHistoryEntry, InboxMessage } from '../engine/career';
import {
  isValidCareerState, assignInitialAges, createCareerSeason,
  evaluateTradeOffer, canProposeTrade, computeReputationDelta, progressAllLeagues, deriveCupResult,
  getFinances, getInbox,
} from '../engine/career';

import type { Screen } from '../types/navigation';

interface UseCareerManagerParams {
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: 'regular' | 'league' | 'bracket' | 'online') => void;
  setIsKnockout: (v: boolean) => void;
  setIsTournamentEntry: (v: boolean) => void;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  notifySave: () => void;
  setToastMsg: (msg: string | null) => void;
}

export function useCareerManager({
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
  recordH2H, notifySave, setToastMsg,
}: UseCareerManagerParams) {
  const [careerState, setCareerState] = usePersistedState<CareerState | null>('fp:career', null, { onPersist: notifySave });

  const { status: cloudStatus, loadFromCloud, enqueueCloudSave, retry: retryCloudSave } = useCloudSave();

  // T-04.4-02: fp:career pode ser JSON sintaticamente válido mas com shape errado
  // (editado manualmente no DevTools, ou versão antiga). Roda só no mount — não a
  // cada mudança de careerState, senão brigaria com uma atualização legítima em
  // andamento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (careerState !== null && !isValidCareerState(careerState)) {
      setCareerState(null);
    }
  }, []);

  // Cloud save: tenta carregar do Supabase no mount se não houver save local.
  // Se o cloud tiver dados, sobrescreve o localStorage.
  useEffect(() => {
    loadFromCloud().then(cloudState => {
      if (cloudState && isValidCareerState(cloudState)) {
        setCareerState(cloudState);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cloud save: debounce-save a cada mudança de careerState (pula o mount inicial).
  const cloudMountedRef = useRef(false);
  useEffect(() => {
    if (!cloudMountedRef.current) {
      cloudMountedRef.current = true;
      return;
    }
    if (careerState) {
      enqueueCloudSave(careerState);
    }
  }, [careerState, enqueueCloudSave]);

  const [pendingCareerLeagueFixture, setPendingCareerLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);
  const [pendingCareerBracketStage, setPendingCareerBracketStage] = useState<PlayableStage | null>(null);
  const [pendingCareerBracketIdx, setPendingCareerBracketIdx] = useState<number>(0);

  const handleStartCareer = useCallback((userTeam: Team, leagueDef: LeagueDefinition, managerName: string) => {
    const rosters: Record<string, Team[]> = {};
    for (const l of allLeagues) {
      if (l.id === leagueDef.id) {
        // D-04: valuation só é calculada pro elenco da própria liga do usuário —
        // as outras 5 ligas nunca exibem valor de mercado nesta versão.
        rosters[l.id] = assignInitialAges(l.teams.map(t => t.id === userTeam.id ? cloneTeam(userTeam) : cloneTeam(t)))
          .map(assignMarketValues);
      } else {
        rosters[l.id] = assignInitialAges(l.teams.map(t => cloneTeam(t)));
      }
    }
    // Tolerante ao mesmo jeito que o resto desta função é: se o time do usuário não
    // bater com nenhum id estático da liga (ex: fixture de teste), ainda assim
    // segue — só não fica "achatado" com os valores de mercado dos outros times.
    const userTeamWithValues = rosters[leagueDef.id].find(t => t.id === userTeam.id) ?? assignMarketValues(cloneTeam(userTeam));
    const { league, cup } = createCareerSeason(userTeamWithValues, rosters[leagueDef.id], leagueDef);
    const budget = initialBudget(leagueDef.id);
    const trimmedName = managerName.trim().slice(0, 24) || 'Técnico';
    const newState: CareerState = {
      version: 1,
      leagueId: leagueDef.id,
      manager: { name: trimmedName, reputation: 0 },
      currentSeasonYear: 1,
      season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: budget, userGoalScorers: {} },
      rosters,
      history: [],
      finances: { budget, wageBill: computeWageBill(userTeamWithValues), weeklyIncome: computeWeeklyIncome(leagueDef.id) },
      inbox: [createWelcomeMessage(trimmedName, budget, 'Temporada 1')],
    };
    setCareerState(newState);
    setScreen('career-hub');
  }, [setCareerState, setScreen]);

  const handleEditCareerLeagueTactics = useCallback(() => {
    if (!careerState) return;
    const userTeam = careerState.season.league.teams.find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return;
    setHomeTeam(cloneTeam(userTeam, true));
    setAwayTeam(cloneTeam(userTeam, true));
    setMatchContext('league'); setIsKnockout(false);
    setIsTournamentEntry(true);
    setScreen('setup');
  }, [careerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry]);

  const handlePlayCareerLeagueMatch = useCallback((fixture: LeagueFixture, home: Team, away: Team) => {
    if (!careerState) return;
    const roundIdx = fixture.roundIndex;
    const fixtureIdx = careerState.season.league.fixtures[roundIdx].findIndex(f => f.id === fixture.id);
    setPendingCareerLeagueFixture({ roundIdx, fixtureIdx });
    setHomeTeam(cloneTeam(home, true)); setAwayTeam(cloneTeam(away, true));
    setMatchContext('league'); setIsKnockout(false);
    setScreen('setup');
  }, [careerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);

  /** Atalho do Hub: pula direto pra tática do próximo jogo da liga, sem passar pela tela de rodada. */
  const handlePlayNextCareerMatch = useCallback(() => {
    if (!careerState) return;
    const { league } = careerState.season;
    const round = league.fixtures[league.currentRound];
    const fixture = round.find(f => (f.homeTeamId === league.userTeamId || f.awayTeamId === league.userTeamId) && !f.played);
    if (!fixture) { setScreen('career-league'); return; }
    const home = league.teams.find(t => t.id === fixture.homeTeamId)!;
    const away = league.teams.find(t => t.id === fixture.awayTeamId)!;
    handlePlayCareerLeagueMatch(fixture, home, away);
  }, [careerState, setScreen, handlePlayCareerLeagueMatch]);

  const handleSimulateUserCareerLeagueMatch = useCallback(() => {
    if (!careerState) return;
    const leg = careerState.season.league;
    const roundIdx = leg.currentRound;
    const round = leg.fixtures[roundIdx];
    const fixtureIdx = round.findIndex(f => f.homeTeamId === leg.userTeamId || f.awayTeamId === leg.userTeamId);
    if (fixtureIdx === -1 || round[fixtureIdx].played) return;
    const simulated = simularFixtureAuto(round[fixtureIdx], leg.teams);
    const newFixtures = leg.fixtures.map((r, ri) =>
      ri === roundIdx ? r.map((f, fi) => fi === fixtureIdx ? simulated : f) : r
    );
    const oppId = simulated.homeTeamId === leg.userTeamId ? simulated.awayTeamId : simulated.homeTeamId;
    const newTeams = leg.teams.map(t => t.id === oppId ? applyPostMatchInjuries(t, 0.05).team : t);
    const updatedState = { ...leg, fixtures: newFixtures, teams: newTeams };
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, league: updatedState } } : prev);
  }, [careerState, setCareerState]);

  const handleSimulateCareerLeagueRound = useCallback((roundIndex: number) => {
    if (!careerState) return;
    const leg = careerState.season.league;
    const newRound = simularRodadaAuto(leg.fixtures[roundIndex], leg.teams, leg.userTeamId);
    const newTeams = applyLeagueRoundMoraleAndInjuries(newRound, leg.teams, leg.userTeamId);
    const updatedState = { ...leg, fixtures: leg.fixtures.map((r, i) => i === roundIndex ? newRound : r), teams: newTeams };
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, league: updatedState } } : prev);
  }, [careerState, setCareerState]);

  const handleNextCareerLeagueRound = useCallback(() => {
    if (!careerState) return;
    // Mensagens obrigatórias (ex: relatório de lesão) precisam ser lidas antes de
    // avançar — o botão na UI já fica desabilitado, isto é a barreira de verdade.
    if (hasMandatoryUnread(getInbox(careerState))) {
      setToastMsg('📬 Leia as mensagens obrigatórias na Central antes de avançar a rodada');
      return;
    }
    const leg = careerState.season.league;
    const next = leg.currentRound + 1;
    const recoveredTeams = recoverFatigue(leg.teams).map(clearSuspensions);
    const variedTeams = randomizeCPUTactics(recoveredTeams, leg.userTeamId, Math.random, undefined);
    const phase: typeof leg.phase = next >= leg.fixtures.length ? 'done' : 'playing';
    const updatedState = { ...leg, teams: variedTeams, currentRound: next, phase };

    const finances = getFinances(careerState);
    const userTeamAfter = variedTeams.find(t => t.id === leg.userTeamId)!;
    const wageBill = computeWageBill(userTeamAfter);
    const budget = finances.budget + finances.weeklyIncome - wageBill;

    const newMessages: InboxMessage[] = [];
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${next + 1}`;
    const wasWindowOpen = leg.currentRound <= 4 || (leg.currentRound >= 18 && leg.currentRound <= 23);
    const isWindowOpenNow = next <= 4 || (next >= 18 && next <= 23);
    if (!wasWindowOpen && isWindowOpenNow) newMessages.push(createTransferWindowMessage(dateLabel));
    if (phase !== 'done') {
      const nextFixture = leg.fixtures[next].find(f => f.homeTeamId === leg.userTeamId || f.awayTeamId === leg.userTeamId);
      if (nextFixture) {
        const isHome = nextFixture.homeTeamId === leg.userTeamId;
        const oppId = isHome ? nextFixture.awayTeamId : nextFixture.homeTeamId;
        const oppName = variedTeams.find(t => t.id === oppId)?.name ?? '???';
        newMessages.push(createMatchPreviewMessage(oppName, isHome, `Rodada ${next + 1}`, dateLabel));
      }
    }

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        season: { ...prev.season, league: updatedState },
        finances: { ...finances, budget, wageBill },
        inbox: newMessages.length > 0 ? [...getInbox(prev), ...newMessages] : prev.inbox,
      };
    });
  }, [careerState, setCareerState, setToastMsg]);

  const handleCareerLeagueMatchResult = useCallback((result: MatchResult) => {
    if (!careerState || !pendingCareerLeagueFixture) return;
    const leg = careerState.season.league;
    const { roundIdx, fixtureIdx } = pendingCareerLeagueFixture;
    const fixture = leg.fixtures[roundIdx][fixtureIdx];
    const userIsHome = fixture.homeTeamId === leg.userTeamId;
    const userScore = userIsHome ? result.homeScore : result.awayScore;
    const oppScore = userIsHome ? result.awayScore : result.homeScore;
    const delta = moraleDelta(userScore, oppScore);
    const newFixtures = recordLeagueFixtureResult(leg.fixtures, roundIdx, fixtureIdx, result.homeScore, result.awayScore);
    const newInjuryMessages: InboxMessage[] = [];
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${leg.currentRound + 1}`;
    const newTeams = leg.teams.map(t => {
      if (t.id !== leg.userTeamId) return t;
      const current = t.morale ?? 0;
      const withMorale = applyMoraleToTeam(t, current, delta);
      const { team: injured, injuries } = applyPostMatchInjuries(withMorale);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} rodada${inj.rounds > 1 ? 's' : ''}`);
        newInjuryMessages.push(createInjuryMessage(inj.player.name, inj.rounds, dateLabel));
      }
      const tired = applyMatchFatigue(injured);
      return applyMatchCards(tired, result.events);
    });
    const updatedState = { ...leg, fixtures: newFixtures, teams: newTeams };
    const goalScorers = tallyUserGoals(result.events, leg.userTeamId);
    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        season: {
          ...prev.season, league: updatedState,
          userGoalScorers: mergeGoalTally(prev.season.userGoalScorers, goalScorers),
        },
        inbox: newInjuryMessages.length > 0 ? [...getInbox(prev), ...newInjuryMessages] : prev.inbox,
      };
    });
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
  }, [careerState, pendingCareerLeagueFixture, recordH2H, setToastMsg, setCareerState]);

  const handleEditCareerBracketTactics = useCallback(() => {
    if (!careerState) return;
    const cup = careerState.season.cup;
    const userTeam = cup.teams.find(t => t.id === cup.userTeamId);
    if (!userTeam) return;
    setHomeTeam(cloneTeam(userTeam, true));
    setAwayTeam(cloneTeam(userTeam, true));
    setMatchContext('bracket'); setIsKnockout(true);
    setIsTournamentEntry(true);
    setScreen('setup');
  }, [careerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry]);

  const handlePlayCareerBracketMatch = useCallback((_match: BracketMatch, home: Team, away: Team, stage: PlayableStage, matchIdx: number) => {
    setPendingCareerBracketStage(stage);
    setPendingCareerBracketIdx(matchIdx);
    setHomeTeam(cloneTeam(home, true)); setAwayTeam(cloneTeam(away, true));
    setMatchContext('bracket'); setIsKnockout(true);
    setScreen('setup');
  }, [setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);

  const handleSimulateOtherCareerBracketMatches = useCallback(() => {
    if (!careerState) return;
    const updated = simulateAllCpuBracketMatches(careerState.season.cup);
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, cup: updated } } : prev);
  }, [careerState, setCareerState]);

  const handleSimulateCareerBracketMatch = useCallback((_stage: PlayableStage, matchIdx: number) => {
    if (!careerState) return;
    const cupState = careerState.season.cup;
    const stageMatches = getStageMatches(cupState);
    const match = stageMatches[matchIdx];
    const home = cupState.teams.find(t => t.id === match.homeTeamId)!;
    const away = cupState.teams.find(t => t.id === match.awayTeamId)!;
    const sim = simularBracketMatch(home, away);
    const updated: BracketMatch = { ...match, ...sim };
    let s = { ...cupState };
    s = updateStageMatch(s, matchIdx, updated);
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, cup: advanceBracket(s) } } : prev);
  }, [careerState, setCareerState]);

  const handleCareerBracketMatchResult = useCallback((result: MatchResult) => {
    if (!careerState || !pendingCareerBracketStage) return;
    const cupState = careerState.season.cup;
    const stageMatches = getStageMatches(cupState);
    const match = stageMatches[pendingCareerBracketIdx];
    const home = cupState.teams.find(t => t.id === match.homeTeamId)!;
    const away = cupState.teams.find(t => t.id === match.awayTeamId)!;
    const updated = buildBracketMatchFromResult(match, result, home.id, away.id);
    let s = { ...cupState };
    s = updateStageMatch(s, pendingCareerBracketIdx, updated);
    const advanced = advanceBracket(s);
    const newInjuryMessages: InboxMessage[] = [];
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · ${advanced.stage}`;
    const teamsAfterMatch = advanced.teams.map(t => {
      if (t.id !== advanced.userTeamId) return t;
      const { team: injured, injuries } = applyPostMatchInjuries(t);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} jogo${inj.rounds > 1 ? 's' : ''}`);
        newInjuryMessages.push(createInjuryMessage(inj.player.name, inj.rounds, dateLabel));
      }
      const tired = applyMatchFatigue(injured);
      return applyMatchCards(tired, result.events);
    });
    // Estágio da copa avançou (ex: oitavas → quartas) — mesmo ponto de "avançar rodada"
    // da liga, então recupera fadiga e libera suspensões de todos os times aqui também,
    // já com o desgaste desta partida aplicado (senão a recuperação apagaria o efeito antes de existir).
    const stageAdvanced = advanced.stage !== cupState.stage;
    const finalTeams = stageAdvanced ? recoverFatigue(teamsAfterMatch).map(clearSuspensions) : teamsAfterMatch;
    const finalState = { ...advanced, teams: randomizeCPUTactics(finalTeams, advanced.userTeamId, Math.random, undefined) };
    const goalScorers = tallyUserGoals(result.events, advanced.userTeamId);
    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        season: {
          ...prev.season, cup: finalState,
          userGoalScorers: mergeGoalTally(prev.season.userGoalScorers, goalScorers),
        },
        inbox: newInjuryMessages.length > 0 ? [...getInbox(prev), ...newInjuryMessages] : prev.inbox,
      };
    });
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
  }, [careerState, pendingCareerBracketStage, pendingCareerBracketIdx, recordH2H, setToastMsg, setCareerState]);

  // Plain function, not useCallback: must run synchronously and return a value
  // the caller (TradeProposalScreen, 04.4-07) uses immediately, unlike every
  // other handler in this file which only fires state updates.
  function handleProposeTrade(offeredPlayerId: string, opponentTeamId: string, requestedPlayerId: string): { accepted: boolean; reason: string } {
    if (!careerState) return { accepted: false, reason: 'no-career' };
    if (!canProposeTrade(careerState.season.tradesUsedThisSeason)) return { accepted: false, reason: 'trade-limit-reached' };

    const cr = careerState.season.league.currentRound;
    const windowOpen = cr <= 4 || (cr >= 18 && cr <= 23);
    if (!windowOpen) return { accepted: false, reason: 'window-closed' };

    // D-04: scoped to the user's own league — never search across all 6 leagues here,
    // even though all 6 are progressed together at season-advance.
    const leagueRoster = careerState.rosters[careerState.leagueId];
    const userTeamId = careerState.season.league.userTeamId;
    const userTeam = leagueRoster.find(t => t.id === userTeamId);
    const opponentTeam = leagueRoster.find(t => t.id === opponentTeamId);
    if (!userTeam || !opponentTeam) return { accepted: false, reason: 'invalid-players' };

    const offeredPlayer = userTeam.squad.find(p => p.id === offeredPlayerId);
    const requestedPlayer = opponentTeam.squad.find(p => p.id === requestedPlayerId);
    if (!offeredPlayer || !requestedPlayer) return { accepted: false, reason: 'invalid-players' };

    const result = evaluateTradeOffer(offeredPlayer, requestedPlayer, opponentTeam.squad, careerState.manager.reputation);
    // A rejected offer does not consume a trade slot — the cap is charged only on
    // acceptance (Claude's Discretion resolution, see PLAN.md task 2 note on D-06).
    if (!result.accepted) return result;

    // D-07: permanent — mutates both this season's live teams AND the roster
    // source-of-truth, since the same league plays both league and cup concurrently.
    const swapSquad = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === userTeam.id) {
        return { ...t, squad: [...t.squad.filter(p => p.id !== offeredPlayerId), requestedPlayer] };
      }
      if (t.id === opponentTeam.id) {
        return { ...t, squad: [...t.squad.filter(p => p.id !== requestedPlayerId), offeredPlayer] };
      }
      return t;
    });

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: swapSquad(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          tradesUsedThisSeason: prev.season.tradesUsedThisSeason + 1,
          league: { ...prev.season.league, teams: swapSquad(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: swapSquad(prev.season.cup.teams) },
        },
      };
    });
    setToastMsg(`🔁 Troca aceita: ${offeredPlayer.name} ↔ ${requestedPlayer.name}`);
    return result;
  }

  const handleAdvanceSeason = useCallback(() => {
    if (!careerState) return;
    // D-13: hard gate — enforced independently of the UI, never trusting the caller.
    if (careerState.season.league.phase !== 'done' || careerState.season.cup.stage !== 'champion') return;

    // PERF: every computation below is a plain local const against the careerState
    // closure value, computed BEFORE setCareerState is called — never inside a
    // setCareerState(prev => ...) updater, since progressAllLeagues does real work
    // (roster regen across 6 leagues) that must run in the ordinary event-handler
    // phase, not React's synchronous render/commit phase.
    const standings = computeStandings(careerState.season.league.teams, careerState.season.league.fixtures);
    const leaguePosition = standings.findIndex(s => s.teamId === careerState.season.league.userTeamId) + 1;
    const totalTeams = careerState.season.league.teams.length;
    const leagueChampion = leaguePosition === 1;
    const cupChampion = careerState.season.cup.championId === careerState.season.league.userTeamId;
    const cupResult = deriveCupResult(careerState.season.cup, careerState.season.league.userTeamId);
    const reputationDelta = computeReputationDelta({ leagueChampion, cupChampion, leaguePosition, totalTeams });
    const newReputation = Math.max(0, Math.min(100, careerState.manager.reputation + reputationDelta));

    const record = computeUserSeasonRecord(careerState.season.league);
    const finances = getFinances(careerState);
    const budgetAtStart = careerState.season.budgetAtSeasonStart ?? finances.budget;

    const entry: CareerSeasonHistoryEntry = {
      year: careerState.currentSeasonYear,
      leagueId: careerState.leagueId,
      leagueChampionId: standings[0].teamId,
      userLeaguePosition: leaguePosition,
      cupResult,
      tradesUsed: careerState.season.tradesUsedThisSeason,
      reputationDelta,
      userTopScorer: deriveTopScorer(careerState.season.userGoalScorers ?? {}),
      userWins: record.wins,
      userDraws: record.draws,
      userLosses: record.losses,
      userGoalsFor: record.goalsFor,
      userGoalsAgainst: record.goalsAgainst,
      managerOfSeason: isManagerOfSeason(leaguePosition, cupResult),
      budgetDelta: finances.budget - budgetAtStart,
    };

    // D-01, reapplied at every season transition: ALL 6 leagues progress, not just
    // this career's league.
    const evolvedRosters = progressAllLeagues(careerState.rosters);
    const leagueDef = getLeague(careerState.leagueId)!;
    // Atributos mudaram na evolução da temporada — revaloriza o elenco da liga do
    // usuário (mesmo escopo D-04 do início de carreira) antes de montar a próxima.
    evolvedRosters[careerState.leagueId] = evolvedRosters[careerState.leagueId].map(assignMarketValues);
    const evolvedUserTeam = evolvedRosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId)!;
    const { league: nextLeague, cup: nextCup } = createCareerSeason(evolvedUserTeam, evolvedRosters[careerState.leagueId], leagueDef);

    setCareerState({
      ...careerState,
      manager: { ...careerState.manager, reputation: newReputation },
      currentSeasonYear: careerState.currentSeasonYear + 1,
      season: {
        league: nextLeague, cup: nextCup, tradesUsedThisSeason: 0,
        budgetAtSeasonStart: finances.budget, userGoalScorers: {},
      },
      rosters: evolvedRosters,
      history: [...careerState.history, entry],
      finances: { ...finances, wageBill: computeWageBill(evolvedUserTeam) }, // orçamento não reseta — só a folha salarial recalcula
    });
    setScreen('season-end');
  }, [careerState, setCareerState, setScreen]);

  const handleMarkInboxRead = useCallback((messageId: string) => {
    setCareerState(prev => {
      if (!prev) return prev;
      return { ...prev, inbox: getInbox(prev).map(m => m.id === messageId ? { ...m, isRead: true } : m) };
    });
  }, [setCareerState]);

  const handleMarkAllInboxRead = useCallback(() => {
    setCareerState(prev => {
      if (!prev) return prev;
      return { ...prev, inbox: getInbox(prev).map(m => ({ ...m, isRead: true })) };
    });
  }, [setCareerState]);

  return {
    careerState, setCareerState,
    cloudStatus, retryCloudSave,
    pendingCareerLeagueFixture,
    pendingCareerBracketStage, pendingCareerBracketIdx,
    handleStartCareer,
    handleEditCareerLeagueTactics,
    handlePlayCareerLeagueMatch,
    handlePlayNextCareerMatch,
    handleSimulateUserCareerLeagueMatch,
    handleSimulateCareerLeagueRound,
    handleNextCareerLeagueRound,
    handleCareerLeagueMatchResult,
    handleEditCareerBracketTactics,
    handlePlayCareerBracketMatch,
    handleSimulateOtherCareerBracketMatches,
    handleSimulateCareerBracketMatch,
    handleCareerBracketMatchResult,
    handleProposeTrade,
    handleAdvanceSeason,
    handleMarkInboxRead,
    handleMarkAllInboxRead,
  };
}
