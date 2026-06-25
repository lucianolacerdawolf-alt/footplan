import styles from './MatchStatsScreen.module.css';
import type { MatchResult } from '../engine/types';
import type { MatchRecord } from '../hooks/useMatchHistory';

interface Props {
  result: MatchResult;
  history: MatchRecord[];
  onPlayAgain: () => void;
  onMenu: () => void;
  onClearHistory: () => void;
}

interface StatRowProps {
  label: string;
  home: number;
  away: number;
  homeColor: string;
  awayColor: string;
  icon?: string;
}

function StatRow({ label, home, away, homeColor, awayColor, icon }: StatRowProps) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div className={styles.row}>
      <span className={`${styles.val} ${styles.valHome}`} style={{ color: homeColor }}>{home}</span>
      <div className={styles.mid}>
        <div className={styles.barWrap}>
          <div className={styles.barHome} style={{ width: `${homePct}%`, background: homeColor }} />
          <div className={styles.barAway} style={{ width: `${100 - homePct}%`, background: awayColor }} />
        </div>
        <span className={styles.label}>{icon && <span className={styles.icon}>{icon}</span>}{label}</span>
      </div>
      <span className={`${styles.val} ${styles.valAway}`} style={{ color: awayColor }}>{away}</span>
    </div>
  );
}

function PossRow({ home, away, homeColor, awayColor }: { home: number; away: number; homeColor: string; awayColor: string }) {
  return (
    <div className={styles.row}>
      <span className={`${styles.val} ${styles.valHome}`} style={{ color: homeColor }}>{home}%</span>
      <div className={styles.mid}>
        <div className={styles.barWrap}>
          <div className={styles.barHome} style={{ width: `${home}%`, background: homeColor }} />
          <div className={styles.barAway} style={{ width: `${away}%`, background: awayColor }} />
        </div>
        <span className={styles.label}>Posse de Bola</span>
      </div>
      <span className={`${styles.val} ${styles.valAway}`} style={{ color: awayColor }}>{away}%</span>
    </div>
  );
}

function ResultBadge({ homeScore, awayScore }: { homeScore: number; awayScore: number }) {
  if (homeScore > awayScore) return <span className={`${styles.badge} ${styles.badgeWin}`}>Vitória</span>;
  if (awayScore > homeScore) return <span className={`${styles.badge} ${styles.badgeLoss}`}>Derrota</span>;
  return <span className={`${styles.badge} ${styles.badgeDraw}`}>Empate</span>;
}

export default function MatchStatsScreen({ result, history, onPlayAgain, onMenu, onClearHistory }: Props) {
  const { homeTeam, awayTeam, homeScore, awayScore, homePossession, awayPossession, homeStats, awayStats } = result;

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.team}>
          <img src={homeTeam.logoUrl} alt={homeTeam.name} className={styles.crest} />
          <span className={styles.teamName} style={{ color: homeTeam.color }}>{homeTeam.abbreviation}</span>
        </div>
        <div className={styles.scoreBlock}>
          <div className={styles.score}>
            <span style={{ color: homeTeam.color }}>{homeScore}</span>
            <span className={styles.scoreSep}>–</span>
            <span style={{ color: awayTeam.color }}>{awayScore}</span>
          </div>
          <ResultBadge homeScore={homeScore} awayScore={awayScore} />
          <span className={styles.screenLabel}>Estatísticas</span>
        </div>
        <div className={styles.team}>
          <img src={awayTeam.logoUrl} alt={awayTeam.name} className={styles.crest} />
          <span className={styles.teamName} style={{ color: awayTeam.color }}>{awayTeam.abbreviation}</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.table}>
        <PossRow home={homePossession} away={awayPossession} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="Chutes" home={homeStats.shots} away={awayStats.shots} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="No Alvo" home={homeStats.shotsOnTarget} away={awayStats.shotsOnTarget} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🎯" />
        <StatRow label="Faltas" home={homeStats.fouls} away={awayStats.fouls} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="Amarelos" home={homeStats.yellowCards} away={awayStats.yellowCards} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🟨" />
        {(homeStats.redCards > 0 || awayStats.redCards > 0) && (
          <StatRow label="Vermelhos" home={homeStats.redCards} away={awayStats.redCards} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🟥" />
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className="back-btn-secondary" onClick={onMenu}>Menu</button>
        <button className="start-btn" onClick={onPlayAgain}>Jogar Novamente</button>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <details className={styles.history}>
          <summary className={styles.historySummary}>
            Histórico <span className={styles.historyCount}>{history.length}</span>
          </summary>
          <div className={styles.historyList}>
            {history.map(r => (
              <div key={r.id} className={styles.historyRow}>
                <span className={styles.historyDate}>{r.date}</span>
                <div className={styles.historyMatch}>
                  <img src={r.homeTeam.logoUrl} alt={r.homeTeam.abbreviation} className={styles.historyCrest} />
                  <span className={styles.historyAbbr} style={{ color: r.homeTeam.color }}>{r.homeTeam.abbreviation}</span>
                  <span className={styles.historyScore}>{r.homeScore}–{r.awayScore}</span>
                  <span className={styles.historyAbbr} style={{ color: r.awayTeam.color }}>{r.awayTeam.abbreviation}</span>
                  <img src={r.awayTeam.logoUrl} alt={r.awayTeam.abbreviation} className={styles.historyCrest} />
                </div>
              </div>
            ))}
          </div>
          <button className={styles.clearBtn} onClick={onClearHistory}>Limpar histórico</button>
        </details>
      )}
    </div>
  );
}
