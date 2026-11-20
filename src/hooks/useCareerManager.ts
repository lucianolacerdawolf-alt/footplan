import { useCallback, useEffect, useRef, useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueDefinition } from '../data/leagues/types';
import { assignMarketValues, computeWageBill } from '../engine/transferMarket';
import { baseWeeklyRevenue, clubInitialBudget, sponsorTvPerRound, operatingCostPerRound, wageCap } from '../engine/clubEconomy';
import { createWelcomeMessage, createYouthIntakeMessage, createMilestoneMessage } from '../engine/inbox';
import { getCareerTotals, newlyReachedMilestones } from '../engine/careerMilestones';
import { getScouting, scoutPlayer } from '../engine/scouting';
import { initialReputation, REPUTATION_SEED_VERSION } from '../engine/reputation';
import { generateYouthIntake, promoteYouthPlayer, canPromote, YOUTH_MAX_LOANS } from '../engine/youthAcademy';
import { generateFreeAgentPool } from '../engine/freeAgentPool';
import { generateBoardObjectives, createBoardObjectivesInboxMessage } from '../engine/boardObjectives';
import { cloneTeam } from '../utils/teamUtils';
import { allLeagues } from '../data/leagues';
import { usePersistedState } from './usePersistedState';
import { useCloudSave } from './useCloudSave';
import { getRosterSyncInfo, getLoadedLeagueTeams } from '../services/rosterSync';
import { copyShirtNumbers, normalizeTeamsShirtNumbers } from '../utils/shirtNumbers';
import { ensureEconomy } from '../engine/career';
import { generateSponsor, tierForReputation } from '../engine/sponsors';
import { isValidCareerState, assignInitialAges, assignInitialContracts, createCareerSeason, pairedDivisionId, getYouthPool, type CareerState } from '../engine/career';
import { useCareerMatchFlow } from './career/useCareerMatchFlow';
import { useTransferManager } from './career/useTransferManager';
import { useCareerSeason } from './career/useCareerSeason';
import { useCareerInbox } from './career/useCareerInbox';
import { useCareerJobMarket } from './career/useCareerJobMarket';
import { useCareerConversations } from './career/useCareerConversations';
import { useCareerPreMatch } from './career/useCareerPreMatch';
import type { Screen } from '../types/navigation';
import type { AchievementEvalInput } from './useAchievements';

// Timestamp (ms) do último save local da carreira — usado pra reconciliar com o
// cloud no mount (o cloud só sobrescreve se for estritamente mais novo).
const CAREER_SAVED_AT_KEY = 'fp:career:savedAt';

interface UseCareerManagerParams {
  setScreen: (s: Screen) => void;
  setHomeTeam: (t: Team) => void;
  setAwayTeam: (t: Team) => void;
  setMatchContext: (c: 'regular' | 'league' | 'bracket' | 'online') => void;
  setIsKnockout: (v: boolean) => void;
  setIsTournamentEntry: (v: boolean) => void;
  setIsCareerMode: (v: boolean) => void;
  recordH2H: (homeId: string, awayId: string, homeScore: number, awayScore: number) => void;
  notifySave: () => void;
  setToastMsg: (msg: string | null) => void;
  /** Avalia conquistas ao fim de uma partida de carreira (liga/copa/continental). */
  evaluateAchievements: (input: AchievementEvalInput) => void;
  /** Destrava uma conquista específica fora do fluxo de partida — ex.: Tríplice Coroa. */
  unlockAchievement: (id: string) => void;
}


/** Números de camisa da carreira: tira os inventados (#90+ do sync antigo) e, quando os
 *  elencos atualizados já carregaram, copia o número de cada jogador (mesmo id). Usado
 *  no save local e no que chega da nuvem. Devolve o MESMO objeto se nada mudou. */
