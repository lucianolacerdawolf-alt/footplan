import type { CareerState } from '../engine/career';
import { getInbox, isTransferWindowOpen } from '../engine/career';
import type { LeagueDefinition } from '../data/leagues/types';
import type { LeagueFixture } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import { getStageMatches } from '../engine/bracketHelpers';
import InboxPanel from './InboxPanel';
import styles from './CareerHubScreen.module.css';

interface Props {
  state: CareerState;
  league: LeagueDefinition;
  onViewCup: () => void;
  onPlayNext: () => void;
  onAdvanceSeason: () => void;
  onNewCareer: () => void;
  onBack: () => void;
  onMarkInboxRead: (id: string) => void;
  onAcceptTransferOffer: (id: string) => void;
  onRejectTransferOffer: (id: string) => void;
}

const CUP_STAGE_LABELS: Record<string, string> = {
  roundOf16: 'Oitavas',
  quarterfinals: 'Quartas',
  semifinals: 'Semis',
  final: 'Final',
  champion: 'Campeão',
};

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

export default function CareerHubScreen({ state, league, onViewCup, onPlayNext, onAdvanceSeason, onNewCareer, onBack, onMarkInboxRead, onAcceptTransferOffer, onRejectTransferOffer }: Props) {
  const inbox = getInbox(state);
  const standings = computeStandings(state.season.league.teams, state.season.league.fixtures);
  const userPosition = standings.findIndex(s => s.teamId === state.season.league.userTeamId) + 1;
  const cupStageLabel = CUP_STAGE_LABELS[state.season.cup.stage] ?? state.season.cup.stage;
  const seasonReady = state.season.league.phase === 'done' && state.season.cup.stage === 'champion';

  const nextMatch = determineNextMatch(state);

  const isWindowOpen = isTransferWindowOpen(state.season.league.currentRound);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>{state.manager.name}</h1>
          <span className={styles.progress}>Reputação: {state.manager.reputation}</span>
        </div>
      </div>

      <InboxPanel
        messages={inbox}
        onMarkRead={onMarkInboxRead}
        onAcceptTransferOffer={onAcceptTransferOffer}
        onRejectTransferOffer={onRejectTransferOffer}
      />

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Liga</span>
          <span className={styles.summaryValue}>{league.name}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Temporada</span>
          <span className={styles.summaryValue}>{state.currentSeasonYear}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Posição na liga</span>
          <span className={styles.summaryValue}>{userPosition}º</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{league.cupName}</span>
          <span className={styles.summaryValue}>{cupStageLabel}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Janela de transferências</span>
          <span className={styles.summaryValue} style={{ color: isWindowOpen ? '#22c55e' : '#ef4444' }}>
            {isWindowOpen ? 'Aberta' : 'Fechada'}
          </span>
        </div>
      </div>

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
            else onViewCup();
          }}>
            ⚽ Jogar
          </button>
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
