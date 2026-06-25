import styles from './MatchStatsScreen.module.css';
import type { MatchResult, Strategy } from '../engine/types';
import type { MatchRecord } from '../hooks/useMatchHistory';
import { calculateRatings, manOfTheMatch, goalScorers, cardEvents } from '../engine/playerRating';
import { FORMATION_BONUS } from '../engine/matchConfig';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';

interface Props {
  result: MatchResult;
  history: MatchRecord[];
  onMenu: () => void;
  onClearHistory: () => void;
  onContinue?: () => void;
  continueLabel?: string;
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

function ResultBadge({ result }: { result: MatchResult }) {
  if (result.winner) {
    const won = result.homeScore >= result.awayScore; // home perspective after ET
    return <span className={`${styles.badge} ${won ? styles.badgeWin : styles.badgeLoss}`}>
      {result.wentToExtraTime ? (result.penaltyResult ? 'Pênaltis' : 'Prorrogação') : (won ? 'Vitória' : 'Derrota')}
    </span>;
  }
  if (result.homeScore > result.awayScore) return <span className={`${styles.badge} ${styles.badgeWin}`}>Vitória</span>;
  if (result.awayScore > result.homeScore) return <span className={`${styles.badge} ${styles.badgeLoss}`}>Derrota</span>;
  return <span className={`${styles.badge} ${styles.badgeDraw}`}>Empate</span>;
}

function renderTacticalEffect(s: Strategy): React.JSX.Element {
  const fb = FORMATION_BONUS[s.formation];
  const items: string[] = [];
  items.push(s.formation);
  if (fb.atk > 1) items.push(`Atk +${Math.round((fb.atk - 1) * 100)}%`);
  if (fb.atk < 1) items.push(`Atk ${Math.round((fb.atk - 1) * 100)}%`);
  if (fb.def > 1) items.push(`Def +${Math.round((fb.def - 1) * 100)}%`);
  if (fb.def < 1) items.push(`Def ${Math.round((fb.def - 1) * 100)}%`);
  items.push(MENTALITY_LABELS[s.mentality]);
  items.push(INTENSITY_LABELS[s.intensity]);
  items.push(DEFENSIVE_LINE_LABELS[s.defensiveLine]);
  items.push(WIDTH_LABELS[s.width]);
  return (
    <div className={styles.tacticalItems}>
      {items.map((item, i) => (
        <span key={i} className={styles.tacticalItem}>{item}</span>
      ))}
    </div>
  );
}

function ratingColor(r: number): string {
  if (r >= 8.5) return '#7c3aed';
  if (r >= 7.5) return '#22c55e';
  if (r >= 6.5) return '#0ea5e9';
  if (r >= 5.5) return '#94a3b8';
  return '#ef4444';
}

export default function MatchStatsScreen({ result, history, onMenu, onClearHistory, onContinue, continueLabel }: Props) {
  const { homeTeam, awayTeam, homeScore, awayScore, homePossession, awayPossession, homeStats, awayStats } = result;
  const ratings = calculateRatings(result);
  const motm = manOfTheMatch(ratings);
  const scorers = goalScorers(result);
  const cards = cardEvents(result);
  const topPerformers = ratings.slice(0, 5);

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
          {result.wentToExtraTime && (
            <span className={styles.etLabel}>
              {result.penaltyResult
                ? `a.e.t. · Pên. ${result.penaltyResult.homeScore}–${result.penaltyResult.awayScore}`
                : 'após prorrogação'}
            </span>
          )}
          <ResultBadge result={result} />
          <span className={styles.screenLabel}>Estatísticas</span>
        </div>
        <div className={styles.team}>
          <img src={awayTeam.logoUrl} alt={awayTeam.name} className={styles.crest} />
          <span className={styles.teamName} style={{ color: awayTeam.color }}>{awayTeam.abbreviation}</span>
        </div>
      </div>

      {/* Gols */}
      {scorers.length > 0 && (
        <div className={styles.scorersBlock}>
          <div className={styles.sectionLabel}>⚽ Gols</div>
          <div className={styles.scorersList}>
            {scorers.map((g, i) => (
              <div key={`${g.team.id}-${g.minute}-${g.scorer}-${i}`} className={styles.scorerRow}>
                <span className={styles.scorerMinute}>{g.minute}&apos;</span>
                <img src={g.team.logoUrl} alt={`Escudo ${g.team.abbreviation}`} className={styles.scorerCrest} />
                <span className={styles.scorerName} style={{ color: g.team.color }}>{g.scorer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Man of the Match */}
      {motm && (
        <div className={styles.motmBlock} style={{ borderColor: motm.team.color }}>
          <div className={styles.motmHeader}>
            <span className={styles.motmCrown}>★</span>
            <span className={styles.motmLabel}>Melhor em Campo</span>
          </div>
          <div className={styles.motmBody}>
            <img src={motm.team.logoUrl} alt="" className={styles.motmCrest} />
            <div className={styles.motmInfo}>
              <span className={styles.motmName} style={{ color: motm.team.color }}>
                #{motm.player.number} {motm.player.name}
              </span>
              <span className={styles.motmStats}>
                {motm.player.position}
                {motm.goals > 0 && <> · {motm.goals} gol{motm.goals > 1 ? 's' : ''}</>}
                {motm.yellow > 0 && <> · {motm.yellow}🟨</>}
                {motm.red > 0 && <> · {motm.red}🟥</>}
              </span>
            </div>
            <span className={styles.motmRating} style={{ background: ratingColor(motm.rating) }}>
              {motm.rating.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Top 5 notas */}
      <details className={styles.ratingsBlock}>
        <summary className={styles.ratingsSummary}>📊 Notas dos jogadores</summary>
        <div className={styles.ratingsList}>
          {topPerformers.map(r => (
            <div key={r.player.id} className={styles.ratingRow}>
              <img src={r.team.logoUrl} alt="" className={styles.ratingCrest} />
              <span className={styles.ratingNum}>#{r.player.number}</span>
              <span className={styles.ratingName} style={{ color: r.team.color }}>{r.player.name}</span>
              <span className={styles.ratingPos}>{r.player.position}</span>
              <span className={styles.ratingVal} style={{ background: ratingColor(r.rating) }}>
                {r.rating.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Cartões */}
      {cards.length > 0 && (
        <div className={styles.cardsBlock}>
          <div className={styles.sectionLabel}>Cartões</div>
          <div className={styles.cardsList}>
            {cards.map((c, i) => (
              <span key={`${c.team.id}-${c.minute}-${c.type}-${i}`} className={styles.cardChip} style={{ borderColor: c.team.color }} aria-label={`${c.type === 'yellow' ? 'Cartão amarelo' : 'Cartão vermelho'} para ${c.player?.name ?? c.team.abbreviation} aos ${c.minute} minutos`}>
                <span aria-hidden="true">{c.type === 'yellow' ? '🟨' : '🟥'}</span>
                <span style={{ color: c.team.color, fontWeight: 700 }}>{c.player?.name ?? c.team.abbreviation}</span>
                <span className={styles.cardMinute}>{c.minute}&apos;</span>
              </span>
            ))}
          </div>
        </div>
      )}

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

      {/* Tactical breakdown */}
      <div className={styles.tacticalSection}>
        <div className={styles.tacticalTitle}>📋 Efeito Tático</div>
        <div className={styles.tacticalGrid}>
          <div className={styles.tacticalTeam}>
            <span style={{ color: homeTeam.color, fontWeight: 800, fontSize: 13 }}>{homeTeam.abbreviation}</span>
            {renderTacticalEffect(homeTeam.strategy)}
          </div>
          <div className={styles.tacticalTeam}>
            <span style={{ color: awayTeam.color, fontWeight: 800, fontSize: 13 }}>{awayTeam.abbreviation}</span>
            {renderTacticalEffect(awayTeam.strategy)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {onContinue
          ? <button className="start-btn" onClick={onContinue}>{continueLabel ?? 'Continuar'}</button>
          : <button className="start-btn" onClick={onMenu}>Escolher Times</button>
        }
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
