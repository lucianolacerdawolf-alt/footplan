import React from 'react';
import type { Team, MatchResult, RandomFn } from '../engine/types';
import type { GameMode } from './TeamSelectionScreen';
import type { PlayableStage, LeagueState, BracketState, LeagueFixture, BracketMatch } from '../engine/tournament';
import type { Screen, MatchContext, TournamentMode } from '../types/navigation';
import type { LeagueDefinition } from '../data/leagues/types';
import type { UsePeerConnectionReturn } from '../hooks/usePeerConnection';
import type { MatchRecord } from '../hooks/useMatchHistory';
import type { UseAchievementsReturn } from '../hooks/useAchievements';
import type { LiveMatchSnapshot } from '../utils/liveMatchPersistence';
import type { Difficulty } from '../engine/matchConfig';
import type { UseCareerManagerReturn } from '../hooks/useCareerManager';
import { getInbox, getFinances, getFreeAgentPool, getTransferList, getTransferHistory, isTransferWindowOpen, getJobOffers, getSponsorTier, getSponsorName } from '../engine/career';
import { getSponsorLabel, getNextTierUp, getSponsorMultiplier, getSponsorMinReputation, type SponsorTier } from '../engine/sponsors';
import { getTicketRevenue } from '../engine/transferMarket';
import { hasMandatoryUnread } from '../engine/inbox';
import { computeStandings } from '../engine/tournament';
import { getStageMatches } from '../engine/bracketHelpers';
import { computeUserSeasonRecord } from '../engine/seasonClosure';
import { CUP_STAGE_LABELS } from '../engine/careerLabels';
import type { SeededRng } from '../engine/rng';
import type { ResumableSave } from './LeagueSelectScreen';

import HomeScreen from './HomeScreen';
import TeamSelectionScreen from './TeamSelectionScreen';
import SetupScreen from './SetupScreen';
import TournamentSetupScreen from './TournamentSetupScreen';
import LeagueScreen from './LeagueScreen';
import LeagueTableScreen from './LeagueTableScreen';
import BracketScreen from './BracketScreen';
import OnlineLobbyScreen from './OnlineLobbyScreen';
import LeagueSelectScreen from './LeagueSelectScreen';
import CupSelectScreen from './CupSelectScreen';
import CareerHubScreen from './CareerHubScreen';
import TradeProposalScreen from './TradeProposalScreen';
import SeasonEndScreen from './SeasonEndScreen';
import TrophyRoomScreen from './TrophyRoomScreen';
import TransferMarketScreen from './TransferMarketScreen';
import JobMarketScreen from './JobMarketScreen';
import MatchdayScreen from './MatchdayScreen';
import { getLeague } from '../data/leagues';

function getResumableSaves(): ResumableSave[] {
  const results: ResumableSave[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('fp:leagueState:')) continue;
      const leagueId = k.slice('fp:leagueState:'.length);
      const league = getLeague(leagueId);
      if (!league) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const ls = JSON.parse(raw) as { phase?: string; currentRound?: number; fixtures?: unknown[] };
      if (ls.phase && ls.phase !== 'done') {
        results.push({ type: 'league', league, label: `${league.name} — rodada ${(ls.currentRound ?? 0) + 1}` });
      }
    }
    const bsRaw = localStorage.getItem('fp:bracketState');
    if (bsRaw) {
      const bs = JSON.parse(bsRaw) as { stage?: string; leagueId?: string };
      if (bs.stage && bs.stage !== 'champion' && bs.leagueId) {
        const league = getLeague(bs.leagueId);
        if (league) results.push({ type: 'bracket', league, label: `Copa ${league.name}` });
      }
    }
  } catch { /* noop */ }
  return results;
}

// Lazy imports — same pattern as App.tsx
const MatchScreen = React.lazy(() => import('./MatchScreen'));
const MatchStatsScreen = React.lazy(() => import('./MatchStatsScreen'));
const AchievementsScreen = React.lazy(() => import('./AchievementsScreen'));

export interface AppScreensProps {
  // ── Team state ──
  homeTeam: Team | null;
  awayTeam: Team | null;
  gameMode: GameMode;
  lastResult: MatchResult | null;
  pendingResumeSnapshot: LiveMatchSnapshot | null;