export function withFreshShirtNumbers(state: CareerState): CareerState {
  let changed = false;
  const fix = (teams: Team[] | undefined, leagueId: string): Team[] | undefined => {
    if (!teams) return teams;
    let out = normalizeTeamsShirtNumbers(teams);
    const src = getLoadedLeagueTeams(leagueId);
    if (src) out = copyShirtNumbers(out, src);
    if (out !== teams) changed = true;
    return out;
  };
  const rosters = { ...state.rosters };
  for (const id of Object.keys(rosters)) rosters[id] = fix(rosters[id], id) ?? rosters[id];
  const leagueTeams = fix(state.season.league.teams, state.leagueId) ?? state.season.league.teams;
  if (!changed) return state;
  return { ...state, rosters, season: { ...state.season, league: { ...state.season.league, teams: leagueTeams } } };
}

export function useCareerManager({
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry, setIsCareerMode,
  recordH2H, notifySave, setToastMsg, evaluateAchievements, unlockAchievement,
}: UseCareerManagerParams) {
  const [careerState, setCareerState] = usePersistedState<CareerState | null>('fp:career', null, { onPersist: notifySave });

  const { status: cloudStatus, loadFromCloud, enqueueCloudSave, retry: retryCloudSave } = useCloudSave();

  // T-04.4-02: fp:career pode ser JSON sintaticamente válido mas com shape errado
  // (editado manualmente no DevTools, ou versão antiga). Roda só no mount — não a
  // cada mudança de careerState, senão brigaria com uma atualização legítima em
  // andamento (o ref guarda o "já validei" e evita o double-run do StrictMode dev).
  const initialValidatedRef = useRef(false);
  useEffect(() => {
    if (initialValidatedRef.current) return;
    initialValidatedRef.current = true;
    if (careerState !== null && !isValidCareerState(careerState)) {
      setCareerState(null);
    }
  }, [careerState, setCareerState]);

  // Cloud save: tenta carregar do Supabase no mount se não houver save local.
  // Se o cloud tiver dados, sobrescreve o localStorage.
  // O cloud SÓ sobrescreve quando é estritamente mais novo que o save local:
  // o local é gravado de forma síncrona (usePersistedState), o cloud tem debounce
  // de 2s (useCloudSave) e falha offline — sem essa checagem, um cloud velho
  // apagava progresso local ao reabrir o app.
  const cloudLoadStartedRef = useRef(false);
  useEffect(() => {
    if (cloudLoadStartedRef.current) return;
    cloudLoadStartedRef.current = true;
    loadFromCloud().then(cloud => {
      if (!cloud || !isValidCareerState(cloud.state)) return;
      const cloudUpdatedAt = new Date(cloud.updatedAt).getTime();
      // Timestamp do save local lido AQUI (quando o cloud resolve), não no mount:
      // entre loadFromCloud() disparar e resolver (rede, lento) o usuário pode ter
      // criado/jogado uma carreira nova — o save dela (agora) é mais novo que um
      // cloud antigo e não pode ser sobrescrito. A leitura é idempotente, então o
      // updater abaixo permanece puro.
      let localSavedAt = 0;
      try { localSavedAt = Number(localStorage.getItem(CAREER_SAVED_AT_KEY)) || 0; } catch { /* noop */ }
      // Decide contra o estado local MAIS RECENTE (o `prev` do updater), nunca o
      // capturado no fecho do mount. Entre loadFromCloud() disparar e resolver
      // (rede, lento) o usuário pode ter criado/jogado uma carreira nova; usar o
      // careerState do mount (stale = null numa carreira recém-criada) caía no
      // ramo "!localValid" e um cloud antigo sobrescrevia esse progresso — era o
      // "joguei o 1º jogo da carreira e sumiu como se eu não tivesse jogado".
      setCareerState(prev => {
        const localValid = prev !== null && isValidCareerState(prev);
        // Save vindo da nuvem pode ser anterior à correção das camisas (#90+ / "1º livre"):
        // passa pela mesma correção do save local.
        if (!localValid) return withFreshShirtNumbers(ensureEconomy(cloud.state));
        // Só sobrescreve quando o cloud é estritamente mais novo que o save local.
        return (Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > localSavedAt) ? withFreshShirtNumbers(ensureEconomy(cloud.state)) : prev;
      });
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
      try { localStorage.setItem(CAREER_SAVED_AT_KEY, String(Date.now())); } catch { /* noop */ }
      enqueueCloudSave(careerState);
    }
  }, [careerState, enqueueCloudSave]);

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
        rosters[l.id] = assignInitialContracts(assignInitialAges(leagueDef.teams.map(t => t.id === userTeam.id ? cloneTeam(userTeam) : cloneTeam(t))).map(assignMarketValues));
      } else {
        // Ligas atualizadas já carregadas (preloadAllRosters no App); estático só de reserva.
        const teams = getLoadedLeagueTeams(l.id) ?? l.teams;
        rosters[l.id] = assignInitialContracts(assignInitialAges(teams.map(t => cloneTeam(t))));
      }
    }
    // Tolerante ao mesmo jeito que o resto desta função é: se o time do usuário não
    // bater com nenhum id estático da liga (ex: fixture de teste), ainda assim
    // segue — só não fica "achatado" com os valores de mercado dos outros times.
    const userTeamWithValues = rosters[leagueDef.id].find(t => t.id === userTeam.id) ?? assignInitialContracts([assignMarketValues(cloneTeam(userTeam))])[0];
    const { league, cup } = createCareerSeason(userTeamWithValues, rosters[leagueDef.id], leagueDef, Math.random, rosters[pairedDivisionId(leagueDef.id) ?? ''] ?? []);
    // Economia por tamanho de clube (clubEconomy.ts): receita, caixa inicial e teto
    // salarial partem da folha do clube — antes eram iguais pra toda a liga.
    const base = baseWeeklyRevenue(userTeamWithValues, leagueDef.id);
    const budget = clubInitialBudget(userTeamWithValues, rosters[leagueDef.id], leagueDef.id);
    const trimmedName = managerName.trim().slice(0, 24) || 'Técnico';
    // Patrocínio de largada pelo tamanho do clube (o nível que a reputação inicial alcança).
    const startRepForSponsor = initialReputation(userTeamWithValues, rosters[leagueDef.id], leagueDef.id);
    const startingTier = tierForReputation(startRepForSponsor);
    const sponsor = generateSponsor(leagueDef.id, userTeam.id, startingTier);
    const weeklyIncome = sponsorTvPerRound(base, leagueDef.id, startingTier, startingTier);
    // Reputação de partida pelo clube e pela liga (antes era 0 até no Arsenal).
    const startRep = initialReputation(userTeamWithValues, rosters[leagueDef.id], leagueDef.id);
    const boardObj = generateBoardObjectives(league, startRep, 1);
    const youthIntake = generateYouthIntake(1);
    const newState: CareerState = {
      version: 1,
      leagueId: leagueDef.id,
      manager: { name: trimmedName, reputation: startRep },
      reputationSeeded: true,
      reputationSeedVersion: REPUTATION_SEED_VERSION,
      currentSeasonYear: 1,
      season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: budget, userGoalScorers: {} },
      rosters,
      history: [],
      finances: {
        budget, wageBill: computeWageBill(userTeamWithValues), weeklyIncome,
        baseRevenue: base, operatingCost: operatingCostPerRound(base), wageCap: wageCap(base, leagueDef.id, startingTier, startingTier), sponsorStartTier: startingTier,
      },
      inbox: [createWelcomeMessage(trimmedName, budget, 'Temporada 1'), createBoardObjectivesInboxMessage(boardObj), createYouthIntakeMessage(youthIntake.map(p => p.name), 'Temporada 1')],
      freeAgentPool: generateFreeAgentPool(),
      youthPool: youthIntake,
      sponsorTier: startingTier,
      sponsorName: sponsor.name,
      boardObjectives: boardObj,
    };
    setCareerState(newState);
    setIsCareerMode(true);
    setScreen('career-hub');
  }, [setCareerState, setIsCareerMode, setScreen]);

  // Categorias de base: promove um jovem pronto (18+ e OVR 55+) ao elenco profissional.
  const handlePromoteYouthPlayer = useCallback((playerId: string) => {
    if (!careerState) return;
    const pool = getYouthPool(careerState);
    const youth = pool.find(p => p.id === playerId);
    if (!youth || !canPromote(youth)) return;
    const userTeamId = careerState.season.league.userTeamId;
    const leagueTeams = careerState.rosters[careerState.leagueId];
    const userTeam = leagueTeams.find(t => t.id === userTeamId);
    if (!userTeam) return;
    const updatedTeam = promoteYouthPlayer(youth, userTeam);
    const promoted = updatedTeam.squad[updatedTeam.squad.length - 1];
    setCareerState(prev => prev ? {
      ...prev,
      careerTotals: { ...getCareerTotals(prev), youthPromoted: getCareerTotals(prev).youthPromoted + 1 },
      youthPool: getYouthPool(prev).filter(p => p.id !== playerId),
      rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(t => t.id === userTeamId ? updatedTeam : t) },
      season: {
        ...prev.season,
        league: { ...prev.season.league, teams: prev.season.league.teams.map(t => t.id === userTeamId ? { ...t, squad: [...t.squad, promoted] } : t) },
      },
      finances: prev.finances ? { ...prev.finances, wageBill: computeWageBill(updatedTeam) } : prev.finances,
    } : prev);
    setToastMsg(`✅ ${youth.name} promovido ao elenco profissional!`);
  }, [careerState, setCareerState, setToastMsg]);

  // Base: escolhe o jovem com treino focado (toque de novo tira o foco).
  const handleSetYouthFocus = useCallback((playerId: string) => {
    if (!careerState) return;
    const youth = getYouthPool(careerState).find(p => p.id === playerId);
    if (!youth) return;
    const removing = careerState.youthFocusId === playerId;
    setCareerState(prev => prev ? { ...prev, youthFocusId: removing ? undefined : playerId } : prev);
    setToastMsg(removing ? `${youth.name} saiu do treino focado.` : `🎯 ${youth.name} terá treino focado — evolui mais no fim da temporada.`);
  }, [careerState, setCareerState, setToastMsg]);

  // Base: empresta (ou cancela o empréstimo de) um jovem até o fim da temporada.
  const handleToggleYouthLoan = useCallback((playerId: string) => {
    if (!careerState) return;
    const youth = getYouthPool(careerState).find(p => p.id === playerId);
    if (!youth) return;
    const loans = careerState.youthLoanIds ?? [];
    const onLoan = loans.includes(playerId);
    if (!onLoan && loans.length >= YOUTH_MAX_LOANS) { setToastMsg(`Limite de ${YOUTH_MAX_LOANS} empréstimos por temporada.`); return; }
    setCareerState(prev => prev ? {
      ...prev,
      youthLoanIds: onLoan ? (prev.youthLoanIds ?? []).filter(id => id !== playerId) : [...(prev.youthLoanIds ?? []), playerId],
      youthFocusId: !onLoan && prev.youthFocusId === playerId ? undefined : prev.youthFocusId,
    } : prev);
    setToastMsg(onLoan ? `${youth.name} voltou do empréstimo.` : `✈️ ${youth.name} emprestado até o fim da temporada — vai jogar e evoluir mais rápido.`);
  }, [careerState, setCareerState, setToastMsg]);

  // Base: dispensa um jovem (abre espaço e tira da lista).
  const handleReleaseYouth = useCallback((playerId: string) => {
    if (!careerState) return;
    const youth = getYouthPool(careerState).find(p => p.id === playerId);
    if (!youth) return;
    setCareerState(prev => prev ? {
      ...prev,
      youthPool: getYouthPool(prev).filter(p => p.id !== playerId),
      youthFocusId: prev.youthFocusId === playerId ? undefined : prev.youthFocusId,
      youthLoanIds: (prev.youthLoanIds ?? []).filter(id => id !== playerId),
    } : prev);
    setToastMsg(`${youth.name} foi dispensado da base.`);
  }, [careerState, setCareerState, setToastMsg]);

  // Olheiros: gasta um relatório da rodada pra revelar um jogador de fora.
  const handleScoutPlayer = useCallback((playerId: string): boolean => {
    if (!careerState) return false;
    const next = scoutPlayer(getScouting(careerState), playerId);
    if (!next) { setToastMsg('🔭 Sem relatórios de olheiro nesta rodada — recarregam na próxima'); return false; }
    setCareerState(prev => {
      if (!prev) return prev;
      const n = scoutPlayer(getScouting(prev), playerId);
      return n ? { ...prev, scouting: n } : prev;
    });
    return true;
  }, [careerState, setCareerState, setToastMsg]);

  const handleDismissRoundSummary = useCallback(() => {
    setCareerState(prev => prev?.roundSummary && !prev.roundSummary.seen
      ? { ...prev, roundSummary: { ...prev.roundSummary, seen: true } } : prev);
  }, [setCareerState]);

  // Marcos da carreira: qualquer mudança no estado pode completar um (jogo, título,
  // jovem promovido). Registra, avisa na caixa de entrada e mostra um toast.
  useEffect(() => {
    // Save inválido é descartado pelo efeito de validação do mount — não ler antes disso.
    if (!careerState || !isValidCareerState(careerState)) return;
    const fresh = newlyReachedMilestones(careerState);
    if (fresh.length === 0) return;
    setCareerState(prev => {
      if (!prev || !isValidCareerState(prev)) return prev;
      const now = newlyReachedMilestones(prev);
      if (now.length === 0) return prev;
      const date = `Temporada ${prev.currentSeasonYear}`;
      return {
        ...prev,
        milestonesReached: [...(prev.milestonesReached ?? []), ...now.map(m => m.id)],
        inbox: [...(prev.inbox ?? []), ...now.map(m => createMilestoneMessage(m.icon, m.title, date))],
      };
    });
    setToastMsg(`${fresh[0].icon} Marco da carreira: ${fresh[0].title}`);
  }, [careerState, setCareerState, setToastMsg]);

  const conversations = useCareerConversations({ careerState, setCareerState, setToastMsg });
  const preMatch = useCareerPreMatch({ careerState, setCareerState, setToastMsg });
  const matchFlow = useCareerMatchFlow({
    careerState, setCareerState, setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    recordH2H, setToastMsg, evaluateAchievements,
    generateConversation: conversations.handleMaybeGenerateConversation,
  });
  const transfers = useTransferManager({ careerState, setCareerState, setToastMsg });
  const season = useCareerSeason({ careerState, setCareerState, setScreen, setToastMsg, unlockAchievement });
  const inbox = useCareerInbox({ setCareerState });
  const jobMarket = useCareerJobMarket({ careerState, setCareerState, setScreen, setToastMsg });

  // Elencos vêm do snapshot no Supabase, atualizado FORA do jogo (admin roda
  // `npm run rosters:sync` de tempos em tempos). O cliente não dispara mais sync via API —
  // só lê a data da última atualização pra exibir no Hub. Falha é inofensiva (mantém null).
  const [rosterLastUpdatedAt, setRosterLastUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    getRosterSyncInfo().then(info => setRosterLastUpdatedAt(info.updatedAt)).catch(() => {});
  }, []);

  // Carreiras salvas antes de 2026-11-18 ficaram com números de camisa inventados
  // (#90+ do sync antigo, depois "1º número livre"). Quando os elencos atualizados
  // carregam, copia o número de cada jogador (mesmo id) — real ou "sem número".
  const refreshShirtNumbers = useCallback(() => {
    // Também converte saves antigos pra economia por tamanho de clube (ensureEconomy).
    setCareerState(prev => (prev ? withFreshShirtNumbers(ensureEconomy(prev)) : prev));
  }, [setCareerState]);

  return {
    careerState, setCareerState,
    refreshShirtNumbers,
    handleStartCareer,
    handlePromoteYouthPlayer,
    handleSetYouthFocus,
    handleReleaseYouth,
    handleToggleYouthLoan,
    handleScoutPlayer,
    handleDismissRoundSummary,
    rosterLastUpdatedAt,
    cloudStatus, retryCloudSave,
    ...matchFlow,
    ...transfers,
    ...season,
    ...inbox,
    ...jobMarket,
    ...conversations,
    ...preMatch,
  };
}
export type UseCareerManagerReturn = ReturnType<typeof useCareerManager>;
