import { useState, useCallback } from 'react';
import type { Team, MatchResult } from '@/engine/types';
import type { LeagueFixture, BracketMatch, PlayableStage } from '@/engine/tournament';
import {
  simularFixtureAuto, simularRodadaAuto, recoverFatigue, applyPostMatchInjuries, randomizeCPUTactics,
  advanceBracket, simularBracketMatch,
} from '@/engine/tournament';
import { moraleDelta, applyMoraleToTeam } from '@/engine/morale';
import { applyMatchFatigue } from '@/engine/fitness';
import { applyMatchCards, clearSuspensions } from '@/engine/discipline';
import { computeWageBill, getTicketRevenue, calculateMarketValue } from '@/engine/transferMarket';
import {
  createInjuryMessage, createMatchPreviewMessage, createTransferWindowMessage, createTransferOfferMessage, hasMandatoryUnread,
  createDerbyPreviewMessage,
} from '@/engine/inbox';
import { getDerbyName } from '@/engine/rivalries';
import { tallyUserGoals, mergeGoalTally } from '@/engine/seasonClosure';
import { generateFreeAgentPool } from '@/engine/freeAgentPool';
import { cloneTeam, getAvgOvr } from '@/utils/teamUtils';
import { getStarterCount } from '@/engine/squadUtils';
import { playerOvr } from '@/utils/playerOvr';
import { getStageMatches, updateStageMatch } from '@/engine/bracketHelpers';
import { saveLiveMatchMeta } from '@/utils/liveMatchPersistence';
import { recordLeagueFixtureResult, applyLeagueRoundMoraleAndInjuries, simulateAllCpuBracketMatches, buildBracketMatchFromResult, extractScorers } from '../shared/matchHandlers';
import { maybeGetCareerEvent } from '@/engine/careerEvents';
import { getFinances, getInbox, isTransferWindowOpen, getTransferList, type CareerState, type InboxMessage } from '@/engine/career';
import type { ConversationContext } from '@/engine/playerConversations';
import type { Screen } from '@/types/navigation';

interface UseCareerMatchFlowParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: 'regular' | 'league' | 'bracket' | 'online') => void;
  setIsKnockout: (v: boolean) => void;
  setIsTournamentEntry: (v: boolean) => void;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  setToastMsg: (msg: string | null) => void;
  /** Fase 4 — tenta gerar 0-1 conversa com atleta no contexto dado. */
  generateConversation?: (ctx: ConversationContext) => void;
}

