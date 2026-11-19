import { useCallback } from 'react';
import type { Team } from '@/engine/types';
import { computeStandings, type BracketState } from '@/engine/tournament';
import { assignMarketValues, computeWageBill, computeWeeklyIncome, getLeaguePrizeMoney, getCupPrizeMoney } from '@/engine/transferMarket';
import { sponsorTvPerRound, wageCap } from '@/engine/clubEconomy';
import { generateBoardObjectives, evaluateBoardObjectives, createBoardObjectivesInboxMessage, createBoardObjectivesResultMessage } from '@/engine/boardObjectives';
import { refreshFreeAgentPool } from '@/engine/freeAgentPool';
import { refreshYouthPool, generateYouthIntake, canPromote } from '@/engine/youthAcademy';
import { getLeague, allLeagues } from '@/data/leagues';
import { determineUserContinentalCup, getContinentalPrizeMoney, getQualifiedTeams, createContinentalBracket } from '@/engine/continentalCups';
import { CUP_RESULT_LABELS } from '@/engine/careerLabels';
import { computeUserSeasonRecord, deriveTopScorer, isManagerOfSeason } from '@/engine/seasonClosure';
import { type SponsorTier, getSponsorMultiplier, getSponsorLabel, getSponsorMinReputation, getNextTierUp, getNextTierDown, generateSponsor, computeMerchRevenue } from '@/engine/sponsors';
import { deriveCupResult, computeReputationDelta, progressAllLeagues, createCareerSeason, pairedDivisionId, expireContracts, evaluateContractGoals, getContractSeasonsLeft, getFinances, getFreeAgentPool, getYouthPool, getSponsorTier, getSponsorName, type CareerState, type CareerSeasonHistoryEntry, type InboxMessage } from '@/engine/career';
import { createContractExpiringMessage, createContractDepartureMessage, createContractGoalBonusMessage, createContinentalQualificationMessage, createContinentalResultMessage, createYouthIntakeMessage, createYouthReadyMessage, createYouthReleasedMessage, createSeasonDebtMessage } from '@/engine/inbox';
import { generateJobOffers } from '@/engine/jobMarket';
import { CONFIDENCE_START, CONFIDENCE_SACK, seasonEndConfidence, generateSackedOffers } from '@/engine/boardConfidence';
import { getCareerTotals } from '@/engine/careerMilestones';
import { refreshScouting } from '@/engine/scouting';
import { createSackedMessage } from '@/engine/inbox';
import type { Screen } from '@/types/navigation';

interface UseCareerSeasonParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setScreen: (s: Screen) => void;
  setToastMsg: (msg: string | null) => void;
  /** Destrava conquistas continentais/Tríplice no fechamento da temporada. */
  unlockAchievement: (id: string) => void;
}

