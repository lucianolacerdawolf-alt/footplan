import { useMemo } from 'react';
import type { CareerState } from '../engine/career';
import { getInbox, isTransferWindowOpen, getSponsorTier, getSponsorName, getFinances, deriveCupProgress } from '../engine/career';
import { getSponsorLabel, getNextTierUp, type SponsorTier } from '../engine/sponsors';
import { getObjectives, getObjectiveProgress } from '../engine/boardObjectives';
import { computeUserSeasonRecord } from '../engine/seasonClosure';
import type { LeagueDefinition } from '../data/leagues/types';
import type { LeagueFixture } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import { getStageMatches } from '../engine/bracketHelpers';
import { CUP_STAGE_LABELS } from '../engine/careerLabels';
import { playerOvr } from '../utils/playerOvr';
import { getStarterCount } from '../engine/squadUtils';
import InboxPanel from './InboxPanel';
import styles from './CareerHubScreen.module.css';

interface Props {
  state: CareerState;
  league: LeagueDefinition;
  onViewCup: () => void;
  onPlayNext: () => void;
  onPlayNextCup: () => void;
  onAdvanceSeason: () => void;
  onNewCareer: () => void;
  onBack: () => void;
  onMarkInboxRead: (id: string) => void;
  onAcceptTransferOffer: (id: string) => void;
  onRejectTransferOffer: (id: string) => void;
  onRenegotiateSponsor: () => void;
  /** Avança a rodada da liga direto da Central, sem passar pelo Escritório. */
  onNextRound: () => void;
  /** Abre o Escritório (tela da liga) — usado quando ainda faltam jogos da rodada. */
  onViewLeague: () => void;
  /** Motivo pra bloquear o avanço de rodada (ex: mensagem obrigatória não lida). */
  blockAdvanceReason?: string;
}

type NextMatch =
  | { type: 'league'; fixture: LeagueFixture; homeName: string; awayName: string; round: number }
  | { type: 'cup'; homeName: string; awayName: string; stage: string; stageLabel: string }
  | null;

function determineNextMatch(state: CareerState): NextMatch {
  const { season } = state;
  const { league, cup } = season;
  const userId = league.userTeamId;

  if (cup.stage !== 'champion') {
    const stageMatches = getStageMatches(cup);
    const userMatch = stageMatches.find(m =>
      !m.played &&
      (m.homeTeamId === userId || m.awayTeamId === userId)
    );
    if (userMatch) {
      const homeTeam = cup.teams.find(t => t.id === userMatch.homeTeamId);
      const awayTeam = cup.teams.find(t => t.id === userMatch.awayTeamId);
      return {
        type: 'cup',
        homeName: homeTeam?.name ?? '???',
        awayName: awayTeam?.name ?? '???',
        stage: cup.stage,
        stageLabel: CUP_STAGE_LABELS[cup.stage] ?? cup.stage,
      };
    }
  }

  if (league.phase !== 'done') {
    const round = league.fixtures[league.currentRound];
    const fixture = round.find(f =>
      (f.homeTeamId === userId || f.awayTeamId === userId) && !f.played
    );
    if (fixture) {
      const home = league.teams.find(t => t.id === fixture.homeTeamId);
      const away = league.teams.find(t => t.id === fixture.awayTeamId);
      return {
        type: 'league',
        fixture,
        homeName: home?.name ?? '???',
        awayName: away?.name ?? '???',
        round: league.currentRound,
      };
    }
  }

  return null;
}

