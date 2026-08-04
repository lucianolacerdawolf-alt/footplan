import { useCallback, useEffect, useRef, useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueDefinition } from '../data/leagues/types';
import { assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome } from '../engine/transferMarket';
import { createWelcomeMessage } from '../engine/inbox';
import { generateFreeAgentPool } from '../engine/freeAgentPool';
import { generateBoardObjectives, createBoardObjectivesInboxMessage } from '../engine/boardObjectives';
import { cloneTeam } from '../utils/teamUtils';
import { allLeagues } from '../data/leagues';
import { usePersistedState } from './usePersistedState';
import { useCloudSave } from './useCloudSave';
import { syncAllLeagueRosters, getRosterSyncInfo } from '../services/rosterSync';
import { generateSponsor, getStartingTier, getSponsorMultiplier } from '../engine/sponsors';
import { isValidCareerState, assignInitialAges, assignInitialContracts, createCareerSeason, type CareerState } from '../engine/career';
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

export function useCareerManager({
  setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry, setIsCareerMode,
  recordH2H, notifySave, setToastMsg, evaluateAchievements, unlockAchievement,
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
  // O cloud SÓ sobrescreve quando é estritamente mais novo que o save local:
  // o local é gravado de forma síncrona (usePersistedState), o cloud tem debounce
  // de 2s (useCloudSave) e falha offline — sem essa checagem, um cloud velho
  // apagava progresso local ao reabrir o app.
  useEffect(() => {
    loadFromCloud().then(cloud => {
      if (!cloud || !isValidCareerState(cloud.state)) return;
      const cloudUpdatedAt = new Date(cloud.updatedAt).getTime();
      // Decide contra o estado local MAIS RECENTE (o `prev` do updater), nunca o
      // capturado no fecho do mount. Entre loadFromCloud() disparar e resolver
      // (rede, lento) o usuário pode ter criado/jogado uma carreira nova; usar o
      // careerState do mount (stale = null numa carreira recém-criada) caía no
      // ramo "!localValid" e um cloud antigo sobrescrevia esse progresso — era o
      // "joguei o 1º jogo da carreira e sumiu como se eu não tivesse jogado".
      setCareerState(prev => {
        const localValid = prev !== null && isValidCareerState(prev);
        if (!localValid) return cloud.state;
        let localSavedAt = 0;
        try { localSavedAt = Number(localStorage.getItem(CAREER_SAVED_AT_KEY)) || 0; } catch { /* noop */ }
        // Só sobrescreve quando o cloud é estritamente mais novo que o save local.
        return (Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > localSavedAt) ? cloud.state : prev;
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
        rosters[l.id] = assignInitialContracts(assignInitialAges(l.teams.map(t => cloneTeam(t))));
      }
    }
    // Tolerante ao mesmo jeito que o resto desta função é: se o time do usuário não
    // bater com nenhum id estático da liga (ex: fixture de teste), ainda assim
    // segue — só não fica "achatado" com os valores de mercado dos outros times.
    const userTeamWithValues = rosters[leagueDef.id].find(t => t.id === userTeam.id) ?? assignInitialContracts([assignMarketValues(cloneTeam(userTeam))])[0];
    const { league, cup } = createCareerSeason(userTeamWithValues, rosters[leagueDef.id], leagueDef);
    const budget = initialBudget(leagueDef.id);
    const trimmedName = managerName.trim().slice(0, 24) || 'Técnico';
    const startingTier = getStartingTier(leagueDef.id);
    const sponsor = generateSponsor(leagueDef.id, userTeam.id, startingTier);
    // O tier inicial (ex.: Global na PL) precisa refletir no patrocínio já na 1ª
    // temporada. Fim de temporada (useCareerSeason) e renegociação já aplicam o
    // multiplicador; a criação da carreira não aplicava, então um patrocínio Global
    // pagava como Local (base sem multiplicador). Agora bate com o resto do jogo.
    const weeklyIncome = Math.round(computeWeeklyIncome(leagueDef.id) * getSponsorMultiplier(startingTier));
    const boardObj = generateBoardObjectives(league, 0, 1);
    const newState: CareerState = {
      version: 1,
      leagueId: leagueDef.id,
      manager: { name: trimmedName, reputation: 0 },
      currentSeasonYear: 1,
      season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: budget, userGoalScorers: {} },
      rosters,
      history: [],
      finances: { budget, wageBill: computeWageBill(userTeamWithValues), weeklyIncome },
      inbox: [createWelcomeMessage(trimmedName, budget, 'Temporada 1'), createBoardObjectivesInboxMessage(boardObj)],
      freeAgentPool: generateFreeAgentPool(),
      sponsorTier: startingTier,
      sponsorName: sponsor.name,
      boardObjectives: boardObj,
    };
    setCareerState(newState);
    setIsCareerMode(true);
    setScreen('career-hub');
  }, [setCareerState, setIsCareerMode, setScreen]);

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

  // Atualização manual dos elencos via API: sincroniza as 12 ligas e grava o snapshot no
  // Supabase (via rosterSync). Atualiza rosters da carreira só para ligas FORA da liga do
  // usuário — a liga da carreira tem evolução/trocas/contratos que não podem ser sobrescritos.
  const [rosterSyncing, setRosterSyncing] = useState(false);
  const [rosterLastUpdatedAt, setRosterLastUpdatedAt] = useState<string | null>(null);

  const handleSyncRosters = useCallback(async () => {
    if (rosterSyncing) return;
    setRosterSyncing(true);
    setToastMsg('🔄 Atualizando elencos via API…');
    try {
      const result = await syncAllLeagueRosters({ force: true });
      if (result) {
        setCareerState(prev => {
          if (!prev) return prev;
          const rosters = { ...prev.rosters };
          for (const [lid, teams] of Object.entries(result.rosters)) {
            if (lid === prev.leagueId) continue;
            rosters[lid] = teams;
          }
          return { ...prev, rosters };
        });
        setRosterLastUpdatedAt(result.updatedAt);
        setToastMsg(
          result.liveCount > 0
            ? `✅ Elencos atualizados via API (${result.liveCount}/${result.leagueCount} ligas ao vivo).`
            : '⚠️ Não foi possível buscar da API — elencos mantidos.',
        );
      }
    } catch {
      setToastMsg('⚠️ Falha ao atualizar elencos via API.');
    } finally {
      setRosterSyncing(false);
    }
  }, [rosterSyncing, setCareerState, setToastMsg]);

  // Carrega a data da última atualização ao montar (exibe no Hub).
  useEffect(() => {
    getRosterSyncInfo().then(info => setRosterLastUpdatedAt(info.updatedAt)).catch(() => {});
  }, []);

  return {
    careerState, setCareerState,
    handleStartCareer,
    handleSyncRosters, rosterSyncing, rosterLastUpdatedAt,
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