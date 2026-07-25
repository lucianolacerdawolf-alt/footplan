import { useState } from 'react';
import type { Team } from '../engine/types';
import type { BracketState, BracketMatch, PlayableStage } from '../engine/tournament';
import styles from './BracketScreen.module.css';

interface Props {
  state: BracketState;
  onPlayMatch: (match: BracketMatch, homeTeam: Team, awayTeam: Team) => void;
  onSimulateMatch: (stage: PlayableStage, matchIndex: number) => void;
  onSimulateOthers: () => void;
  onEditTactics: () => void;
  onBack: () => void;
}

function teamById(teams: Team[], id: string | null): Team | null {
  if (!id) return null;
  return teams.find(t => t.id === id) ?? null;
}

function matchResultText(m: BracketMatch): string {
  if (!m.played || m.homeScore == null || m.awayScore == null) return '';
  let text = `${m.homeScore}–${m.awayScore}`;
  if (m.wentToExtraTime) {
    if (m.penaltyHomeScore != null && m.penaltyAwayScore != null) {
      text += ` (pên. ${m.penaltyHomeScore}–${m.penaltyAwayScore})`;
    } else {
      text += ' (p.e.)';
    }
  }
  return text;
}

function MatchCard({
  match, teams, userTeamId, onPlay, onSimulate,
}: {
  match: BracketMatch;
  teams: Team[];
  userTeamId: string;
  onPlay: () => void;
  onSimulate?: () => void;
}) {
  const home = teamById(teams, match.homeTeamId);
  const away = teamById(teams, match.awayTeamId);
  const isUserMatch = match.homeTeamId === userTeamId || match.awayTeamId === userTeamId;
  const canPlay = !match.played && home != null && away != null;
  const winner = match.winnerId ? teamById(teams, match.winnerId) : null;

  return (
    <div className={`${styles.matchCard} ${isUserMatch ? styles.matchCardUser : ''} ${match.played ? styles.matchCardDone : ''}`}>
      <div className={styles.matchTeams}>
        <div className={`${styles.matchTeam} ${match.winnerId === match.homeTeamId ? styles.winner : match.played ? styles.loser : ''}`}>
          {home ? <img src={home.logoUrl} alt={home.abbreviation} className={styles.matchCrest} /> : <span className={styles.tbd}>—</span>}
          <span style={home ? { color: home.color } : undefined}>{home?.abbreviation ?? '?'}</span>
        </div>
        <div className={styles.matchMiddle}>
          {match.played
            ? <span className={styles.matchScore}>{matchResultText(match)}</span>
            : <span className={styles.matchVs}>vs</span>}
        </div>
        <div className={`${styles.matchTeam} ${styles.matchTeamAway} ${match.winnerId === match.awayTeamId ? styles.winner : match.played ? styles.loser : ''}`}>
          <span style={away ? { color: away.color } : undefined}>{away?.abbreviation ?? '?'}</span>
          {away ? <img src={away.logoUrl} alt={away.abbreviation} className={styles.matchCrest} /> : <span className={styles.tbd}>—</span>}
        </div>
      </div>
      {canPlay && isUserMatch && (
        <div className={styles.matchActions}>
          <button className={styles.playBtn} onClick={onPlay}>Jogar</button>
          {onSimulate && (
            <button className={styles.simBtn} onClick={onSimulate}>Simular</button>
          )}
        </div>
      )}
      {match.played && winner && (
        <div className={styles.winnerTag} style={{ color: winner.color }}>
          ✓ {winner.abbreviation}
        </div>
      )}
    </div>
  );
}

export default function BracketScreen({ state, onPlayMatch, onSimulateMatch, onSimulateOthers, onEditTactics, onBack }: Props) {
  const { teams, userTeamId, roundOf16, quarterFinals, semiFinals, final, stage, championId } = state;
  const [simulating, setSimulating] = useState(false);
  const runSimOthers = () => {
    setSimulating(true);
    setTimeout(() => { onSimulateOthers(); setSimulating(false); }, 250);
  };

  if (stage === 'champion' && championId) {
    const champion = teamById(teams, championId)!;
    const userTeam = teamById(teams, userTeamId)!;
    const userWon = championId === userTeamId;
    return (
      <div className={`${styles.screen} app-screen`}>
        <header className={styles.header}>
          <button className="back-btn-secondary" onClick={onBack}>← Menu Principal</button>
        </header>
        <div className={styles.champion}>
          <div className={styles.championCrown}>🏆</div>
          <img src={champion.logoUrl} alt={champion.name} className={styles.championCrest} />
          <div className={styles.championName} style={{ color: champion.color }}>{champion.name}</div>
          <div className={styles.championSub}>Campeão da {state.cupName}</div>
          {!userWon && (
            <div className={styles.userEliminated}>
              <img src={userTeam.logoUrl} className={styles.smallCrest} alt="" />
              <span>{userTeam.name} foi eliminado</span>
            </div>
          )}
        </div>
        <button className="start-btn" onClick={onBack}>Jogar Novamente</button>
      </div>
    );
  }

  const stageLabels: Record<typeof stage, string> = {
    roundOf16: 'Oitavas de Final',
    quarterfinals: 'Quartas de Final',
    semifinals: 'Semifinais',
    final: 'Final',
    champion: 'Campeão',
  };

  const renderStage = (
    label: string,
    matches: BracketMatch[],
    isActive: boolean
  ) => {
    const othersPending = matches.some(m => !m.played && m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId);
    return (
      <div className={`${styles.stageBlock} ${isActive ? styles.stageBlockActive : ''}`}>
        <div className={styles.stageLabelRow}>
          <span className={styles.stageLabel}>{label}</span>
          {othersPending && (
            <button className={styles.simAllBtn} onClick={runSimOthers} disabled={simulating}>
              {simulating ? 'Simulando…' : 'Simular Outros'}
            </button>
          )}
        </div>
        {matches.map((m, idx) => (
          <MatchCard
            key={m.id}
            match={m}
            teams={teams}
            userTeamId={userTeamId}
            onPlay={() => {
              const home = teamById(teams, m.homeTeamId)!;
              const away = teamById(teams, m.awayTeamId)!;
              onPlayMatch(m, home, away);
            }}
            onSimulate={isActive ? () => onSimulateMatch(state.stage as PlayableStage, idx) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onEditTactics}>← Editar Táticas</button>
        <div className={styles.headerCenter}>
          <span className={styles.title}>{state.cupName} · {stageLabels[stage]}</span>
        </div>
        <button className="back-btn-secondary" onClick={onBack}>Menu Principal →</button>
      </header>

      {stage === 'roundOf16'    && renderStage('Oitavas de Final', roundOf16,     true)}
      {stage === 'quarterfinals' && renderStage('Quartas de Final', quarterFinals, true)}
      {stage === 'semifinals'    && renderStage('Semifinais',       semiFinals,    true)}
      {stage === 'final'         && renderStage('Final',            [final],       true)}
    </div>
  );
}
