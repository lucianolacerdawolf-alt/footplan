import { useMemo } from 'react';
import type { MatchResult } from '../../engine/types';
import { calculateRatings, manOfTheMatch } from '../../engine/playerRating';
import { crestSrc } from '../../utils/crest';
import { teamTextColor } from '../../utils/teamTextColor';
import styles from './FinalWhistleCard.module.css';

/** Resumo curto no apito final (antes de ir pras estatísticas): quem marcou, finalizações
 *  e o melhor em campo. A tela de estatísticas continua com o detalhe completo. */
export default function FinalWhistleCard({ result }: { result: MatchResult }) {
  const motm = useMemo(() => manOfTheMatch(calculateRatings(result)), [result]);
  const { homeTeam, awayTeam, homeScore, awayScore, homeStats, awayStats } = result;
  const goals = result.events.filter(e => e.type === 'goal');
  const side = (teamId: string | undefined) => goals.filter(g => g.teamId === teamId)
    .map(g => `${g.scorer ?? '?'} ${Math.max(1, g.minute)}'`);
  const winner = result.winner ?? (homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : null);

  return (
    <div className={styles.card} role="status">
      <div className={styles.title}>
        {winner ? <>Vitória do <span style={{ color: teamTextColor(winner) }}>{winner.name}</span></> : 'Empate'}
        {result.penaltyResult && <span className={styles.sub}> nos pênaltis ({result.penaltyResult.homeScore}–{result.penaltyResult.awayScore})</span>}
      </div>
      <div className={styles.cols}>
        {[{ t: homeTeam, g: side(homeTeam.id), s: homeStats }, { t: awayTeam, g: side(awayTeam.id), s: awayStats }].map(({ t, g, s }) => (
          <div key={t.id} className={styles.col}>
            <div className={styles.team}><img src={crestSrc(t.logoUrl)} alt="" className={styles.crest} />{t.abbreviation}</div>
            <div className={styles.goals}>{g.length > 0 ? g.join(' · ') : 'sem gols'}</div>
            <div className={styles.stat}>{s.shots} finalizações · {s.shotsOnTarget} no gol</div>
          </div>
        ))}
      </div>
      {motm && (
        <div className={styles.motm}>
          <span className={styles.star}>★</span> Melhor em campo: <b style={{ color: teamTextColor(motm.team) }}>{motm.player.name}</b>
          <span className={styles.rating}>{motm.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