export function useCareerSeason({ careerState, setCareerState, setScreen, setToastMsg, unlockAchievement }: UseCareerSeasonParams) {
  const handleAdvanceSeason = useCallback(() => {
    if (!careerState) return;
    if (careerState.season.league.phase !== 'done' || careerState.season.cup.stage !== 'champion') return;

    try {
      const standings = computeStandings(careerState.season.league.teams, careerState.season.league.fixtures);
      const leaguePosition = standings.findIndex(s => s.teamId === careerState.season.league.userTeamId) + 1;
      const totalTeams = careerState.season.league.teams.length;
      const leagueChampion = leaguePosition === 1;
      const cupChampion = careerState.season.cup.championId === careerState.season.league.userTeamId;
      const cupResult = deriveCupResult(careerState.season.cup, careerState.season.league.userTeamId);
      const reputationDelta = computeReputationDelta({ leagueChampion, cupChampion, leaguePosition, totalTeams });
      let newReputation = Math.max(0, Math.min(100, careerState.manager.reputation + reputationDelta));

      const record = computeUserSeasonRecord(careerState.season.league);
      const finances = getFinances(careerState);

      // ── Board objectives evaluation ──
      // Saves anteriores à feature não têm objetivos gravados — reconstrói os da
      // temporada que acabou para poder avaliá-la.
      const currentObj = careerState.boardObjectives
        ?? generateBoardObjectives(careerState.season.league, careerState.manager.reputation, careerState.currentSeasonYear);
      const objEval = evaluateBoardObjectives(
        currentObj, leaguePosition, cupResult, finances.budget, currentObj.streakBad,
      );
      newReputation = Math.max(0, Math.min(100, newReputation + objEval.totalRepDelta));
      const objectiveMessages: InboxMessage[] = [createBoardObjectivesResultMessage(objEval.results, objEval.totalRepDelta, objEval.warnings)];
      // Temporada fechou no vermelho (antes dos prêmios): a diretoria cobra em reputação —
      // 3 pontos + 1 por cada 5% da receita anual em dívida, até 10.
      if (finances.budget < 0) {
        const annualRevenue = (finances.baseRevenue ?? finances.weeklyIncome) * 52;
        const repLoss = Math.min(10, 3 + Math.floor((-finances.budget / Math.max(1, annualRevenue)) / 0.05));
        newReputation = Math.max(0, newReputation - repLoss);
        objectiveMessages.push(createSeasonDebtMessage(finances.budget, repLoss, `Fim da temporada ${careerState.currentSeasonYear}`));
      }
      const budgetAtStart = careerState.season.budgetAtSeasonStart ?? finances.budget;
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

      const evolvedRosters = progressAllLeagues(careerState.rosters);
      const leagueDef = getLeague(careerState.leagueId);
      if (!leagueDef) {
        setToastMsg('Erro ao avançar temporada: liga não encontrada. Recarregue a página.');
        return;
      }
      evolvedRosters[careerState.leagueId] = evolvedRosters[careerState.leagueId].map(assignMarketValues);
      const evolvedUserTeam = evolvedRosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
      if (!evolvedUserTeam) {
        setToastMsg('Erro ao avançar temporada: time do usuário não encontrado.');
        return;
      }
      // Fase 1 — Contratos: quem chegou ao fim do vínculo sai pro mercado de agentes
      // livres; o contrato (decrementado) é gravado de volta no elenco evolvido.
      // Antes disso, avalia as cláusulas de performance da safra que terminou: quem
      // atingiu a meta de gols (liga + copa) recebe o bônus; a cláusula é sempre limpa.
      const { squad: goalSquad, payments: goalPayments } = evaluateContractGoals(
        evolvedUserTeam,
        careerState.season.userGoalScorers ?? {},
      );
      const goalBonuses = goalPayments.reduce((s, p) => s + p.bonus, 0);
      const evolvedWithGoals = { ...evolvedUserTeam, squad: goalSquad };
      const { squad: contractSquad, departures } = expireContracts(evolvedWithGoals);
      const nextUserTeam = { ...evolvedWithGoals, squad: contractSquad };
      evolvedRosters[careerState.leagueId] = evolvedRosters[careerState.leagueId].map(t =>
        t.id === evolvedUserTeam.id ? nextUserTeam : t
      );
      const { league: nextLeague, cup: nextCup } = createCareerSeason(nextUserTeam, evolvedRosters[careerState.leagueId], leagueDef, Math.random, evolvedRosters[pairedDivisionId(careerState.leagueId) ?? ''] ?? []);

      // Sponsor upgrade/downgrade baseado na reputação final da temporada
      let nextSponsorTier: SponsorTier = (getSponsorTier(careerState) as SponsorTier);
      let nextSponsorName = getSponsorName(careerState);
      const currentTierMin = getSponsorMinReputation(nextSponsorTier);
      const nextTierUp = getNextTierUp(nextSponsorTier);
      const nextTierDown = getNextTierDown(nextSponsorTier);

      if (nextTierDown && newReputation < currentTierMin) {
        nextSponsorTier = nextTierDown;
        const downgrade = generateSponsor(careerState.leagueId, careerState.season.league.userTeamId + '-down', nextSponsorTier);
        nextSponsorName = downgrade.name;
        setToastMsg(`📉 Patrocinador rebaixado para ${getSponsorLabel(nextSponsorTier)}: ${nextSponsorName}`);
      } else if (nextTierUp && newReputation >= getSponsorMinReputation(nextTierUp)) {
        nextSponsorTier = nextTierUp;
        const upgrade = generateSponsor(careerState.leagueId, careerState.season.league.userTeamId + '-up', nextSponsorTier);
        nextSponsorName = upgrade.name;
        setToastMsg(`📈 Novo patrocinador ${getSponsorLabel(nextSponsorTier)}: ${nextSponsorName}!`);
      }

      // Recalcula weeklyIncome com o multiplicador do novo tier
      // Receita base do clube (tamanho) × patrocínio atual; saves sem base caem no antigo.
      const econBase = finances.baseRevenue;
      const sponsoredIncome = econBase
        ? sponsorTvPerRound(econBase, careerState.leagueId, nextSponsorTier as SponsorTier)
        : Math.round(computeWeeklyIncome(careerState.leagueId) * getSponsorMultiplier(nextSponsorTier));
      const merch = computeMerchRevenue(newReputation);

      // ── Copa continental (UCL/UEL/UECL) ──
      // 1) Premiação da copa continental da temporada que ENCERROU (se o usuário disputou).
      let continentalPrize = 0;
      let wonContinental = false;
      const endingContinental = careerState.season.continentalCup;
      const endingContinentalId = careerState.season.continentalCupId;
      if (endingContinental && endingContinentalId) {
        const ccResult = deriveCupResult(endingContinental, careerState.season.league.userTeamId);
        continentalPrize = getContinentalPrizeMoney(endingContinentalId, ccResult);
        const ccName = careerState.season.continentalCupDef?.name ?? 'competição continental';
        objectiveMessages.push(createContinentalResultMessage(
          ccName, CUP_RESULT_LABELS[ccResult], continentalPrize,
          `Temporada ${careerState.currentSeasonYear}`,
        ));
        // Conquistas continentais avaliadas no fechamento — robusto tanto pra quem
        // jogou quanto pra quem simulou a final (o caminho por-partida só dispara ao jogar).
        unlockAchievement('continental_participant');
        if (ccResult === 'champion') {
          wonContinental = true;
          if (endingContinentalId === 'ucl') unlockAchievement('continental_champion');
          else if (endingContinentalId === 'uel') unlockAchievement('europa_king');
          else if (endingContinentalId === 'uecl') unlockAchievement('conference_king');
          // Tríplice Coroa: liga + copa nacional + UCL na mesma temporada.
          if (endingContinentalId === 'ucl' && leagueChampion && cupResult === 'champion') {
            unlockAchievement('treble_winner');
          }
        }
      }
      // 2) Classificação para a PRÓXIMA temporada, pela posição final na liga.
      const userCupDef = determineUserContinentalCup(leagueDef, leaguePosition);
      let nextContinentalBracket: BracketState | undefined;
      if (userCupDef) {
        const pool = getQualifiedTeams(evolvedRosters, allLeagues, userCupDef, nextUserTeam.id);
        nextContinentalBracket = createContinentalBracket(nextUserTeam, pool, userCupDef, careerState.leagueId);
        objectiveMessages.push(createContinentalQualificationMessage(
          userCupDef.name, `Temporada ${careerState.currentSeasonYear + 1}`,
        ));
      }

      // Generate objectives for the new season
      const nextBoardObj = generateBoardObjectives(nextLeague, newReputation, careerState.currentSeasonYear + 1, leaguePosition);
      objectiveMessages.push(createBoardObjectivesInboxMessage(nextBoardObj));

      // Fase 1 — Contratos: balanço de fim de temporada (saídas) + aviso do novo elenco
      // com contrato vencendo (≤1 temporada).
      if (departures.length > 0) {
        objectiveMessages.push(createContractDepartureMessage(departures.map(d => d.name), `Temporada ${careerState.currentSeasonYear}`));
      }
      if (goalPayments.length > 0) {
        objectiveMessages.push(createContractGoalBonusMessage(goalPayments, `Temporada ${careerState.currentSeasonYear}`));
      }
      const expiringSoon = nextUserTeam.squad.filter(p => getContractSeasonsLeft(p) <= 1);
      if (expiringSoon.length > 0) {
        objectiveMessages.push(createContractExpiringMessage(expiringSoon.map(p => p.name), `Temporada ${careerState.currentSeasonYear + 1}`));
      }

      // Categorias de base: evolui quem está lá, dispensa quem chegou aos 20 e recebe a
      // captação do ano. O usuário decide quem promover (tela Categorias de Base).
      const nextSeasonLabel = `Temporada ${careerState.currentSeasonYear + 1}`;
      const { remaining: youthRemaining, released: youthReleased } = refreshYouthPool(getYouthPool(careerState));
      const youthIntake = generateYouthIntake(careerState.currentSeasonYear + 1);
      const nextYouthPool = [...youthRemaining, ...youthIntake];
      objectiveMessages.push(createYouthIntakeMessage(youthIntake.map(p => p.name), nextSeasonLabel));
      const youthReady = youthRemaining.filter(canPromote);
      if (youthReady.length > 0) objectiveMessages.push(createYouthReadyMessage(youthReady.map(p => p.name), nextSeasonLabel));
      if (youthReleased.length > 0) objectiveMessages.push(createYouthReleasedMessage(youthReleased.map(p => p.name), nextSeasonLabel));

      // Confiança da diretoria: os objetivos pesam nela; se zerou, o técnico sai.
      const conf = seasonEndConfidence(careerState.boardConfidence ?? CONFIDENCE_START, objEval.totalRepDelta);
      const sackedAtSeasonEnd = conf.final <= CONFIDENCE_SACK;
      if (sackedAtSeasonEnd) newReputation = Math.max(0, newReputation - 8);

      // Fase 2 — Mercado de Treinador: sondagens pro novo ciclo, com a reputação final.
      const jobOffers = sackedAtSeasonEnd ? generateSackedOffers({
        rosters: evolvedRosters, currentClubId: evolvedUserTeam.id, currentLeagueId: careerState.leagueId,
        reputation: newReputation, seasonYear: careerState.currentSeasonYear + 1,
      }) : generateJobOffers({
        rosters: evolvedRosters,
        currentClubId: evolvedUserTeam.id,
        reputation: newReputation,
        currentSeasonYear: careerState.currentSeasonYear + 1,
      });

      if (sackedAtSeasonEnd) {
        objectiveMessages.push(createSackedMessage(evolvedUserTeam.name, 8, jobOffers.length, `Fim da temporada ${careerState.currentSeasonYear}`));
      }
      const totalsBefore = getCareerTotals(careerState);

      setCareerState(prev => {
        if (!prev) return prev;
        // Guarda contra duplo clique/estado stale: só avança se a temporada AINDA
        // está encerrada no estado mais recente — senão o fechamento era reaplicado
        // 2x (prêmios duplicados, objetivos gerados duas vezes).
        if (prev.season.league.phase !== 'done' || prev.season.cup.stage !== 'champion') return prev;
        return {
          ...prev,
          manager: { ...prev.manager, reputation: newReputation },
          currentSeasonYear: prev.currentSeasonYear + 1,
          season: {
            league: nextLeague, cup: nextCup, tradesUsedThisSeason: 0,
            budgetAtSeasonStart: finances.budget, userGoalScorers: {},
            continentalCup: nextContinentalBracket,
            continentalCupId: userCupDef?.id,
            continentalCupDef: userCupDef ?? undefined,
          },
          rosters: evolvedRosters,
          history: [...prev.history, entry],
          finances: {
            ...finances,
            budget: finances.budget + leaguePrize + cupPrize + goalBonuses + continentalPrize,
            wageBill: computeWageBill(nextUserTeam), weeklyIncome: sponsoredIncome, merchRevenue: merch,
            ...(econBase ? { wageCap: wageCap(econBase, careerState.leagueId, nextSponsorTier as SponsorTier) } : {}),
          },
          inbox: [...(prev.inbox ?? []), ...objectiveMessages],
          freeAgentPool: refreshFreeAgentPool(getFreeAgentPool(prev), prev.currentSeasonYear + 1, Math.random, departures),
          youthPool: nextYouthPool,
          sponsorTier: nextSponsorTier,
          sponsorName: nextSponsorName,
          boardObjectives: { ...nextBoardObj, streakBad: objEval.newStreak },
          jobOffers,
          // Fase 3 — as rodadas zeram no novo calendário; os flags pré-jogo (treino/
          // coletiva) devem recomeçar, senão a rodada 0 da temporada nova herdaria o
          // "já feito" da temporada anterior.
          preMatchDoneRound: undefined,
          pressDoneRound: undefined,
          pressStance: undefined,
          roundSummary: undefined,
          scouting: refreshScouting(prev.scouting),
          boardConfidence: conf.carried,
          careerTotals: wonContinental ? { ...totalsBefore, continentalTitles: totalsBefore.continentalTitles + 1 } : prev.careerTotals,
          ...(sackedAtSeasonEnd ? { sacked: { clubName: evolvedUserTeam.name, seasonYear: prev.currentSeasonYear + 1 } } : {}),
        };
      });
      setScreen('season-end');
    } catch (err) {
      console.error('handleAdvanceSeason crashed:', err);
      setToastMsg('Erro inesperado ao avançar temporada. Tente recarregar a página.');
    }
  }, [careerState, setCareerState, setScreen, setToastMsg, unlockAchievement]);

  const handleRenegotiateSponsor = useCallback(() => {
    if (!careerState) return;
    const current = getSponsorTier(careerState) as SponsorTier;
    const next = getNextTierUp(current);
    if (!next) {
      setToastMsg('Seu patrocínio já é Global — o nível máximo!');
      return;
    }
    const minRep = getSponsorMinReputation(next);
    if (careerState.manager.reputation < minRep) {
      setToastMsg(`Precisa de reputação ${minRep} para patrocínio ${getSponsorLabel(next)}. Atual: ${careerState.manager.reputation}`);
      return;
    }
    const newSponsor = generateSponsor(careerState.leagueId, careerState.season.league.userTeamId + '-neg', next);
    setCareerState(prev => {
      if (!prev) return prev;
      const econBase = prev.finances?.baseRevenue;
      const sponsoredIncome = econBase
        ? sponsorTvPerRound(econBase, prev.leagueId, next as SponsorTier)
        : Math.round(computeWeeklyIncome(prev.leagueId) * getSponsorMultiplier(next));
      return {
        ...prev,
        sponsorTier: next,
        sponsorName: newSponsor.name,
        finances: prev.finances ? {
          ...prev.finances, weeklyIncome: sponsoredIncome,
          ...(econBase ? { wageCap: wageCap(econBase, prev.leagueId, next as SponsorTier) } : {}),
        } : prev.finances,
      };
    });
    setToastMsg(`📈 Patrocínio renegociado! Novo tier: ${getSponsorLabel(next)} — ${newSponsor.name}`);
  }, [careerState, setCareerState, setToastMsg]);

  // Só a liga da carreira ativa sincroniza automaticamente (D-04, respeita o rate limit
  // das APIs). Ao navegar pra outra liga no Mercado, TransferMarketScreen sincroniza essa
  // liga sob demanda (uma vez, com cache de 7 dias) e persiste o resultado aqui — sem
  // isso, nome/idade/nacionalidade reais só apareciam pros jogadores da própria liga do

  const handleMarketRosterSynced = useCallback((leagueId: string, teams: Team[]) => {
    setCareerState(prev => prev ? { ...prev, rosters: { ...prev.rosters, [leagueId]: teams } } : prev);
  }, [setCareerState]);

  // Exposed for F5 restore — restores pending fixture info from a LiveMatchSnapshot so

  return {
    handleAdvanceSeason, handleRenegotiateSponsor, handleMarketRosterSynced,
  };
}