export function useCareerMatchFlow({
  careerState, setCareerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
  recordH2H, setToastMsg, generateConversation,
}: UseCareerMatchFlowParams) {
  const [pendingCareerLeagueFixture, setPendingCareerLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);
  const [pendingCareerBracketStage, setPendingCareerBracketStage] = useState<PlayableStage | null>(null);
  const [pendingCareerBracketIdx, setPendingCareerBracketIdx] = useState<number>(0);

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
    saveLiveMatchMeta({ matchContext: 'league', roundIdx, fixtureIdx, isCareer: true });
    setScreen('setup');
  }, [careerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);


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
    const budget = finances.budget + finances.weeklyIncome + ticketRevenue + (finances.merchRevenue ?? 0) - wageBill;

    const newMessages: InboxMessage[] = [];
    let eventBudgetDelta = 0;
    const careerEvent = maybeGetCareerEvent();
    if (careerEvent) {
      eventBudgetDelta = careerEvent.budgetDelta;
      newMessages.push({
        id: `evt-${Date.now()}`,
        date: `Temporada ${careerState.currentSeasonYear} · Rodada ${leg.currentRound + 1}`,
        isRead: false, isMandatory: false,
        type: 'BOARD_UPDATE' as const,
        subject: careerEvent.subject,
        body: careerEvent.body,
      });
    }
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
          return userTeamAfter.squad.slice(0, getStarterCount(userTeamAfter.strategy.formation)) // "titular" = XI da formação (sem campo matchStatus no Player)
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
        const derbyName = getDerbyName(leg.userTeamId, oppId);
        newMessages.push(derbyName
          ? createDerbyPreviewMessage(oppName, derbyName, isHome, dateLabel)
          : createMatchPreviewMessage(oppName, isHome, `Rodada ${next + 1}`, dateLabel));
      }
    }

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...freeAgentPoolPatch,
        season: { ...prev.season, league: updatedState },
        finances: { ...finances, budget: budget + eventBudgetDelta, wageBill },
        inbox: newMessages.length > 0 ? [...getInbox(prev), ...newMessages] : prev.inbox,
      };
    });
    // Fase 4 — sinais estruturais no avanço de rodada (banco/lista/contrato): o motor
    // garante 0-1 por rodada e não duplica com a conversa pós-jogo do mesmo round.
    if (generateConversation) {
      generateConversation({ seasonYear: careerState.currentSeasonYear, round: next });
    }
  }, [careerState, setCareerState, setToastMsg, generateConversation]);

  const handleCareerLeagueMatchResult = useCallback((result: MatchResult) => {
    if (!careerState || !pendingCareerLeagueFixture) return;
    const leg = careerState.season.league;
    const { roundIdx, fixtureIdx } = pendingCareerLeagueFixture;
    const fixture = leg.fixtures[roundIdx][fixtureIdx];
    const userIsHome = fixture.homeTeamId === leg.userTeamId;
    const userScore = userIsHome ? result.homeScore : result.awayScore;
    const oppScore = userIsHome ? result.awayScore : result.homeScore;
    const delta = moraleDelta(userScore, oppScore);
    const newFixtures = recordLeagueFixtureResult(leg.fixtures, roundIdx, fixtureIdx, result.homeScore, result.awayScore, extractScorers(result));
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
    // Fase 4 — conversa pós-jogo: derrota pesada/dérbi → 'form', vitória → 'praise'.
    if (generateConversation) {
      generateConversation({
        seasonYear: careerState.currentSeasonYear,
        round: leg.currentRound,
        lastResult: { userScore, oppScore, opponentId: userIsHome ? fixture.awayTeamId : fixture.homeTeamId },
      });
    }
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
  }, [careerState, pendingCareerLeagueFixture, recordH2H, setToastMsg, setCareerState, generateConversation]);

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
    saveLiveMatchMeta({ matchContext: 'bracket', bracketStage: stage, bracketIdx: matchIdx, isCareer: true });
    setScreen('setup');
  }, [setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout]);


  const handlePlayNextCareerCupMatch = useCallback(() => {
    if (!careerState) return;
    const cup = careerState.season.cup;
    if (cup.stage === 'champion') { setScreen('career-bracket'); return; }
    const stageMatches = getStageMatches(cup);
    const matchIdx = stageMatches.findIndex(m =>
      !m.played &&
      (m.homeTeamId === cup.userTeamId || m.awayTeamId === cup.userTeamId)
    );
    if (matchIdx < 0 || !stageMatches[matchIdx]) { setScreen('career-bracket'); return; }
    const match = stageMatches[matchIdx];
    const home = cup.teams.find(t => t.id === match.homeTeamId);
    const away = cup.teams.find(t => t.id === match.awayTeamId);
    if (!home || !away) { setScreen('career-bracket'); return; }
    const stage = cup.stage as PlayableStage;
    handlePlayCareerBracketMatch(match, home, away, stage, matchIdx);
  }, [careerState, setScreen, handlePlayCareerBracketMatch]);

  const handleSimulateOtherCareerBracketMatches = useCallback(() => {
    if (!careerState) return;
    const updated = simulateAllCpuBracketMatches(careerState.season.cup);
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, cup: updated } } : prev);
  }, [careerState, setCareerState]);


  const handleSimulateCareerCupToEnd = useCallback(() => {
    if (!careerState) return;
    let cup = careerState.season.cup;
    let safety = 0;
    const MAX_ITER = 5;
    while (cup.stage !== 'champion' && safety < MAX_ITER) {
      cup = simulateAllCpuBracketMatches(cup);
      cup = advanceBracket(cup);
      safety++;
    }
    setCareerState(prev => prev ? { ...prev, season: { ...prev.season, cup } } : prev);
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

  const handleRestorePendingCareerLeagueFixture = useCallback((roundIdx: number, fixtureIdx: number) => {
    setPendingCareerLeagueFixture({ roundIdx, fixtureIdx });
  }, []);

  const handleRestorePendingCareerBracketMatch = useCallback((stage: PlayableStage, matchIdx: number) => {
    setPendingCareerBracketStage(stage);
    setPendingCareerBracketIdx(matchIdx);
  }, []);

  return {
    pendingCareerLeagueFixture,
    pendingCareerBracketStage, pendingCareerBracketIdx,
    handleEditCareerLeagueTactics,
    handlePlayCareerLeagueMatch,
    handlePlayNextCareerMatch,
    handlePlayNextCareerCupMatch,
    handleSimulateUserCareerLeagueMatch,
    handleSimulateCareerLeagueRound,
    handleNextCareerLeagueRound,
    handleCareerLeagueMatchResult,
    handleEditCareerBracketTactics,
    handlePlayCareerBracketMatch,
    handleSimulateOtherCareerBracketMatches,
    handleSimulateCareerBracketMatch,
    handleSimulateCareerCupToEnd,
    handleCareerBracketMatchResult,
    handleRestorePendingCareerLeagueFixture,
    handleRestorePendingCareerBracketMatch,
  };
}