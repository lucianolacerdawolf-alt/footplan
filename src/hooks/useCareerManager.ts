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
import {
  assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome, calculateMarketValue, evaluateCashTransfer,
  netSellRevenue, getLeaguePrizeMoney, getCupPrizeMoney, getTicketRevenue,
} from '../engine/transferMarket';
import {
  createInjuryMessage, createMatchPreviewMessage, createTransferWindowMessage, createWelcomeMessage, hasMandatoryUnread,
  createTransferOfferMessage, createTransferAcceptedMessage, createTransferRejectedMessage, createTransferOutCompletedMessage,
} from '../engine/inbox';
import { computeUserSeasonRecord, deriveTopScorer, isManagerOfSeason, tallyUserGoals, mergeGoalTally } from '../engine/seasonClosure';
import { generateFreeAgentPool, refreshFreeAgentPool } from '../engine/freeAgentPool';
import { cloneTeam, getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { getStageMatches, updateStageMatch } from '../engine/bracketHelpers';
import { allLeagues, getLeague } from '../data/leagues';
import type { LeagueDefinition } from '../data/leagues/types';
import { usePersistedState } from './usePersistedState';
import { useCloudSave } from './useCloudSave';
import { recordLeagueFixtureResult, applyLeagueRoundMoraleAndInjuries, simulateAllCpuBracketMatches, buildBracketMatchFromResult } from './shared/matchHandlers';
import type { CareerState, CareerSeasonHistoryEntry, InboxMessage, TransferRecord } from '../engine/career';
import {
  isValidCareerState, assignInitialAges, createCareerSeason,
  evaluateTradeOffer, computeReputationDelta, progressAllLeagues, deriveCupResult,
  getFinances, getInbox, getFreeAgentPool, getTransferHistory, getTransferList, isTransferWindowOpen,
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

  const { loadFromCloud, enqueueCloudSave } = useCloudSave();

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
        // as outras 11 ligas nunca exibem valor de mercado nesta versão.
        // Usa leagueDef.teams (o parâmetro), NÃO l.teams (allLeagues estático) — leagueDef
        // é o que TournamentSetupScreen passa depois de sincronizar com football-data.org;
        // usar l.teams aqui jogava fora a sincronização pros outros 19 times da liga do
        // usuário (só o time escolhido pelo próprio usuário vinha atualizado).
        rosters[l.id] = assignInitialAges(leagueDef.teams.map(t => t.id === userTeam.id ? cloneTeam(userTeam) : cloneTeam(t)))
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
      freeAgentPool: generateFreeAgentPool(),
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
    // Bilheteria: a rodada que está terminando (leg.currentRound, antes do incremento
    // pra `next`) é o jogo já disputado — creditar se foi em casa.
    const justPlayedFixture = leg.fixtures[leg.currentRound].find(f => f.homeTeamId === leg.userTeamId || f.awayTeamId === leg.userTeamId);
    const ticketRevenue = justPlayedFixture?.homeTeamId === leg.userTeamId ? getTicketRevenue(careerState.leagueId) : 0;
    const budget = finances.budget + finances.weeklyIncome + ticketRevenue - wageBill;

    const newMessages: InboxMessage[] = [];
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${next + 1}`;
    const wasWindowOpen = isTransferWindowOpen(leg.currentRound);
    const isWindowOpenNow = isTransferWindowOpen(next);
    if (!wasWindowOpen && isWindowOpenNow) {
      newMessages.push(createTransferWindowMessage(dateLabel));
    }
    if (isWindowOpenNow) {
      // Mercado global: candidatos a comprador vêm de qualquer uma das 12 ligas, não só
      // da liga do usuário. Pra times da própria liga usa a versão já "variada" nesta
      // rodada (randomizeCPUTactics); as outras 11 ligas não precisam de tática pra isso,
      // só nome/id, então usa o roster cru.
      const allOtherTeams = Object.entries(careerState.rosters).flatMap(([lid, teams]) =>
        lid === careerState.leagueId ? variedTeams.filter(t => t.id !== leg.userTeamId) : teams
      );
      // Evita 2 ofertas pro mesmo jogador enquanto a primeira ainda não foi decidida
      // (aceitar/recusar remove a mensagem da inbox).
      const pendingOfferPlayerIds = new Set(
        getInbox(careerState).filter(m => m.type === 'TRANSFER_OFFER' && m.meta).map(m => m.meta!.playerId)
      );

      // 30% de chance de a CPU fazer 1 oferta espontânea por um titular (não-goleiro)
      // acima da média de algum adversário — só na abertura da janela, não em toda rodada.
      if (!wasWindowOpen && Math.random() < 0.3) {
        const candidates = allOtherTeams.flatMap(cpu => {
          const cpuAvg = getAvgOvr(cpu);
          return userTeamAfter.squad.slice(0, 11) // "titular" = XI convention (sem campo matchStatus no Player)
            .filter(p => p.position !== 'GK' && playerOvr(p) > cpuAvg && !pendingOfferPlayerIds.has(p.id))
            .map(player => ({ cpu, player }));
        });
        if (candidates.length > 0) {
          const { cpu, player } = candidates[Math.floor(Math.random() * candidates.length)];
          const marketValue = calculateMarketValue(player);
          const offeredAmount = Math.round(marketValue * (0.85 + Math.random() * 0.5)); // 0.85–1.35×
          newMessages.push(createTransferOfferMessage(
            cpu.name, player.id, player.name, player.position, playerOvr(player), marketValue, offeredAmount, cpu.id, dateLabel,
          ));
          pendingOfferPlayerIds.add(player.id);
        }
      }

      // Jogadores na lista de venda: a cada rodada com a janela aberta, 35% de chance
      // de cada um receber uma oferta de "algum time" — prioriza times que ganhariam
      // com o upgrade (OVR médio abaixo do jogador), mas qualquer time serve se nenhum
      // se qualificar, pra "qualquer time compra se quiser" nunca ficar sem candidato.
      for (const playerId of getTransferList(careerState)) {
        if (pendingOfferPlayerIds.has(playerId)) continue;
        const player = userTeamAfter.squad.find(p => p.id === playerId);
        if (!player || allOtherTeams.length === 0) continue;
        if (Math.random() >= 0.35) continue;
        const eagerBidders = allOtherTeams.filter(t => getAvgOvr(t) < playerOvr(player) + 3);
        const pool = eagerBidders.length > 0 ? eagerBidders : allOtherTeams;
        const cpu = pool[Math.floor(Math.random() * pool.length)];
        const marketValue = calculateMarketValue(player);
        const offeredAmount = Math.round(marketValue * (0.7 + Math.random() * 0.6)); // 0.7–1.3×
        newMessages.push(createTransferOfferMessage(
          cpu.name, player.id, player.name, player.position, playerOvr(player), marketValue, offeredAmount, cpu.id, dateLabel,
        ));
        pendingOfferPlayerIds.add(playerId);
      }
    }
    // Backfill defensivo: carreiras salvas antes desta feature não têm freeAgentPool.
    const freeAgentPoolPatch = careerState.freeAgentPool === undefined ? { freeAgentPool: generateFreeAgentPool() } : {};
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
        ...freeAgentPoolPatch,
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
    const ticketRevenue = match.homeTeamId === cupState.userTeamId ? getTicketRevenue(careerState.leagueId) : 0;
    const finances = getFinances(careerState);
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
        finances: { ...finances, budget: finances.budget + ticketRevenue },
        inbox: newInjuryMessages.length > 0 ? [...getInbox(prev), ...newInjuryMessages] : prev.inbox,
      };
    });
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
  }, [careerState, pendingCareerBracketStage, pendingCareerBracketIdx, recordH2H, setToastMsg, setCareerState]);

  // Plain function, not useCallback: must run synchronously and return a value
  // the caller (TradeProposalScreen, 04.4-07) uses immediately, unlike every
  // other handler in this file which only fires state updates.
  function handleProposeTrade(offeredPlayerId: string, opponentTeamId: string, requestedPlayerId: string, cashOffered: number = 0): { accepted: boolean; reason: string } {
    if (!careerState) return { accepted: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { accepted: false, reason: 'window-closed' };
    if (cashOffered < 0) return { accepted: false, reason: 'invalid-players' };

    const finances = getFinances(careerState);
    if (cashOffered > finances.budget) return { accepted: false, reason: 'insufficient-budget' };

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

    const result = evaluateTradeOffer(offeredPlayer, requestedPlayer, opponentTeam.squad, careerState.manager.reputation, Math.random, cashOffered);
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
    const newUserSquad = [...userTeam.squad.filter(p => p.id !== offeredPlayerId), requestedPlayer];
    const newWageBill = computeWageBill({ ...userTeam, squad: newUserSquad });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'TRADE', playerName: `${offeredPlayer.name} ↔ ${requestedPlayer.name}`, playerPosition: offeredPlayer.position,
      fromTeam: userTeam.name, toTeam: opponentTeam.name, amount: cashOffered,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: swapSquad(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: swapSquad(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: swapSquad(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - cashOffered, wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        // O jogador trocado saiu do elenco — não faz mais sentido continuar na lista de venda.
        transferListPlayerIds: getTransferList(prev).filter(id => id !== offeredPlayerId),
      };
    });
    setToastMsg(`🔁 Troca aceita: ${offeredPlayer.name} ↔ ${requestedPlayer.name}${cashOffered > 0 ? ` + €${(cashOffered / 1_000_000).toFixed(1)}M` : ''}`);
    return result;
  }

  // Plain function, not useCallback: same synchronous-return contract as handleProposeTrade —
  // TransferMarketScreen needs the result immediately to show inline feedback.
  function handleBuyPlayer(playerId: string, fromTeamId: string, amount: number): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { success: false, reason: 'window-closed' };

    const finances = getFinances(careerState);
    if (amount > finances.budget) return { success: false, reason: 'insufficient-budget' };

    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return { success: false, reason: 'invalid-team' };

    // O mercado cobre todas as ligas do jogo (não só a do usuário) — procura o vendedor
    // em qualquer roster. calculateMarketValue() é recalculado on-the-fly pra times de
    // fora da liga do usuário (nunca têm `marketValue` pré-atribuído, ver handleStartCareer).
    let sellerLeagueId: string | null = null;
    let sellerTeam: Team | undefined;
    for (const [lid, teams] of Object.entries(careerState.rosters)) {
      const found = teams.find(t => t.id === fromTeamId);
      if (found) { sellerLeagueId = lid; sellerTeam = found; break; }
    }
    if (!sellerTeam || !sellerLeagueId) return { success: false, reason: 'invalid-team' };

    const player = sellerTeam.squad.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };

    // Nunca deixa o vendedor sem nenhum jogador na posição (ex: 0 goleiros quebraria a
    // simulação de partida) — vale pra qualquer time do jogo, não só da liga do usuário.
    // Com ≤2 (mas >1), evaluateCashTransfer já aplica um markup.
    const samePositionCount = sellerTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) return { success: false, reason: 'seller-last-at-position' };
    const sellerNeedsPlayer = samePositionCount <= 2;

    const evalResult = evaluateCashTransfer(player, amount, sellerNeedsPlayer);
    if (!evalResult.accepted) return { success: false, reason: evalResult.reason };

    const isSameLeague = sellerLeagueId === careerState.leagueId;
    const addToUser = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: [...t.squad, player] } : t);
    // Time e liga vendedores só aparecem em season.league/cup.teams quando fazem parte
    // da própria liga do usuário (esses dois arrays são um espelho de rosters[leagueId]).
    const moveSquadSameLeague = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === sellerTeam!.id) return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
      if (t.id === userTeam.id) return { ...t, squad: [...t.squad, player] };
      return t;
    });
    const newWageBill = computeWageBill({ ...userTeam, squad: [...userTeam.squad, player] });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'BUY', playerName: player.name, playerPosition: player.position,
      fromTeam: sellerTeam.name, toTeam: userTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      const newRosters = isSameLeague
        ? { ...prev.rosters, [prev.leagueId]: moveSquadSameLeague(prev.rosters[prev.leagueId]) }
        : {
            ...prev.rosters,
            [sellerLeagueId!]: prev.rosters[sellerLeagueId!].map(t =>
              t.id === sellerTeam!.id ? { ...t, squad: t.squad.filter(p => p.id !== playerId) } : t
            ),
            [prev.leagueId]: addToUser(prev.rosters[prev.leagueId]),
          };
      return {
        ...prev,
        rosters: newRosters,
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: isSameLeague ? moveSquadSameLeague(prev.season.league.teams) : addToUser(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: isSameLeague ? moveSquadSameLeague(prev.season.cup.teams) : addToUser(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - amount, wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        inbox: [...getInbox(prev), createTransferAcceptedMessage(player.name, sellerTeam.name, userTeam.name, amount, dateLabel)],
      };
    });
    setToastMsg(`✅ ${player.name} contratado por €${(amount / 1_000_000).toFixed(1)}M`);
    return { success: true, reason: evalResult.reason };
  }

  // Sem vendedor CPU pra negociar — sempre aceita se orçamento e janela permitem.
  // `amount` é a luva opcional que a UI oferece (0 a ~0.3× marketValue).
  function handleSignFreeAgent(playerId: string, amount: number): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { success: false, reason: 'window-closed' };

    const finances = getFinances(careerState);
    if (amount > finances.budget) return { success: false, reason: 'insufficient-budget' };

    const pool = getFreeAgentPool(careerState);
    const player = pool.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };

    const leagueRoster = careerState.rosters[careerState.leagueId];
    const userTeam = leagueRoster.find(t => t.id === careerState.season.league.userTeamId)!;
    const addToSquad = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: [...t.squad, player] } : t);
    const newWageBill = computeWageBill({ ...userTeam, squad: [...userTeam.squad, player] });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'SIGN_FREE_AGENT', playerName: player.name, playerPosition: player.position,
      fromTeam: 'Free Agent', toTeam: userTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: addToSquad(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: addToSquad(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: addToSquad(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - amount, wageBill: newWageBill },
        freeAgentPool: getFreeAgentPool(prev).filter(p => p.id !== playerId),
        transferHistory: [...getTransferHistory(prev), record],
        inbox: [...getInbox(prev), createTransferAcceptedMessage(player.name, 'Agente Livre', userTeam.name, amount, dateLabel)],
      };
    });
    setToastMsg(`✅ ${player.name} assinou contrato`);
    return { success: true, reason: 'signed' };
  }

  // Colocar um jogador do próprio elenco na lista de venda — não escolhe comprador
  // nem preço, só torna o jogador elegível a ofertas de qualquer time do jogo (ver
  // o sorteio em handleNextCareerLeagueRound). Mesma interface síncrona de buy/sign.
  function handleListPlayerForSale(playerId: string): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return { success: false, reason: 'invalid-team' };
    const player = userTeam.squad.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };
    if (getTransferList(careerState).includes(playerId)) return { success: false, reason: 'already-listed' };

    // Mesma guarda de handleBuyPlayer/handleAcceptTransferOffer — nunca deixa o
    // usuário sem nenhum jogador numa posição (ex: 0 goleiros quebra a partida).
    const samePositionCount = userTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) return { success: false, reason: 'last-at-position' };

    setCareerState(prev => prev ? { ...prev, transferListPlayerIds: [...getTransferList(prev), playerId] } : prev);
    setToastMsg(`📋 ${player.name} colocado na lista de venda`);
    return { success: true, reason: 'listed' };
  }

  const handleUnlistPlayerForSale = useCallback((playerId: string) => {
    setCareerState(prev => prev ? { ...prev, transferListPlayerIds: getTransferList(prev).filter(id => id !== playerId) } : prev);
  }, [setCareerState]);

  const handleAcceptTransferOffer = useCallback((messageId: string) => {
    if (!careerState) return;
    const message = getInbox(careerState).find(m => m.id === messageId);
    if (!message?.meta) return;
    const { playerId, offeringTeamId, amount } = message.meta;

    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    const player = userTeam?.squad.find(p => p.id === playerId);
    // O time ofertante pode ser de qualquer uma das 12 ligas (mercado global) —
    // procura em todos os rosters, igual handleBuyPlayer.
    let offeringLeagueId: string | null = null;
    let offeringTeam: Team | undefined;
    for (const [lid, teams] of Object.entries(careerState.rosters)) {
      const found = teams.find(t => t.id === offeringTeamId);
      if (found) { offeringLeagueId = lid; offeringTeam = found; break; }
    }
    // Defensivo: a oferta pode estar obsoleta (jogador já vendido/trocado, ou
    // aposentado e substituído por um id novo via progressPlayer/generateReplacementPlayer
    // desde que a oferta chegou). Sem crash, sem mexer em dinheiro — só descarta.
    if (!userTeam || !offeringTeam || !offeringLeagueId || !player) {
      setCareerState(prev => prev ? { ...prev, inbox: getInbox(prev).filter(m => m.id !== messageId) } : prev);
      setToastMsg('⚠️ Esta proposta não é mais válida.');
      return;
    }
    // Guarda simétrica à de handleBuyPlayer — o usuário também precisa de uma escalação
    // válida (goleiro incluso) todo round.
    const samePositionCount = userTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) {
      setCareerState(prev => prev ? { ...prev, inbox: getInbox(prev).filter(m => m.id !== messageId) } : prev);
      setToastMsg(`⚠️ Não é possível vender ${player.name}: é o único jogador na posição.`);
      return;
    }

    const isSameLeague = offeringLeagueId === careerState.leagueId;
    const removeFromUser = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: t.squad.filter(p => p.id !== playerId) } : t);
    const moveSquadSameLeague = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === userTeam.id) return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
      if (t.id === offeringTeam!.id) return { ...t, squad: [...t.squad, player] };
      return t;
    });
    const finances = getFinances(careerState);
    const newWageBill = computeWageBill({ ...userTeam, squad: userTeam.squad.filter(p => p.id !== playerId) });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'SELL', playerName: player.name, playerPosition: player.position,
      fromTeam: userTeam.name, toTeam: offeringTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      const newRosters = isSameLeague
        ? { ...prev.rosters, [prev.leagueId]: moveSquadSameLeague(prev.rosters[prev.leagueId]) }
        : {
            ...prev.rosters,
            [offeringLeagueId!]: prev.rosters[offeringLeagueId!].map(t =>
              t.id === offeringTeam!.id ? { ...t, squad: [...t.squad, player] } : t
            ),
            [prev.leagueId]: removeFromUser(prev.rosters[prev.leagueId]),
          };
      return {
        ...prev,
        rosters: newRosters,
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: isSameLeague ? moveSquadSameLeague(prev.season.league.teams) : removeFromUser(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: isSameLeague ? moveSquadSameLeague(prev.season.cup.teams) : removeFromUser(prev.season.cup.teams) },
        },
        // Board Strictness (EA FC): a diretoria retém 20% do valor de venda.
        finances: { ...finances, budget: finances.budget + netSellRevenue(amount), wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        transferListPlayerIds: getTransferList(prev).filter(id => id !== playerId),
        inbox: [...getInbox(prev).filter(m => m.id !== messageId), createTransferOutCompletedMessage(player.name, offeringTeam!.name, amount, dateLabel)],
      };
    });
    setToastMsg(`💰 ${player.name} vendido por €${(amount / 1_000_000).toFixed(1)}M`);
  }, [careerState, setCareerState, setToastMsg]);

  const handleRejectTransferOffer = useCallback((messageId: string) => {
    if (!careerState) return;
    const message = getInbox(careerState).find(m => m.id === messageId);
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    let rejectionMsg: InboxMessage[] = [];
    if (message?.meta) {
      const playerName = careerState.rosters[careerState.leagueId]
        .find(t => t.id === careerState.season.league.userTeamId)?.squad
        .find(p => p.id === message.meta!.playerId)?.name ?? '???';
      const offeringClub = Object.values(careerState.rosters).flat().find(t => t.id === message.meta!.offeringTeamId)?.name ?? '???';
      rejectionMsg = [createTransferRejectedMessage(playerName, offeringClub, dateLabel)];
    }
    setCareerState(prev => prev ? { ...prev, inbox: [...getInbox(prev).filter(m => m.id !== messageId), ...rejectionMsg] } : prev);
  }, [careerState, setCareerState]);

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
    // Prize Money: premiação por colocação na liga + resultado na copa, creditada ao
    // fechar a temporada — aparece no budgetDelta da PRÓXIMA entrada de histórico,
    // já que budgetAtSeasonStart desta transição é o budget ANTES do prêmio.
    const leaguePrize = getLeaguePrizeMoney(careerState.leagueId, leaguePosition);
    const cupPrize = getCupPrizeMoney(careerState.leagueId, cupResult);

    const entry: CareerSeasonHistoryEntry = {
      year: careerState.currentSeasonYear,
      leagueId: careerState.leagueId,
      leagueChampionId: standings[0].teamId,
      userLeaguePosition: leaguePosition,
      cupResult,
      tradesUsed: 0,
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
      finances: { ...finances, budget: finances.budget + leaguePrize + cupPrize, wageBill: computeWageBill(evolvedUserTeam) },
      freeAgentPool: refreshFreeAgentPool(getFreeAgentPool(careerState), careerState.currentSeasonYear + 1),
    });
    setScreen('season-end');
  }, [careerState, setCareerState, setScreen]);

  // Só a liga da carreira ativa sincroniza automaticamente (D-04, respeita o rate limit
  // das APIs). Ao navegar pra outra liga no Mercado, TransferMarketScreen sincroniza essa
  // liga sob demanda (uma vez, com cache de 7 dias) e persiste o resultado aqui — sem
  // isso, nome/idade/nacionalidade reais só apareciam pros jogadores da própria liga do
  // usuário; times de outras ligas continuavam com os dados estáticos (sem nacionalidade).
  const handleMarketRosterSynced = useCallback((leagueId: string, teams: Team[]) => {
    setCareerState(prev => prev ? { ...prev, rosters: { ...prev.rosters, [leagueId]: teams } } : prev);
  }, [setCareerState]);

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
    handleBuyPlayer,
    handleListPlayerForSale,
    handleUnlistPlayerForSale,
    handleSignFreeAgent,
    handleAcceptTransferOffer,
    handleRejectTransferOffer,
    handleAdvanceSeason,
    handleMarkInboxRead,
    handleMarkAllInboxRead,
    handleMarketRosterSynced,
  };
}