export default function CareerHubScreen({ state, league, onViewCup, onPlayNext, onPlayNextCup, onAdvanceSeason, onNewCareer, onBack, onMarkInboxRead, onAcceptTransferOffer, onRejectTransferOffer, onRenegotiateSponsor, onNextRound, onViewLeague, blockAdvanceReason }: Props) {
  void onViewCup;
  const inbox = getInbox(state);
  const finances = getFinances(state);
  const standings = computeStandings(state.season.league.teams, state.season.league.fixtures);
  const userPosition = standings.findIndex(s => s.teamId === state.season.league.userTeamId) + 1;
  const cupStageLabel = CUP_STAGE_LABELS[state.season.cup.stage] ?? state.season.cup.stage;
  const seasonReady = state.season.league.phase === 'done' && state.season.cup.stage === 'champion';
  const nextMatch = determineNextMatch(state);

  // Sem próxima partida e sem temporada encerrada, a Central ficava sem nenhuma
  // ação: o "Avançar Rodada" só existia no Escritório. Acontece toda rodada, assim
  // que o usuário joga o jogo dele.
  const currentRoundFixtures = state.season.league.fixtures[state.season.league.currentRound];
  const roundComplete = currentRoundFixtures?.every(f => f.played) ?? false;
  const awaitingRound = !nextMatch && !seasonReady && state.season.league.phase !== 'done';
  const isWindowOpen = isTransferWindowOpen(state.season.league.currentRound);
  const sponsorTier = getSponsorTier(state) as SponsorTier;
  const sponsorName = getSponsorName(state);
  const nextTier = getNextTierUp(sponsorTier);
  const boardObj = getObjectives(state);
  const cupProgress = deriveCupProgress(state.season.cup, state.season.league.userTeamId);

  const userTeam = useMemo(() =>
    state.rosters[state.leagueId]?.find(t => t.id === state.season.league.userTeamId),
    [state.rosters, state.leagueId, state.season.league.userTeamId]);

  const record = useMemo(() =>
    computeUserSeasonRecord(state.season.league),
    [state.season.league]);

  const avgOvr = useMemo(() => {
    if (!userTeam) return 0;
    const starters = userTeam.squad.slice(0, getStarterCount(userTeam.strategy.formation));
    return Math.round(starters.reduce((s, p) => s + playerOvr(p), 0) / starters.length);
  }, [userTeam]);

  const totalRounds = state.season.league.fixtures.length;
  const currentRound = state.season.league.currentRound;
  const progressPct = totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;
  const gamesPlayed = record.wins + record.draws + record.losses;

  const topScorer = useMemo(() => {
    const tally = state.season.userGoalScorers ?? {};
    const entries = Object.entries(tally);
    if (entries.length === 0) return null;
    return entries.reduce((best, cur) => cur[1] > best[1] ? cur : best);
  }, [state.season.userGoalScorers]);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
      </div>

      {/* Club Identity Hero */}
      {userTeam && (
        <div className={styles.clubHero}>
          <div className={styles.clubCrest}>
            <img src={userTeam.logoUrl} alt={userTeam.name} className={styles.crestImg} />
          </div>
          <div className={styles.clubInfo}>
            <h1 className={styles.clubName}>{userTeam.name}</h1>
            <div className={styles.clubMeta}>
              <span>{league.flag} {league.name}</span>
              <span>·</span>
              <span>Temporada {state.currentSeasonYear}</span>
              {userTeam.stadium && <><span>·</span><span>🏟️ {userTeam.stadium}</span></>}
            </div>
            <div className={styles.managerRow}>
              <span className={styles.managerName}>👔 {state.manager.name}</span>
              <span className={styles.managerRep}>
                ⭐ {state.manager.reputation} rep
              </span>
              <span className={styles.sponsorBadge}>
                👕 {sponsorName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className={styles.quickStats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{gamesPlayed}</span>
          <span className={styles.statLabel}>Jogos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#34d399' }}>{record.wins}</span>
          <span className={styles.statLabel}>Vitórias</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#9ca3af' }}>{record.draws}</span>
          <span className={styles.statLabel}>Empates</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#f87171' }}>{record.losses}</span>
          <span className={styles.statLabel}>Derrotas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{record.goalsFor}</span>
          <span className={styles.statLabel}>Gols</span>
        </div>
      </div>

      {/* Season Progress + Position */}
      {!seasonReady && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span>Progresso da Temporada</span>
            <span>{currentRound}/{totalRounds} rodadas ({progressPct}%)</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressFooter}>
            <span>{userPosition}º lugar · {userTeam ? `OVR titular médio: ${avgOvr}` : ''}</span>
            {topScorer && <span>⚽ Artilheiro: {topScorer[0]} ({topScorer[1]} gols)</span>}
          </div>
        </div>
      )}

      {/* Finances Mini */}
      <div className={styles.financeStrip}>
        <div className={styles.financeItem}>
          <span className={styles.financeLabel}>Orçamento</span>
          <span className={styles.financeValue}>€{(finances.budget / 1_000_000).toFixed(1)}M</span>
        </div>
        <div className={styles.financeItem}>
          <span className={styles.financeLabel}>Folha</span>
          <span className={styles.financeValue}>€{(finances.wageBill / 1_000_000).toFixed(1)}M</span>
        </div>
        <div className={styles.financeItem}>
          <span className={styles.financeLabel}>Renda sem.</span>
          <span className={styles.financeValue}>€{(finances.weeklyIncome / 1_000_000).toFixed(1)}M</span>
        </div>
        <div className={styles.financeItem}>
          <span className={styles.financeLabel}>Janela</span>
          <span className={styles.financeValue} style={{ color: isWindowOpen ? '#22c55e' : '#ef4444' }}>
            {isWindowOpen ? 'Aberta' : 'Fechada'}
          </span>
        </div>
      </div>

      {/* Competition Status */}
      <div className={styles.compRow}>
        <span>🏆 {league.cupName}: <strong>{cupStageLabel}</strong></span>
        {nextTier && (
          <button className={styles.sponsorBtn} onClick={onRenegotiateSponsor} disabled={!nextTier}>
            📋 {nextTier ? `Patrocínio → ${getSponsorLabel(nextTier)}` : 'Global'}
          </button>
        )}
      </div>

      {boardObj && boardObj.objectives.length > 0 && (
        <div className={styles.objectivesCard}>
          <div className={styles.objectivesTitle}>Objetivos da Diretoria</div>
          {boardObj.objectives.map(obj => {
            const isAchieved = obj.achieved === true;
            const isFailed = obj.achieved === false;
            const isPending = obj.achieved === undefined;
            // Enquanto a temporada corre, mostra onde o time está em relação à meta.
            // Sem isto tudo ficava "📌 pendente" até o último dia, e o usuário só
            // descobria que falhou quando já não dava pra reagir.
            const prog = isPending
              ? getObjectiveProgress(obj, userPosition, cupProgress.stage, cupProgress.eliminated, finances.budget)
              : null;
            const icon = isAchieved ? '✅'
              : isFailed ? '❌'
              : prog?.status === 'atingido' ? '✅'
              : prog?.status === 'fora' ? '⚠️'
              : '📌';
            return (
              <div key={obj.id} className={`${styles.objectiveRow} ${isAchieved ? styles.objAchieved : isFailed ? styles.objFailed : ''}`}>
                <span className={styles.objectiveIcon}>{icon}</span>
                <span className={styles.objectiveLabel}>
                  {obj.label}
                  {prog && <span className={styles.objectiveProgress}>{prog.detail}</span>}
                </span>
                <span className={styles.objectiveReward}>
                  {isPending ? `+${obj.reward} rep` : isAchieved ? `+${obj.reward}` : `-${obj.penalty}`}
                </span>
              </div>
            );
          })}
          {boardObj.objectives.some(o => o.achieved === undefined) && (
            <div className={styles.objectivesPending}>Em andamento — avaliação ao fim da temporada</div>
          )}
          {boardObj.streakBad >= 2 && (
            <div className={styles.objectivesWarning}>
              ⚠️ {boardObj.streakBad >= 3 ? 'Última chance: ' : ''}Diretoria insatisfeita ({boardObj.streakBad} temporada{boardObj.streakBad > 1 ? 's' : ''} consecutiva{boardObj.streakBad > 1 ? 's' : ''} abaixo do esperado)
            </div>
          )}
        </div>
      )}

      <InboxPanel
        messages={inbox}
        onMarkRead={onMarkInboxRead}
        onAcceptTransferOffer={onAcceptTransferOffer}
        onRejectTransferOffer={onRejectTransferOffer}
      />

      {nextMatch && !seasonReady && (
        <div className={styles.nextMatchCard}>
          <div className={styles.nextMatchLabel}>
            {nextMatch.type === 'cup' ? '🏆' : '📅'} Próxima Partida · {nextMatch.type === 'cup' ? `Copa (${nextMatch.stageLabel})` : `Liga (Rodada ${nextMatch.round + 1})`}
          </div>
          <div className={styles.nextMatchTeams}>
            <strong>{nextMatch.homeName}</strong>
            <span className={styles.nextMatchVs}>vs</span>
            <strong>{nextMatch.awayName}</strong>
          </div>
          <button className={styles.playBtn} onClick={() => {
            if (nextMatch.type === 'league') onPlayNext();
            else onPlayNextCup();
          }}>
            ⚽ Jogar
          </button>
        </div>
      )}

      {awaitingRound && (
        <div className={styles.advanceRow}>
          {roundComplete ? (
            <>
              <button
                className={styles.advanceBtn}
                onClick={onNextRound}
                disabled={!!blockAdvanceReason}
                title={blockAdvanceReason}
              >
                Avançar Rodada →
              </button>
              {blockAdvanceReason && <div className={styles.advanceStatus}>🔔 {blockAdvanceReason}</div>}
            </>
          ) : (
            <button className={styles.advanceBtn} onClick={onViewLeague}>
              Simular resto da rodada no Escritório →
            </button>
          )}
        </div>
      )}

      {seasonReady ? (
        <div className={styles.advanceRow}>
          <button className={styles.advanceBtn} onClick={onAdvanceSeason}>Avançar Temporada →</button>
        </div>
      ) : (
        <div className={styles.advanceStatus}>Termine a liga e a copa pra avançar de temporada</div>
      )}

      <div className={styles.newCareerRow}>
        <button className={styles.newCareerBtn} onClick={onNewCareer}>
          Começar nova carreira noutra liga
        </button>
      </div>
    </div>
  );
}