  // ── Navigation / shell ──
  matchContext: MatchContext;
  isKnockout: boolean;
  tournamentMode: TournamentMode;
  isTournamentEntry: boolean;
  isCareerMode: boolean;
  selectedLeague: LeagueDefinition | null;
  returnScreen: Screen | null;

  // ── Tournament state ──
  leagueState: LeagueState | null;
  bracketState: BracketState | null;

  // ── Data ──
  history: MatchRecord[];
  achievements: UseAchievementsReturn;
  peer: UsePeerConnectionReturn;
  onlineRngRef: React.MutableRefObject<SeededRng | null>;

  // ── Screen navigation setters ──
  setScreen: (s: Screen) => void;
  setSelectedLeague: (l: LeagueDefinition) => void;
  setTournamentMode: (m: TournamentMode) => void;
  setReturnScreen: (s: Screen | null) => void;
  setPendingResumeSnapshot: (s: LiveMatchSnapshot | null) => void;
  setResumePrompt: (p: 'league' | 'bracket' | null) => void;
  setIsCareerMode: (v: boolean) => void;

  // ── Navigation helpers ──
  goHome: () => void;
  handleContinueTournament: () => void;

  // ── Game flow ──
  handleTeamsSelected: (home: Team, away: Team, mode: GameMode) => void;
  handleStartMatch: (home: Team, away: Team) => void;
  handleViewStats: (result: MatchResult) => void;
  handleViewStatsFromMatch: (result: MatchResult) => void;

  // ── Home navigation ──
  handleLeagueFromHome: () => void;
  handleCupFromHome: () => void;
  handleCareerFromHome: () => void;
  handleQuickPlay: () => void;
  handleNewCareerFromHub: () => void;
  handleCareerTournamentStart: (userTeam: Team, managerName?: string) => void;
  handleTournamentStart: (userTeam: Team) => void;

  // ── Online ──
  handleStartOnlineMatch: (home: Team, away: Team, seed: number) => void;
  handleOnlineMatchResult: (result: MatchResult) => void;

  // ── League manager ──
  handlePlayLeagueMatch: (fixture: LeagueFixture, home: Team, away: Team) => void;
  handleSimulateUserLeagueMatch: () => void;
  handleSimulateLeagueRound: (roundIndex: number) => void;
  handleNextLeagueRound: () => void;
  handleEditLeagueTactics: () => void;

  // ── Bracket manager ──
  handlePlayBracketMatch: (match: BracketMatch, home: Team, away: Team, stage: PlayableStage, matchIdx: number) => void;
  handleSimulateOtherBracketMatches: () => void;
  handleSimulateBracketMatch: (stage: PlayableStage, matchIdx: number) => void;
  handleEditBracketTactics: () => void;

  // ── Career manager ──
  // Bundle inteiro do useCareerManager num único prop, em vez de ~50 handlers
  // repassados individualmente (reduz o prop drilling). Telas de carreira leem
  // p.career.<handler>.
  career: UseCareerManagerReturn;

  // ── Misc ──
  clearHistory: () => void;
  setIsTournamentEntry: (v: boolean) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
}

type ScreenRenderer = (props: AppScreensProps) => React.ReactNode;

/** Índice da partida dentro do estágio atual da chave. Antes esse trecho
 *  (selecionar as partidas do estágio + findIndex) estava copiado nos três
 *  renderers de mata-mata: copa (`bracket`/`career-bracket`) e continental. */
const stageMatchIndex = (bracket: BracketState, match: BracketMatch): number =>
  getStageMatches(bracket).findIndex(m => m.id === match.id);

/** Mapa tela→renderer. Exportado pra teste de navegação (P3 #9) — afere que
 *  todo `Screen` do tipo fechado tem renderer, e que nenhum onBack pode apontar
 *  pra uma tela sem mapeamento. */
export const screenMap: Record<Screen, ScreenRenderer> = {
  'cup-select': (p) => (
    <CupSelectScreen
      onBack={p.goHome}
      onSelect={(league) => {
        localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
        p.setSelectedLeague(league);
        try {
          const raw = localStorage.getItem('fp:bracketState');
          const bs = raw ? (JSON.parse(raw) as { stage?: string; leagueId?: string }) : null;
          if (bs && bs.leagueId === league.id && bs.stage !== 'champion') { p.setResumePrompt('bracket'); return; }
        } catch { /**/ }
        p.setScreen('tournament-setup');
      }}
    />
  ),

  'league-select': (p) => (
    <LeagueSelectScreen
      selectedLeague={p.selectedLeague}
      isCareer={p.isCareerMode}
      resumable={p.isCareerMode ? [] : getResumableSaves()}
      onResume={(save) => {
        localStorage.setItem('fp:selectedLeague', JSON.stringify(save.league.id));
        p.setSelectedLeague(save.league);
        p.setTournamentMode(save.type);
        p.setReturnScreen(null);
        p.setScreen(save.type === 'league' ? 'league' : 'bracket');
      }}
      onBack={() => { p.setReturnScreen(null); if (p.isCareerMode && p.career.careerState) { p.setScreen('career-hub'); } else { p.setIsCareerMode(false); p.setScreen('home'); } }}
      onSelect={(league) => {
        localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
        p.setSelectedLeague(league);
        if (p.isCareerMode) {
          p.setReturnScreen(null);
          p.setScreen('tournament-setup');
          return;
        }
        const target = p.returnScreen ?? 'home' as Screen;
        p.setReturnScreen(null);
        if (target === 'tournament-setup') {
          if (p.tournamentMode === 'league') {
            try {
              const raw = localStorage.getItem(`fp:leagueState:${league.id}`);
              const ls = raw ? (JSON.parse(raw) as { phase?: string }) : null;
              if (ls && ls.phase !== 'done') { p.setResumePrompt('league'); return; }
            } catch { /**/ }
          } else if (p.tournamentMode === 'bracket') {
            try {
              const raw = localStorage.getItem('fp:bracketState');
              const bs = raw ? (JSON.parse(raw) as { stage?: string; leagueId?: string }) : null;
              if (bs && bs.leagueId === league.id && bs.stage !== 'champion') { p.setResumePrompt('bracket'); return; }
            } catch { /**/ }
          }
        }
        p.setScreen(target);
      }}
    />
  ),

  'home': (p) => renderHome(p),

  'select': (p) => (
    <TeamSelectionScreen
      teams={p.selectedLeague?.teams ?? getLeague('pl')!.teams}
      leagueName={p.selectedLeague?.name ?? 'Premier League'}
      onConfirm={p.handleTeamsSelected}
      onBack={() => { localStorage.removeItem('fp:homeId'); localStorage.removeItem('fp:awayId'); p.setReturnScreen('select'); p.setScreen('league-select'); }}
      onGoHome={() => { localStorage.removeItem('fp:homeId'); localStorage.removeItem('fp:awayId'); p.goHome(); }}
    />
  ),

  'online-lobby': (p) => (
    <OnlineLobbyScreen peer={p.peer} onStartMatch={p.handleStartOnlineMatch} onBack={() => p.setScreen('home')} onGoHome={p.goHome} />
  ),

  'tournament-setup': (p) => {
    const league = p.selectedLeague;
    if (!league) return null;
    return (
      <TournamentSetupScreen
        mode={p.isCareerMode ? 'career' : p.tournamentMode}
        league={league}
        onBack={() => { p.setScreen(p.tournamentMode === 'bracket' ? 'cup-select' : 'league-select'); }}
        onGoHome={p.goHome}
        onStart={p.isCareerMode ? p.handleCareerTournamentStart : p.handleTournamentStart}
        onRosterSynced={p.setSelectedLeague}
      />
    );
  },

  'league': (p) => {
    const league = p.selectedLeague;
    if (!p.leagueState || !league) return null;
    return (
      <LeagueScreen
        state={p.leagueState}
        league={league}
        onPlayMatch={p.handlePlayLeagueMatch}
        onSimulateUserMatch={p.handleSimulateUserLeagueMatch}
        onSimulateRound={p.handleSimulateLeagueRound}
        onNextRound={p.handleNextLeagueRound}
        onEditTactics={p.handleEditLeagueTactics}
        onViewTable={() => p.setScreen('league-table')}
        onBack={p.goHome}
      />
    );
  },

  'league-table': (p) => {
    const league = p.selectedLeague;
    if (!p.leagueState || !league) return null;
    return (
      <LeagueTableScreen
        state={p.leagueState}
        league={league}
        onBack={() => p.setScreen('league')}
      />
    );
  },

  'bracket': (p) => {
    const bracket = p.bracketState;
    if (!bracket) return null;
    return (
      <BracketScreen
        state={bracket}
        onPlayMatch={(match, home, away) => {
          p.handlePlayBracketMatch(match, home, away, bracket.stage as PlayableStage, stageMatchIndex(bracket, match));
        }}
        onSimulateMatch={p.handleSimulateBracketMatch}
        onSimulateOthers={p.handleSimulateOtherBracketMatches}
        onEditTactics={p.handleEditBracketTactics}
        onBack={p.goHome}
      />
    );
  },

  'setup': (p) => {
    if (!p.homeTeam || !p.awayTeam) return null;
    const mode: 'single' | 'league' | 'cup' | 'career' | 'online' =
      p.isCareerMode ? 'career'
      : p.matchContext === 'league' ? 'league'
      : p.matchContext === 'bracket' ? 'cup'
      : p.matchContext === 'online' ? 'online'
      : 'single';
    // Torneios/carreira não garantem que o time do usuário seja sempre "home" na partida
    // (o calendário decide quem manda em cada rodada) — sem isso, a tela solo sempre
    // mostrava/editava "home", deixando o usuário mexer no time adversário quando o dele
    // era o visitante daquela partida.
    const tournamentUserTeamId =
      p.isCareerMode && p.matchContext === 'league' ? p.career.careerState?.season.league.userTeamId
      : p.isCareerMode && p.matchContext === 'bracket' ? p.career.careerState?.season.cup.userTeamId
      : p.matchContext === 'league' ? p.leagueState?.userTeamId
      : p.matchContext === 'bracket' ? p.bracketState?.userTeamId
      : undefined;
    const userIsHome = tournamentUserTeamId === undefined || p.homeTeam.id === tournamentUserTeamId;
    return (
      <SetupScreen
        homeTeam={p.homeTeam}
        awayTeam={p.awayTeam}
        mode={mode}
        onStartMatch={p.handleStartMatch}
        onBack={() => {
          const wasTournamentEntry = p.isTournamentEntry;
          p.setIsTournamentEntry(false);
          if (wasTournamentEntry && p.returnScreen) {
            p.setScreen(p.returnScreen);
            p.setReturnScreen(null);
            return;
          }
          if (p.isCareerMode && p.matchContext === 'league') { p.setScreen('career-league'); return; }
          if (p.isCareerMode && p.matchContext === 'bracket') { p.setScreen('career-bracket'); return; }
          if (p.matchContext === 'league') p.setScreen('league');
          else if (p.matchContext === 'bracket') p.setScreen('bracket');
          else p.setScreen('select');
        }}
        isTacticsOnly={p.isTournamentEntry}
        lockAway={p.matchContext !== 'regular' || p.gameMode === 'cpu'}
        userIsHome={userIsHome}
        goesToPreview={p.matchContext === 'league' || p.matchContext === 'bracket'}
        onRenewContract={p.isCareerMode && p.isTournamentEntry ? (playerId, options) => p.career.handleRenewContract(playerId, options) : undefined}
        currentSeasonYear={p.career.careerState?.currentSeasonYear}
        budget={p.career.careerState ? getFinances(p.career.careerState).budget : undefined}
      />
    );
  },

  'match': (p) => {
    if (!p.homeTeam || !p.awayTeam) return null;
    const onlineRng = p.matchContext === 'online' ? p.onlineRngRef.current : null;
    const onlineRngFn: RandomFn | undefined = onlineRng ? () => onlineRng.next() : undefined;
    const onlineProps = p.matchContext === 'online' && p.peer.state === 'connected' ? {
      isHost: p.peer.isHost,
      send: p.peer.send,
      setOnData: p.peer.setOnData,
      peerConnected: p.peer.peerConnected,
    } : undefined;
    const isTournament = p.matchContext === 'league' || p.matchContext === 'bracket';
    const leagueForTicker = p.isCareerMode ? p.career.careerState?.season.league : p.leagueState;
    const tickerFixtures = p.matchContext === 'league' && leagueForTicker
      ? leagueForTicker.fixtures[leagueForTicker.currentRound] ?? undefined
      : undefined;
    const tickerTeams = p.matchContext === 'league' && leagueForTicker
      ? leagueForTicker.teams
      : undefined;
    const userSide: 'home' | 'away' | undefined =
      p.matchContext === 'league'
        ? p.isCareerMode
          ? p.career.careerState?.season.league.userTeamId === p.homeTeam.id ? 'home' : 'away'
          : p.leagueState?.userTeamId === p.homeTeam.id ? 'home' : 'away'
        : p.matchContext === 'bracket'
        ? p.isCareerMode
          ? p.career.careerState?.season.cup.userTeamId === p.homeTeam.id ? 'home' : 'away'
          : p.bracketState?.userTeamId === p.homeTeam.id ? 'home' : 'away'
        : undefined;
    const matchBackScreen = isTournament ? 'matchday' : p.matchContext === 'online' ? 'online-lobby' : p.returnScreen === 'home' ? 'home' : 'setup';
    return (
      <MatchScreen
        homeTeam={p.homeTeam}
        awayTeam={p.awayTeam}
        onBack={() => p.setScreen(matchBackScreen)}
        onViewStats={p.matchContext === 'online' ? p.handleOnlineMatchResult : p.handleViewStatsFromMatch}
        isKnockout={p.isKnockout}
        rng={onlineRngFn}
        online={onlineProps}
        onContinue={isTournament ? p.handleContinueTournament : undefined}
        continueLabel={p.matchContext === 'league' ? (p.selectedLeague ? `Continuar ${p.selectedLeague.name}` : 'Continuar Liga') : p.matchContext === 'bracket' ? `Continuar ${p.bracketState?.cupName ?? 'Copa'}` : undefined}
        matchContext={p.matchContext}
        userSide={userSide}
        resumeSnapshot={p.pendingResumeSnapshot}
        onResumeConsumed={() => p.setPendingResumeSnapshot(null)}
        gameMode={p.gameMode}
        roundFixtures={tickerFixtures}
        teams={tickerTeams}
      />
    );
  },

  'matchday': (p) => {
    if (!p.homeTeam || !p.awayTeam) return null;
    const totalRounds = p.isCareerMode
      ? p.career.careerState?.season.league.fixtures.length ?? 38
      : p.leagueState?.fixtures.length ?? 38;
    const currentRound = p.isCareerMode
      ? (p.career.careerState?.season.league.currentRound ?? 0) + 1
      : (p.leagueState?.currentRound ?? 0) + 1;
    const stageLabel = (stage: string) =>
      stage === 'roundOf16' ? 'Oitavas' : stage === 'quarterfinals' ? 'Quartas' : stage === 'semifinals' ? 'Semis' : stage === 'final' ? 'Final' : stage === 'champion' ? 'Campeão' : undefined;
    const roundLabel = p.matchContext === 'league'
      ? `Rodada ${currentRound} / ${totalRounds}`
      : p.matchContext === 'bracket'
        ? (p.isCareerMode
          ? stageLabel(p.career.careerState?.season.cup.stage ?? '')
          : stageLabel(p.bracketState?.stage ?? ''))
        : undefined;

    let contextLabel = p.matchContext === 'bracket'
      ? (p.isCareerMode ? (p.career.careerState?.season.cup.cupName ?? 'Copa') : (p.bracketState?.cupName ?? 'Copa'))
      : p.matchContext === 'league'
        ? (p.isCareerMode ? (getLeague(p.career.careerState?.leagueId ?? '')?.name ?? 'Liga') : (p.selectedLeague?.name ?? 'Liga'))
        : 'Amistoso';
    if (p.isCareerMode) contextLabel += ` · Temporada ${p.career.careerState?.currentSeasonYear ?? 1}`;

    return (
      <MatchdayScreen
        homeTeam={p.homeTeam}
        awayTeam={p.awayTeam}
        contextLabel={contextLabel}
        roundLabel={roundLabel}
        onPlay={() => p.setScreen('match')}
        onBack={() => p.setScreen('setup')}
      />
    );
  },

  'stats': (p) => {
    if (!p.lastResult) return null;
    const isTournament = p.matchContext !== 'regular' && p.matchContext !== 'online';
    const isTitleWin = p.matchContext === 'bracket' && p.lastResult.winner
      && (p.isCareerMode
        ? p.career.careerState?.season.cup.userTeamId === p.lastResult.winner.id
        : p.bracketState?.userTeamId === p.lastResult.winner.id);
    // Time do usuário para o badge Vitória/Derrota/Empate — sem isso, o badge
    // assumia o time da casa, invertendo o resultado em jogos fora de casa.
    const userTeamId = p.matchContext === 'league'
      ? (p.isCareerMode ? p.career.careerState?.season.league.userTeamId : p.leagueState?.userTeamId)
      : p.matchContext === 'bracket'
        ? (p.isCareerMode ? p.career.careerState?.season.cup.userTeamId : p.bracketState?.userTeamId)
        : undefined;
    return (
      <MatchStatsScreen
        result={p.lastResult}
        history={isTournament ? [] : p.history}
        onMenu={p.goHome}
        onClearHistory={p.clearHistory}
        onContinue={isTournament ? p.handleContinueTournament : p.matchContext === 'online' ? () => p.setScreen('online-lobby') : undefined}
        continueLabel={p.matchContext === 'online' ? 'Voltar ao Lobby' : p.matchContext === 'league' ? (p.selectedLeague ? `Continuar ${p.selectedLeague.name}` : 'Continuar Liga') : p.matchContext === 'bracket' ? `Continuar ${p.bracketState?.cupName ?? 'Copa'}` : undefined}
        isTitleWin={isTitleWin}
        userTeamId={userTeamId}
      />
    );
  },

  'achievements': (p) => (
    <AchievementsScreen
      achievements={p.achievements.getAll()}
      onBack={p.goHome}
    />
  ),

  'career-hub': (p) => {
    if (!p.career.careerState) return null;
    const hubBlockAdvanceReason = hasMandatoryUnread(getInbox(p.career.careerState))
      ? 'Leia as mensagens obrigatórias acima antes de avançar'
      : undefined;
    return (
      <CareerHubScreen
        state={p.career.careerState}
        league={getLeague(p.career.careerState.leagueId)!}
        onViewContinental={() => p.setScreen('career-continental')}
        onPlayNext={p.career.handlePlayNextCareerMatch}
        onPlayNextCup={p.career.handlePlayNextCareerCupMatch}
        onPlayNextContinental={p.career.handlePlayNextContinentalMatch}
        onAdvanceSeason={p.career.handleAdvanceSeason}
        onNewCareer={p.handleNewCareerFromHub}
        onBack={() => { p.setIsCareerMode(false); p.goHome(); }}
        onMarkInboxRead={p.career.handleMarkInboxRead}
        onAcceptTransferOffer={p.career.handleAcceptTransferOffer}
        onRejectTransferOffer={p.career.handleRejectTransferOffer}
        onNextRound={p.career.handleNextCareerLeagueRound}
        onViewLeague={() => p.setScreen('career-league')}
        onOpenJobMarket={() => p.setScreen('career-job-market')}
        jobOfferCount={getJobOffers(p.career.careerState).length}
        onRespondConversation={p.career.handleRespondConversation}
        onApplyTraining={p.career.handleApplyTraining}
        onOpenPressConference={p.career.handleOpenPressConference}
        onAnswerPressConference={p.career.handleRespondPressConference}
        onClosePressConference={p.career.handleClosePressConference}
        pressQuestion={p.career.pressQuestion}
        pressDone={p.career.pressDone}
        blockAdvanceReason={hubBlockAdvanceReason}
        onSyncRosters={p.career.handleSyncRosters}
        rosterSyncing={p.career.rosterSyncing}
        rosterLastUpdatedAt={p.career.rosterLastUpdatedAt}
        cloudStatus={p.career.cloudStatus}
        onRetryCloudSave={p.career.retryCloudSave}
      />
    );
  },

  'transfer-market': (p) => {
    if (!p.career.careerState) return null;
    const finances = getFinances(p.career.careerState);
    const userTeamId = p.career.careerState.season.league.userTeamId;
    return (
      <TransferMarketScreen
        userTeam={p.career.careerState.rosters[p.career.careerState.leagueId].find(t => t.id === userTeamId)!}
        userLeagueId={p.career.careerState.leagueId}
        rosters={p.career.careerState.rosters}
        freeAgents={getFreeAgentPool(p.career.careerState)}
        transferListPlayerIds={getTransferList(p.career.careerState)}
        budget={finances.budget}
        isWindowOpen={isTransferWindowOpen(p.career.careerState.season.league.currentRound)}
        onBuyPlayer={p.career.handleBuyPlayer}
        onListPlayerForSale={p.career.handleListPlayerForSale}
        onUnlistPlayerForSale={p.career.handleUnlistPlayerForSale}
        onSignFreeAgent={p.career.handleSignFreeAgent}
        onRosterSynced={p.career.handleMarketRosterSynced}
        onProposeTrade={() => p.setScreen('trade-propose')}
      />
    );
  },

  'career-trophy-room': (p) => {
    if (!p.career.careerState) return null;
    const cs = p.career.careerState;
    // Só o estado vazio usa isto: sem nenhuma temporada concluída, a tela mostra
    // a campanha em curso em vez de "nenhuma temporada concluída ainda" e nada mais.
    const lg = cs.season.league;
    const standings = computeStandings(lg.teams, lg.fixtures);
    const record = computeUserSeasonRecord(lg);
    const currentSeason = {
      leagueName: getLeague(cs.leagueId)?.name ?? 'a liga',
      position: standings.findIndex(s => s.teamId === lg.userTeamId) + 1,
      round: lg.currentRound,
      totalRounds: lg.fixtures.length,
      wins: record.wins,
      draws: record.draws,
      losses: record.losses,
      cupStageLabel: CUP_STAGE_LABELS[cs.season.cup.stage] ?? cs.season.cup.stage,
    };
    const sponsorTier = getSponsorTier(cs) as SponsorTier;
    const nextTier = getNextTierUp(sponsorTier);
    const userTeam = lg.teams.find(t => t.id === lg.userTeamId);
    return (
      <TrophyRoomScreen
        history={cs.history}
        finances={getFinances(cs)}
        transfers={getTransferHistory(cs)}
        currentSeason={currentSeason}
        reputation={cs.manager.reputation}
        userSquad={cs.rosters[cs.leagueId]?.find(t => t.id === lg.userTeamId)?.squad}
        userTeamName={lg.teams.find(t => t.id === lg.userTeamId)?.name}
        userTeamLogo={lg.teams.find(t => t.id === lg.userTeamId)?.logoUrl}
        stadium={lg.teams.find(t => t.id === lg.userTeamId)?.stadium}
        leagueName={getLeague(cs.leagueId)?.name ?? ''}
        leagueFlag={getLeague(cs.leagueId)?.flag ?? ''}
        seasonYear={cs.currentSeasonYear}
        sponsorLabel={getSponsorLabel(sponsorTier)}
        sponsorName={getSponsorName(cs)}
        ticketRevenue={getTicketRevenue(cs.leagueId)}
        nextSponsorTier={nextTier}
        sponsorMultiplier={getSponsorMultiplier(sponsorTier)}
        nextTierReputation={nextTier ? getSponsorMinReputation(nextTier) : null}
        capacity={userTeam?.capacity}
        morale={userTeam?.morale}
        onRenegotiateSponsor={p.career.handleRenegotiateSponsor}
        onRenewContract={(playerId, options) => p.career.handleRenewContract(playerId, options)}
      />
    );
  },

  'career-league': (p) => {
    if (!p.career.careerState) return null;
    const blockAdvanceReason = hasMandatoryUnread(getInbox(p.career.careerState))
      ? 'Leia as mensagens obrigatórias na Central de Carreira antes de avançar'
      : undefined;
    return (
      <LeagueScreen
        state={p.career.careerState.season.league}
        league={getLeague(p.career.careerState.leagueId)!}
        onPlayMatch={p.career.handlePlayCareerLeagueMatch}
        onSimulateUserMatch={p.career.handleSimulateUserCareerLeagueMatch}
        onSimulateRound={p.career.handleSimulateCareerLeagueRound}
        onNextRound={p.career.handleNextCareerLeagueRound}
        onEditTactics={p.career.handleEditCareerLeagueTactics}
        onViewTable={() => p.setScreen('career-league-table')}
        onViewCup={() => p.setScreen('career-bracket')}
        onBack={() => p.setScreen('career-hub')}
        onOpenJobMarket={() => p.setScreen('career-job-market')}
        jobMarketOffers={getJobOffers(p.career.careerState).length}
        blockAdvanceReason={blockAdvanceReason}
        hideTopNav
      />
    );
  },

  'career-league-table': (p) => {
    if (!p.career.careerState) return null;
    const league = getLeague(p.career.careerState.leagueId);
    if (!league) return null;
    return (
      <LeagueTableScreen
        state={p.career.careerState.season.league}
        league={league}
        onBack={() => p.setScreen('career-league')}
        hideTopNav
      />
    );
  },

  'career-bracket': (p) => {
    const cup = p.career.careerState?.season.cup;
    if (!p.career.careerState || !cup) return null;
    return (
      <BracketScreen
        state={cup}
        onPlayMatch={(match, home, away) => {
          p.career.handlePlayCareerBracketMatch(match, home, away, cup.stage as PlayableStage, stageMatchIndex(cup, match));
        }}
        onSimulateMatch={p.career.handleSimulateCareerBracketMatch}
        onSimulateOthers={p.career.handleSimulateOtherCareerBracketMatches}
        onSimulateToEnd={p.career.handleSimulateCareerCupToEnd}
        onEditTactics={p.career.handleEditCareerBracketTactics}
        onBack={() => p.setScreen('career-hub')}
        hideTopNav
      />
    );
  },

  'career-continental': (p) => {
    const cc = p.career.careerState?.season.continentalCup;
    const ccDef = p.career.careerState?.season.continentalCupDef;
    if (!cc || !ccDef) return null;
    return (
      <BracketScreen
        state={cc}
        cupColor={ccDef.color}
        onPlayMatch={(match, home, away) => {
          p.career.handlePlayContinentalMatch(match, home, away, cc.stage as PlayableStage, stageMatchIndex(cc, match));
        }}
        onSimulateMatch={p.career.handleSimulateContinentalMatch}
        onSimulateOthers={p.career.handleSimulateOtherContinentalMatches}
        onSimulateToEnd={p.career.handleSimulateContinentalToEnd}
        onEditTactics={p.career.handleEditContinentalTactics}
        onBack={() => p.setScreen('career-hub')}
        hideTopNav
      />
    );
  },

  'trade-propose': (p) => {
    const cs = p.career.careerState;
    if (!cs) return null;
    const userTeam = cs.season.league.teams
      .find(t => t.id === cs.season.league.userTeamId);
    if (!userTeam) return null;
    return (
      <TradeProposalScreen
        userTeam={userTeam}
        opponentTeams={cs.rosters[cs.leagueId].filter(t => t.id !== cs.season.league.userTeamId)}
        budget={getFinances(cs).budget}
        onBack={() => p.setScreen('transfer-market')}
        onPropose={p.career.handleProposeTrade}
      />
    );
  },

  'career-job-market': (p) => {
    const cs = p.career.careerState;
    if (!cs) return null;
    const userTeam = cs.rosters[cs.leagueId]
      .find(t => t.id === cs.season.league.userTeamId);
    return (
      <JobMarketScreen
        offers={getJobOffers(cs)}
        reputation={cs.manager.reputation}
        currentClubName={userTeam?.name ?? 'Seu clube'}
        rosters={cs.rosters}
        onAccept={p.career.handleAcceptJobOffer}
        onDecline={p.career.handleDeclineJobOffer}
        onBack={() => p.setScreen('career-hub')}
      />
    );
  },

  'season-end': (p) => {
    if (!p.career.careerState || p.career.careerState.history.length === 0) return null;
    const league = getLeague(p.career.careerState.leagueId);
    if (!league) return null;
    return (
      <SeasonEndScreen
        entry={p.career.careerState.history[p.career.careerState.history.length - 1]}
        league={league}
        newReputation={p.career.careerState.manager.reputation}
        onContinue={() => p.setScreen('career-hub')}
      />
    );
  },
};

function renderHome(props: AppScreensProps): React.ReactNode {
  return (
    <HomeScreen
      onSingleMatch={() => { props.setReturnScreen('select'); props.setScreen('league-select'); }}
      onQuickPlay={props.handleQuickPlay}
      onLeague={props.handleLeagueFromHome}
      onCareer={props.handleCareerFromHome}
      onCup={props.handleCupFromHome}
      onAchievements={() => props.setScreen('achievements')}
      onOnline={() => props.setScreen('online-lobby')}
      difficulty={props.difficulty}
      onSetDifficulty={props.setDifficulty}
    />
  );
}

export function renderScreen(screen: Screen, props: AppScreensProps): React.ReactNode {
  const result = screenMap[screen](props);
  if (result == null) return renderHome(props);
  return result;
}
